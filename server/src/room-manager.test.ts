import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameRoomState } from '../../shared/game-types.js'
import { RoomManager, type SessionContext } from './room-manager.js'
import * as gameEngine from './game-engine.js'

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(() => 'uuid-fixed'),
  randomBytes: vi.fn((size: number) => Buffer.alloc(size, 1)),
}))

interface MockStore {
  loadActiveRooms: ReturnType<typeof vi.fn>
  saveSession: ReturnType<typeof vi.fn>
  getSession: ReturnType<typeof vi.fn>
  saveRoom: ReturnType<typeof vi.fn>
  deleteRoom: ReturnType<typeof vi.fn>
}

function createStoreMock(initialRooms: Array<{
  roomId: string
  roomCode: string
  hostPlayerId: string
  status: GameRoomState['phase']
  version: number
  state: GameRoomState
  createdAt: string
  updatedAt: string
}> = []): MockStore {
  return {
    loadActiveRooms: vi.fn(() => initialRooms),
    saveSession: vi.fn(),
    getSession: vi.fn(),
    saveRoom: vi.fn(),
    deleteRoom: vi.fn(),
  }
}

function makeSession(playerId: string, nickname: string): SessionContext {
  return {
    sessionToken: `token-${playerId}`,
    playerId,
    nickname,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }
}

function createReadyRoom(manager: RoomManager) {
  const owner = makeSession('p1', 'Alice')
  const room = manager.createRoom(owner, { totalRounds: 3, endMode: 'all_rounds_completed' })
  manager.joinRoom(room.roomCode, makeSession('p2', 'Bob'))
  return room
}

