import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { GameRoomState } from '../../shared/game-types.js'

export interface SessionRecord {
  sessionToken: string
  playerId: string
  nickname: string
  createdAt: string
  expiresAt: string
}

export interface RoomRecord {
  roomId: string
  roomCode: string
  hostPlayerId: string
  status: GameRoomState['phase']
  version: number
  state: GameRoomState
  createdAt: string
  updatedAt: string
}

interface PersistedData {
  sessions: SessionRecord[]
  rooms: RoomRecord[]
}

const EMPTY_STORE: PersistedData = {
  sessions: [],
  rooms: [],
}

export class SqliteStore {
  private cache: PersistedData = EMPTY_STORE

  constructor(private readonly dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true })
    this.cache = this.readStore()
  }

  saveSession(session: SessionRecord) {
    const index = this.cache.sessions.findIndex(item => item.sessionToken === session.sessionToken)
    if (index >= 0) {
      this.cache.sessions[index] = session
    } else {
      this.cache.sessions.push(session)
    }
    this.flush()
  }

  getSession(sessionToken: string): SessionRecord | null {
    return this.cache.sessions.find(item => item.sessionToken === sessionToken) ?? null
  }

  saveRoom(record: RoomRecord) {
    const index = this.cache.rooms.findIndex(item => item.roomId === record.roomId)
    if (index >= 0) {
      this.cache.rooms[index] = record
    } else {
      this.cache.rooms.push(record)
    }
    this.flush()
  }

  deleteRoom(roomId: string) {
    const index = this.cache.rooms.findIndex(item => item.roomId === roomId)
    if (index < 0) {
      return
    }
    this.cache.rooms.splice(index, 1)
    this.flush()
  }

  loadActiveRooms(): RoomRecord[] {
    return this.cache.rooms.filter(room => room.status === 'waiting' || room.status === 'playing')
  }

  private readStore(): PersistedData {
    try {
      const text = readFileSync(this.dbPath, 'utf8')
      const parsed = JSON.parse(text) as PersistedData
      if (!parsed || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.rooms)) {
        return { ...EMPTY_STORE }
      }
      return parsed
    } catch {
      return { ...EMPTY_STORE }
    }
  }

  private flush() {
    const tempPath = `${this.dbPath}.tmp`
    writeFileSync(tempPath, JSON.stringify(this.cache), 'utf8')
    renameSync(tempPath, this.dbPath)
  }
}
