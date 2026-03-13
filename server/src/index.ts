import { createServer } from 'node:http'
import { resolve } from 'node:path'
import cors from 'cors'
import express from 'express'
import { WebSocketServer, type RawData, type WebSocket } from 'ws'
import type {
  ClientToServerMessage,
  ErrorMessage,
  ServerToClientMessage,
} from '../../shared/game-types.js'
import { SqliteStore } from './db.js'
import { RoomManager, type ManagedRoom } from './room-manager.js'

interface ClientConnection {
  ws: WebSocket
  roomCode: string
  playerId: string
}

const HTTP_PORT = Number(process.env.PORT ?? 3001)
const DATA_PATH = resolve(process.cwd(), process.env.DATA_DIR ?? 'server/data/game.db')

const store = new SqliteStore(DATA_PATH)
const roomManager = new RoomManager(store)
const app = express()
app.use(cors())
app.use(express.json())

const socketsByRoom = new Map<string, Set<ClientConnection>>()

app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
})

app.post('/api/session', (req, res) => {
  const nickname = sanitizeNickname(req.body?.nickname)
  const session = roomManager.createSession(nickname)
  res.status(201).json(session)
})

app.post('/api/rooms', (req, res) => {
  try {
    const session = requireSession(req.body?.sessionToken)
    const room = roomManager.createRoom(session, {
      totalRounds: numberOrUndefined(req.body?.totalRounds),
      endMode: parseEndMode(req.body?.endMode),
    })

    res.status(201).json({
      roomCode: room.roomCode,
      roomId: room.roomId,
      hostPlayerId: room.state.hostPlayerId,
      room: room.state,
      version: room.version,
    })
  } catch (error) {
    sendHttpError(res, error)
  }
})

app.post('/api/rooms/:roomCode/join', (req, res) => {
  try {
    const session = requireSession(req.body?.sessionToken)
    const roomCode = parseRoomCode(req.params.roomCode)
    const room = roomManager.joinRoom(roomCode, session)
    broadcastSnapshot(room)

    res.status(200).json({
      roomCode: room.roomCode,
      roomId: room.roomId,
      hostPlayerId: room.state.hostPlayerId,
      room: room.state,
      version: room.version,
    })
  } catch (error) {
    sendHttpError(res, error)
  }
})

app.get('/api/rooms/:roomCode/state', (req, res) => {
  try {
    const sessionToken = String(req.query.sessionToken ?? '')
    const session = requireSession(sessionToken)
    const roomCode = parseRoomCode(req.params.roomCode)
    const room = roomManager.findRoom(roomCode)
    if (!room) {
      throw new Error('Room not found')
    }
    if (!room.state.players.some(player => player.playerId === session.playerId)) {
      throw new Error('You are not in this room')
    }
    res.status(200).json({
      roomCode: room.roomCode,
      roomId: room.roomId,
      room: room.state,
      version: room.version,
    })
  } catch (error) {
    sendHttpError(res, error)
  }
})

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
  const roomCode = parseRoomCode(url.searchParams.get('roomCode') ?? '')
  const sessionToken = url.searchParams.get('sessionToken') ?? ''

  try {
    const session = requireSession(sessionToken)
    const room = roomManager.findRoom(roomCode)
    if (!room) {
      throw new Error('Room not found')
    }
    if (!room.state.players.some(player => player.playerId === session.playerId)) {
      throw new Error('You are not in this room')
    }

    const connection: ClientConnection = { ws, roomCode: room.roomCode, playerId: session.playerId }
    registerConnection(connection)

    const updatedRoom = roomManager.setConnection(roomCode, session.playerId, true)
    broadcastSnapshot(updatedRoom)

    ws.on('message', (raw: RawData) => {
      handleWsMessage(connection, raw.toString())
    })

    ws.on('close', () => {
      unregisterConnection(connection)
      try {
        const leftRoom = roomManager.setConnection(roomCode, session.playerId, false)
        broadcastSnapshot(leftRoom)
      } catch {
        // Room may already be removed or unavailable.
      }
    })
  } catch (error) {
    sendWsError(ws, error)
    ws.close()
  }
})