describe('RoomManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('normalizes persisted players on construction', () => {
    const state = {
      roomCode: 'AAAAAA',
      hostPlayerId: 'p1',
      phase: 'waiting',
      players: [
        { playerId: 'p1', name: 'Alice', prizes: [], connected: false },
      ],
      currentPlayerIndex: 0,
      currentRound: 1,
      totalRounds: 10,
      endMode: 'all_rounds_completed',
      prizePool: {
        zhuangyuan: 1,
        bangyan: 2,
        tanhua: 4,
        jinshi: 8,
        juren: 16,
        xiucai: 32,
      },
      champion: null,
      lastResult: null,
      lastPrizeAwarded: null,
      championStolen: false,
      hasRolledThisTurn: false,
      updatedAt: new Date().toISOString(),
    } as unknown as GameRoomState

    const store = createStoreMock([
      {
        roomId: 'r1',
        roomCode: 'AAAAAA',
        hostPlayerId: 'p1',
        status: 'waiting',
        version: 1,
        state,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ])

    const manager = new RoomManager(store as never)
    const room = manager.findRoom('AAAAAA')

    expect(room).not.toBeNull()
    expect(room?.state.players[0].returnedToWaiting).toBe(false)
  })

  it('createSession sanitizes and persists session', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)

    const session = manager.createSession('   VeryLongNicknameBeyond20Chars   ')

    expect(session.nickname).toBe('VeryLongNicknameBeyo')
    expect(session.playerId).toBe('uuid-fixed')
    expect(store.saveSession).toHaveBeenCalledTimes(1)
  })

  it('createSession falls back to generated nickname', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)

    const session = manager.createSession('   ')

    expect(session.nickname.startsWith('Player-')).toBe(true)
  })

  it('getSession returns null for missing or expired session', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)

    store.getSession.mockReturnValueOnce(null)
    expect(manager.getSession('missing')).toBeNull()

    store.getSession.mockReturnValueOnce({
      sessionToken: 's1',
      playerId: 'p1',
      nickname: 'Alice',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    })
    expect(manager.getSession('expired')).toBeNull()
  })

  it('getSession refreshes ttl for valid session', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T00:00:00.000Z'))

    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    store.getSession.mockReturnValue({
      sessionToken: 's1',
      playerId: 'p1',
      nickname: 'Alice',
      createdAt: '2026-03-14T00:00:00.000Z',
      expiresAt: '2026-03-16T00:00:00.000Z',
    })

    const session = manager.getSession('s1')

    expect(session).not.toBeNull()
    expect(store.saveSession).toHaveBeenCalledTimes(1)
    expect(new Date(session!.expiresAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('createRoom initializes waiting room and persists', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const owner = makeSession('p1', 'Alice')

    const room = manager.createRoom(owner, { totalRounds: 100, endMode: 'all_prizes_distributed' })

    expect(room.roomCode).toBe('BBBBBB')
    expect(room.state.totalRounds).toBe(30)
    expect(room.state.endMode).toBe('all_prizes_distributed')
    expect(room.state.players).toHaveLength(1)
    expect(store.saveRoom).toHaveBeenCalledTimes(1)
  })

  it('joinRoom enforces waiting phase and nickname uniqueness', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)

    expect(manager.joinRoom(room.roomCode, makeSession('p3', 'Carol')).state.players).toHaveLength(3)

    expect(() => manager.joinRoom(room.roomCode, makeSession('p4', 'Carol'))).toThrow(
      'Nickname already taken in this room.',
    )

    manager.startRoom(room.roomCode, 'p1')
    expect(() => manager.joinRoom(room.roomCode, makeSession('p5', 'Eve'))).toThrow(
      'Game already started. New players cannot join.',
    )
  })

  it('joinRoom updates existing player name', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = manager.createRoom(makeSession('p1', 'Alice'))

    manager.joinRoom(room.roomCode, makeSession('p1', 'Alice-New'))

    expect(manager.findRoom(room.roomCode)?.state.players[0].name).toBe('Alice-New')
  })

  it('leaveRoom removes waiting players and transfers host', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)

    const leave = manager.leaveRoom(room.roomCode, 'p1')

    expect(leave.roomRemoved).toBe(false)
    expect(leave.room?.state.hostPlayerId).toBe('p2')
    expect(leave.room?.state.players).toHaveLength(1)
  })

  it('leaveRoom removes empty waiting room', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = manager.createRoom(makeSession('p1', 'Alice'))

    const leave = manager.leaveRoom(room.roomCode, 'p1')

    expect(leave.roomRemoved).toBe(true)
    expect(leave.room).toBeNull()
    expect(store.deleteRoom).toHaveBeenCalledTimes(1)
  })

  it('leaveRoom handles playing and result phase behavior', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)

    manager.startRoom(room.roomCode, 'p1')
    const playingLeave = manager.leaveRoom(room.roomCode, 'p2')
    expect(playingLeave.roomRemoved).toBe(false)
    expect(playingLeave.room?.state.players.find(p => p.playerId === 'p2')?.connected).toBe(false)

    const sameRoom = manager.findRoom(room.roomCode)!
    sameRoom.state.phase = 'result'
    sameRoom.state.players.forEach(p => {
      p.connected = p.playerId === 'p1'
      p.returnedToWaiting = false
    })

    const resultLeave1 = manager.leaveRoom(room.roomCode, 'p1')
    expect(resultLeave1.roomRemoved).toBe(true)
    expect(resultLeave1.room).toBeNull()
  })

  it('startRoom validates host and player count', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = manager.createRoom(makeSession('p1', 'Alice'))

    expect(() => manager.startRoom(room.roomCode, 'p2')).toThrow('Only host can start the room')
    expect(() => manager.startRoom(room.roomCode, 'p1')).toThrow('At least 2 players are required')

    manager.joinRoom(room.roomCode, makeSession('p2', 'Bob'))
    const started = manager.startRoom(room.roomCode, 'p1')
    expect(started.state.phase).toBe('playing')
    expect(started.state.players.every(p => p.prizes.length === 0)).toBe(true)
  })

  it('roll validates turn and delegates to game-engine', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)
    manager.startRoom(room.roomCode, 'p1')

    expect(() => manager.roll(room.roomCode, 'p2')).toThrow('It is not your turn')

    vi.spyOn(gameEngine, 'rollDice').mockReturnValue([4, 4, 1, 2, 3, 5])
    vi.spyOn(gameEngine, 'judgeDice').mockReturnValue({
      dice: [4, 4, 1, 2, 3, 5],
      rank: 'er_ju',
      rankName: 'Two Fours',
      rankTitle: 'juren',
      championLevel: 0,
    })
    vi.spyOn(gameEngine, 'applyRollResult').mockReturnValue({
      awardedPrize: 'juren',
      championChanged: false,
    })

    const rolled = manager.roll(room.roomCode, 'p1')

    expect(rolled.awardedPrize).toBe('juren')
    expect(rolled.championChanged).toBe(false)

    const snapshot = manager.findRoom(room.roomCode)!
    snapshot.state.hasRolledThisTurn = true
    expect(() => manager.roll(room.roomCode, 'p1')).toThrow('Current turn already rolled')
  })

  it('next validates roll-before-next rule', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)
    manager.startRoom(room.roomCode, 'p1')

    expect(() => manager.next(room.roomCode, 'p1')).toThrow(
      'You must roll before moving to the next turn',
    )

    const snapshot = manager.findRoom(room.roomCode)!
    snapshot.state.hasRolledThisTurn = true
    const nextSpy = vi.spyOn(gameEngine, 'nextTurn').mockImplementation(() => undefined)

    manager.next(room.roomCode, 'p1')

    expect(nextSpy).toHaveBeenCalledTimes(1)
  })

  it('restartGame waits until all players return from result phase', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)

    const snapshot = manager.findRoom(room.roomCode)!
    snapshot.state.phase = 'result'
    snapshot.state.players.forEach(p => {
      p.prizes = [
        { rank: 'yi_xiu', rankName: 'One Four', rankTitle: 'xiucai', round: 1 },
      ]
      p.returnedToWaiting = false
    })

    const first = manager.restartGame(room.roomCode, 'p1')
    expect(first.state.phase).toBe('result')
    expect(first.state.players.find(p => p.playerId === 'p1')?.returnedToWaiting).toBe(true)

    const second = manager.restartGame(room.roomCode, 'p2')
    expect(second.state.phase).toBe('waiting')
    expect(second.state.players.every(p => p.prizes.length === 0)).toBe(true)
    expect(second.state.players.every(p => p.returnedToWaiting === false)).toBe(true)
  })

  it('restartGame validates player and phase', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)
    const room = createReadyRoom(manager)

    expect(() => manager.restartGame(room.roomCode, 'p3')).toThrow('Player not in room')
    expect(() => manager.restartGame(room.roomCode, 'p1')).toThrow(
      'Can only restart game from result phase',
    )
  })

  it('throws when room is not found', () => {
    const store = createStoreMock()
    const manager = new RoomManager(store as never)

    expect(() => manager.joinRoom('missing', makeSession('p1', 'Alice'))).toThrow('Room not found')
  })
})
