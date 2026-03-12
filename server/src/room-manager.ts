import { randomBytes, randomUUID } from 'node:crypto'
import {
  type GameEndMode,
  type GameRoomState,
  type PrizeTier,
  PRIZE_POOL_DEFAULT,
} from '../../shared/game-types.js'
import { SqliteStore, type RoomRecord } from './db.js'
import { applyRollResult, judgeDice, nextTurn, rollDice } from './game-engine.js'

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ROOM_CODE_LENGTH = 6

export interface SessionContext {
  sessionToken: string
  playerId: string
  nickname: string
  expiresAt: string
}

export interface RoomActionResult {
  room: ManagedRoom
  awardedPrize: PrizeTier | null
  championChanged: boolean
}

export interface LeaveRoomResult {
  room: ManagedRoom | null
  roomRemoved: boolean
}

export interface ManagedRoom {
  roomId: string
  roomCode: string
  version: number
  createdAt: string
  updatedAt: string
  state: GameRoomState
}

export class RoomManager {
  private readonly roomsByCode = new Map<string, ManagedRoom>()
  private readonly roomCodeById = new Map<string, string>()
  private readonly sessionTtlMs = 1000 * 60 * 60 * 24 * 7

  constructor(private readonly store: SqliteStore) {
    for (const room of this.store.loadActiveRooms()) {
      const managed: ManagedRoom = {
        roomId: room.roomId,
        roomCode: room.roomCode,
        version: room.version,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        state: room.state,
      }
      this.roomsByCode.set(room.roomCode, managed)
      this.roomCodeById.set(room.roomId, room.roomCode)
    }
  }

  createSession(nickname: string): SessionContext {
    const now = new Date()
    const expiresAt = new Date(now.getTime() + this.sessionTtlMs).toISOString()
    const sanitized = nickname.trim().slice(0, 20) || `Player-${randomBytes(2).toString('hex')}`
    const session: SessionContext = {
      sessionToken: randomBytes(24).toString('hex'),
      playerId: randomUUID(),
      nickname: sanitized,
      expiresAt,
    }
    this.store.saveSession({
      sessionToken: session.sessionToken,
      playerId: session.playerId,
      nickname: session.nickname,
      createdAt: now.toISOString(),
      expiresAt,
    })
    return session
  }

  getSession(sessionToken: string): SessionContext | null {
    const record = this.store.getSession(sessionToken)
    if (!record) {
      return null
    }
    if (new Date(record.expiresAt).getTime() <= Date.now()) {
      return null
    }

    const refreshedExpiresAt = new Date(Date.now() + this.sessionTtlMs).toISOString()
    this.store.saveSession({
      sessionToken: record.sessionToken,
      playerId: record.playerId,
      nickname: record.nickname,
      createdAt: record.createdAt,
      expiresAt: refreshedExpiresAt,
    })

    return {
      sessionToken: record.sessionToken,
      playerId: record.playerId,
      nickname: record.nickname,
      expiresAt: refreshedExpiresAt,
    }
  }

  createRoom(owner: SessionContext, options?: { totalRounds?: number; endMode?: GameEndMode }): ManagedRoom {
    const roomId = randomUUID()
    const roomCode = this.generateRoomCode()
    const now = new Date().toISOString()
    const totalRounds = normalizeRounds(options?.totalRounds)
    const endMode = options?.endMode ?? 'all_rounds_completed'

    const room: ManagedRoom = {
      roomId,
      roomCode,
      version: 1,
      createdAt: now,
      updatedAt: now,
      state: {
        roomCode,
        hostPlayerId: owner.playerId,
        phase: 'waiting',
        players: [
          {
            playerId: owner.playerId,
            name: owner.nickname,
            prizes: [],
            connected: false,
          },
        ],
        currentPlayerIndex: 0,
        currentRound: 1,
        totalRounds,
        endMode,
        prizePool: { ...PRIZE_POOL_DEFAULT },
        champion: null,
        lastResult: null,
        lastPrizeAwarded: null,
        championStolen: false,
        hasRolledThisTurn: false,
        updatedAt: now,
      },
    }

    this.roomsByCode.set(roomCode, room)
    this.roomCodeById.set(roomId, roomCode)
    this.persistRoom(room)
    return room
  }

  findRoom(roomCode: string): ManagedRoom | null {
    return this.roomsByCode.get(roomCode.toUpperCase()) ?? null
  }

  joinRoom(roomCode: string, session: SessionContext): ManagedRoom {
    const room = this.assertRoom(roomCode)
    const existing = room.state.players.find(player => player.playerId === session.playerId)

    if (!existing && room.state.phase !== 'waiting') {
      throw new Error('Game already started. New players cannot join.')
    }

    if (existing) {
      const nicknameExists = room.state.players.some(
        player => player.name === session.nickname && player.playerId !== session.playerId,
      )
      if (nicknameExists) {
        throw new Error('Nickname already taken in this room.')
      }
      existing.name = session.nickname
    } else {
      const nicknameExists = room.state.players.some(player => player.name === session.nickname)
      if (nicknameExists) {
        throw new Error('Nickname already taken in this room.')
      }
      room.state.players.push({
        playerId: session.playerId,
        name: session.nickname,
        prizes: [],
        connected: false,
      })
    }

    this.touchRoom(room)
    this.persistRoom(room)
    return room
  }

