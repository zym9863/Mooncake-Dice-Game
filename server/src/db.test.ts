import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import type { GameRoomState } from '../../shared/game-types.js'
import { SqliteStore } from './db.js'

const tempDirs: string[] = []

function createDbPath() {
  const dir = mkdtempSync(join(tmpdir(), 'mooncake-db-'))
  tempDirs.push(dir)
  return join(dir, 'game.db')
}

function makeState(phase: GameRoomState['phase']): GameRoomState {
  return {
    roomCode: 'ROOM01',
    hostPlayerId: 'p1',
    phase,
    players: [{ playerId: 'p1', name: 'Alice', prizes: [], connected: true, returnedToWaiting: false }],
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
  }
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

describe('SqliteStore', () => {
  it('starts with empty data when file does not exist', () => {
    const dbPath = createDbPath()
    const store = new SqliteStore(dbPath)

    expect(store.getSession('missing')).toBeNull()
    expect(store.loadActiveRooms()).toEqual([])
  })

  it('saveSession and getSession support upsert', () => {
    const dbPath = createDbPath()
    const store = new SqliteStore(dbPath)

    store.saveSession({
      sessionToken: 's1',
      playerId: 'p1',
      nickname: 'Alice',
      createdAt: '2026-03-15T00:00:00.000Z',
      expiresAt: '2026-03-16T00:00:00.000Z',
    })

    store.saveSession({
      sessionToken: 's1',
      playerId: 'p1',
      nickname: 'Alice2',
      createdAt: '2026-03-15T00:00:00.000Z',
      expiresAt: '2026-03-17T00:00:00.000Z',
    })

    const session = store.getSession('s1')
    expect(session?.nickname).toBe('Alice2')
  })

  it('saveRoom/loadActiveRooms/deleteRoom work as expected', () => {
    const dbPath = createDbPath()
    const store = new SqliteStore(dbPath)

    store.saveRoom({
      roomId: 'r1',
      roomCode: 'A1A1A1',
      hostPlayerId: 'p1',
      status: 'waiting',
      version: 1,
      state: makeState('waiting'),
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    })
    store.saveRoom({
      roomId: 'r2',
      roomCode: 'B2B2B2',
      hostPlayerId: 'p2',
      status: 'playing',
      version: 1,
      state: makeState('playing'),
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    })
    store.saveRoom({
      roomId: 'r3',
      roomCode: 'C3C3C3',
      hostPlayerId: 'p3',
      status: 'result',
      version: 1,
      state: makeState('result'),
      createdAt: '2026-03-15T00:00:00.000Z',
      updatedAt: '2026-03-15T00:00:00.000Z',
    })

    const active = store.loadActiveRooms().map(r => r.roomId)
    expect(active).toEqual(['r1', 'r2'])

    store.deleteRoom('r2')
    store.deleteRoom('not-exist')
    const activeAfterDelete = store.loadActiveRooms().map(r => r.roomId)
    expect(activeAfterDelete).toEqual(['r1'])
  })

  it('handles invalid json file by falling back to empty store', () => {
    const dbPath = createDbPath()
    writeFileSync(dbPath, '{invalid json', 'utf8')

    const store = new SqliteStore(dbPath)

    expect(store.loadActiveRooms()).toEqual([])
    expect(store.getSession('s1')).toBeNull()
  })

  it('handles structurally invalid store payload', () => {
    const dbPath = createDbPath()
    writeFileSync(dbPath, JSON.stringify({ foo: 1 }), 'utf8')

    const store = new SqliteStore(dbPath)

    expect(store.loadActiveRooms()).toEqual([])
  })

  it('flush writes data atomically via tmp file rename', () => {
    const dbPath = createDbPath()
    const store = new SqliteStore(dbPath)

    store.saveSession({
      sessionToken: 's2',
      playerId: 'p2',
      nickname: 'Bob',
      createdAt: '2026-03-15T00:00:00.000Z',
      expiresAt: '2026-03-16T00:00:00.000Z',
    })

    const text = readFileSync(dbPath, 'utf8')
    const parsed = JSON.parse(text) as {
      sessions: Array<{ sessionToken: string }>
      rooms: unknown[]
    }

    expect(parsed.sessions).toHaveLength(1)
    expect(parsed.sessions[0].sessionToken).toBe('s2')
    expect(parsed.rooms).toEqual([])
  })
})