server.listen(HTTP_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Mooncake realtime server running on :${HTTP_PORT}`)
})

function handleWsMessage(connection: ClientConnection, payloadText: string) {
  let message: ClientToServerMessage
  try {
    message = JSON.parse(payloadText) as ClientToServerMessage
  } catch {
    sendWsError(connection.ws, 'Invalid JSON payload')
    return
  }

  try {
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
      throw new Error('Malformed message')
    }

    switch (message.type) {
      case 'room:start': {
        const room = roomManager.startRoom(connection.roomCode, connection.playerId)
        broadcastSnapshot(room)
        return
      }
      case 'turn:roll': {
        const outcome = roomManager.roll(connection.roomCode, connection.playerId)
        broadcast(connection.roomCode, {
          type: 'game:rolled',
          payload: {
            roomCode: outcome.room.roomCode,
            result: outcome.room.state.lastResult!,
            awardedPrize: outcome.awardedPrize,
            championChanged: outcome.championChanged,
          },
        })
        broadcastSnapshot(outcome.room)
        return
      }
      case 'turn:next': {
        const room = roomManager.next(connection.roomCode, connection.playerId)
        broadcast(connection.roomCode, {
          type: 'game:turn_changed',
          payload: {
            roomCode: room.roomCode,
            currentPlayerIndex: room.state.currentPlayerIndex,
            currentRound: room.state.currentRound,
          },
        })
        if (room.state.phase === 'result') {
          broadcast(connection.roomCode, {
            type: 'game:ended',
            payload: { roomCode: room.roomCode },
          })
        }
        broadcastSnapshot(room)
        return
      }
      case 'room:leave': {
        const outcome = roomManager.leaveRoom(connection.roomCode, connection.playerId)
        if (outcome.room) {
          broadcastSnapshot(outcome.room)
        }
        return
      }
      case 'game:restart': {
        const room = roomManager.restartGame(connection.roomCode, connection.playerId)
        broadcastSnapshot(room)
        return
      }
      default:
        throw new Error('Unsupported message type')
    }
  } catch (error) {
    sendWsError(connection.ws, error)
  }
}

function registerConnection(connection: ClientConnection) {
  const bucket = socketsByRoom.get(connection.roomCode) ?? new Set<ClientConnection>()
  bucket.add(connection)
  socketsByRoom.set(connection.roomCode, bucket)
}

function unregisterConnection(connection: ClientConnection) {
  const bucket = socketsByRoom.get(connection.roomCode)
  if (!bucket) {
    return
  }
  bucket.delete(connection)
  if (bucket.size === 0) {
    socketsByRoom.delete(connection.roomCode)
  }
}

function broadcastSnapshot(room: ManagedRoom) {
  broadcast(room.roomCode, {
    type: 'room:snapshot',
    payload: {
      room: room.state,
      version: room.version,
    },
  })
}

function broadcast(roomCode: string, message: ServerToClientMessage) {
  const bucket = socketsByRoom.get(roomCode)
  if (!bucket || bucket.size === 0) {
    return
  }
  const encoded = JSON.stringify(message)
  for (const connection of bucket) {
    if (connection.ws.readyState === connection.ws.OPEN) {
      connection.ws.send(encoded)
    }
  }
}

function sendWsError(ws: WebSocket, error: unknown) {
  const message = normalizeErrorMessage(error)
  const payload: ErrorMessage = {
    type: 'error',
    payload: {
      code: 'BAD_REQUEST',
      message,
    },
  }
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}

function sendHttpError(res: express.Response, error: unknown) {
  const message = normalizeErrorMessage(error)
  const lower = message.toLowerCase()
  if (lower.includes('not found')) {
    res.status(404).json({ message })
    return
  }
  if (lower.includes('not in this room') || lower.includes('only host') || lower.includes('not your turn')) {
    res.status(403).json({ message })
    return
  }
  res.status(400).json({ message })
}

function requireSession(sessionToken: string) {
  if (!sessionToken) {
    throw new Error('sessionToken is required')
  }
  const session = roomManager.getSession(sessionToken)
  if (!session) {
    throw new Error('Invalid or expired session')
  }
  return session
}

function parseRoomCode(raw: string): string {
  const value = raw.trim().toUpperCase()
  if (!value || value.length < 4) {
    throw new Error('Invalid room code')
  }
  return value
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unknown server error'
}

function sanitizeNickname(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }
  return input.trim().slice(0, 20)
}

function numberOrUndefined(input: unknown): number | undefined {
  if (typeof input !== 'number') {
    return undefined
  }
  if (!Number.isFinite(input)) {
    return undefined
  }
  return input
}

function parseEndMode(input: unknown) {
  if (input === 'all_rounds_completed' || input === 'all_prizes_distributed') {
    return input
  }
  return undefined
}