  leaveRoom(roomCode: string, playerId: string): LeaveRoomResult {
    const room = this.assertRoom(roomCode)
    const playerIndex = room.state.players.findIndex(item => item.playerId === playerId)
    if (playerIndex < 0) {
      throw new Error('Player not in room')
    }

    if (room.state.phase !== 'waiting') {
      room.state.players[playerIndex].connected = false
      if (room.state.phase === 'result' && room.state.players.every(player => !player.connected)) {
        this.removeRoom(room)
        return {
          room: null,
          roomRemoved: true,
        }
      }
      this.touchRoom(room)
      this.persistRoom(room)
      return {
        room,
        roomRemoved: false,
      }
    }

    room.state.players.splice(playerIndex, 1)
    if (room.state.players.length === 0) {
      this.removeRoom(room)
      return {
        room: null,
        roomRemoved: true,
      }
    }
    if (room.state.hostPlayerId === playerId) {
      room.state.hostPlayerId = room.state.players[0].playerId
    }
    this.touchRoom(room)
    this.persistRoom(room)
    return {
      room,
      roomRemoved: false,
    }
  }

  setConnection(roomCode: string, playerId: string, connected: boolean): ManagedRoom {
    const room = this.assertRoom(roomCode)
    const player = room.state.players.find(item => item.playerId === playerId)
    if (!player) {
      throw new Error('Player not in room')
    }
    player.connected = connected
    this.touchRoom(room)
    this.persistRoom(room)
    return room
  }

  startRoom(roomCode: string, playerId: string): ManagedRoom {
    const room = this.assertRoom(roomCode)

    if (room.state.hostPlayerId !== playerId) {
      throw new Error('Only host can start the room')
    }
    if (room.state.phase !== 'waiting') {
      throw new Error('Room is already started')
    }
    if (room.state.players.length < 2) {
      throw new Error('At least 2 players are required')
    }

    const now = new Date().toISOString()
    room.state.phase = 'playing'
    room.state.currentPlayerIndex = 0
    room.state.currentRound = 1
    room.state.prizePool = { ...PRIZE_POOL_DEFAULT }
    room.state.champion = null
    room.state.lastResult = null
    room.state.lastPrizeAwarded = null
    room.state.championStolen = false
    room.state.hasRolledThisTurn = false
    room.state.updatedAt = now
    for (const player of room.state.players) {
      player.prizes = []
    }
    this.touchRoom(room)
    this.persistRoom(room)
    return room
  }

  roll(roomCode: string, playerId: string): RoomActionResult {
    const room = this.assertRoom(roomCode)
    assertPlayerTurn(room.state, playerId)

    if (room.state.hasRolledThisTurn) {
      throw new Error('Current turn already rolled')
    }

    const result = judgeDice(rollDice())
    const rollOutcome = applyRollResult(room.state, result)
    this.touchRoom(room)
    this.persistRoom(room)
    return {
      room,
      awardedPrize: rollOutcome.awardedPrize,
      championChanged: rollOutcome.championChanged,
    }
  }

  next(roomCode: string, playerId: string): ManagedRoom {
    const room = this.assertRoom(roomCode)
    assertPlayerTurn(room.state, playerId)

    if (!room.state.hasRolledThisTurn) {
      throw new Error('You must roll before moving to the next turn')
    }

    nextTurn(room.state)
    this.touchRoom(room)
    this.persistRoom(room)
    return room
  }

  private assertRoom(roomCode: string): ManagedRoom {
    const room = this.roomsByCode.get(roomCode.toUpperCase())
    if (!room) {
      throw new Error('Room not found')
    }
    return room
  }

  private touchRoom(room: ManagedRoom) {
    room.version += 1
    room.updatedAt = new Date().toISOString()
    room.state.updatedAt = room.updatedAt
  }

  private persistRoom(room: ManagedRoom) {
    const status = room.state.phase
    const record: RoomRecord = {
      roomId: room.roomId,
      roomCode: room.roomCode,
      hostPlayerId: room.state.hostPlayerId,
      status,
      version: room.version,
      state: room.state,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    }
    this.store.saveRoom(record)
  }

  private removeRoom(room: ManagedRoom) {
    this.roomsByCode.delete(room.roomCode)
    this.roomCodeById.delete(room.roomId)
    this.store.deleteRoom(room.roomId)
  }

  private generateRoomCode(): string {
    for (let tries = 0; tries < 20; tries++) {
      let value = ''
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
        const idx = randomBytes(1)[0] % ROOM_CODE_CHARS.length
        value += ROOM_CODE_CHARS[idx]
      }
      if (!this.roomsByCode.has(value)) {
        return value
      }
    }
    throw new Error('Unable to allocate room code')
  }
}

function normalizeRounds(rounds: number | undefined): number {
  if (!rounds || Number.isNaN(rounds)) {
    return 10
  }
  return Math.max(1, Math.min(30, Math.floor(rounds)))
}

function assertPlayerTurn(state: GameRoomState, playerId: string) {
  if (state.phase !== 'playing') {
    throw new Error('Game is not in playing phase')
  }
  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer) {
    throw new Error('Current player is not available')
  }
  if (currentPlayer.playerId !== playerId) {
    throw new Error('It is not your turn')
  }
}
