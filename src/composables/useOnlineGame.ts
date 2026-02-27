import { computed, onBeforeUnmount, ref } from 'vue'
import type {
  ClientToServerMessage,
  GameEndMode,
  GameRoomState,
  ServerToClientMessage,
} from '../../shared/game-types'

interface SessionPayload {
  sessionToken: string
  playerId: string
  nickname: string
  expiresAt: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

const SESSION_STORAGE_KEY = 'mooncake-online-session'
const ROOM_STORAGE_KEY = 'mooncake-online-room-code'
const I18N_ERROR_PREFIX = 'i18n:'

export function i18nError(key: string) {
  return `${I18N_ERROR_PREFIX}${key}`
}

export function unwrapI18nErrorKey(message: string): string | null {
  if (!message.startsWith(I18N_ERROR_PREFIX)) {
    return null
  }
  return message.slice(I18N_ERROR_PREFIX.length)
}

export function normalizeUnknownError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return i18nError('error.unknown')
}

export function useOnlineGame() {
  const session = ref<SessionPayload | null>(loadSession())
  const roomState = ref<GameRoomState | null>(null)
  const roomVersion = ref(0)
  const errorMessage = ref('')
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const joiningRoomCode = ref(localStorage.getItem(ROOM_STORAGE_KEY) ?? '')

  const apiBase = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')
  const wsBase = import.meta.env.VITE_WS_URL ?? defaultWsUrl()

  let socket: WebSocket | null = null
  let reconnectTimer: number | null = null
  let closeExpected = false

  const myPlayerId = computed(() => session.value?.playerId ?? '')
  const isHost = computed(
    () => Boolean(roomState.value && roomState.value.hostPlayerId === myPlayerId.value),
  )
  const me = computed(() =>
    roomState.value?.players.find(player => player.playerId === myPlayerId.value) ?? null,
  )
  const currentPlayer = computed(() => {
    const state = roomState.value
    if (!state) return null
    return state.players[state.currentPlayerIndex] ?? null
  })
  const isCurrentTurn = computed(
    () => Boolean(currentPlayer.value && currentPlayer.value.playerId === myPlayerId.value),
  )
  const canRoll = computed(() => {
    const state = roomState.value
    if (!state || state.phase !== 'playing') return false
    return isCurrentTurn.value && !state.hasRolledThisTurn
  })
  const canNext = computed(() => {
    const state = roomState.value
    if (!state || state.phase !== 'playing') return false
    return isCurrentTurn.value && state.hasRolledThisTurn
  })

  async function createSession(nickname: string) {
    errorMessage.value = ''
    const response = await fetch(`${apiBase}/api/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname }),
    })
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const payload = (await response.json()) as SessionPayload
    session.value = payload
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
  }

  async function createRoom(options: { totalRounds: number; endMode: GameEndMode }) {
    const currentSession = requireSession()
    const response = await fetch(`${apiBase}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: currentSession.sessionToken,
        totalRounds: options.totalRounds,
        endMode: options.endMode,
      }),
    })
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const payload = (await response.json()) as { room: GameRoomState; version: number }
    setRoomSnapshot(payload.room, payload.version)
    connectWs(payload.room.roomCode)
  }

  async function joinRoom(rawRoomCode: string) {
    const currentSession = requireSession()
    const roomCode = rawRoomCode.trim().toUpperCase()
    const response = await fetch(`${apiBase}/api/rooms/${roomCode}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: currentSession.sessionToken,
      }),
    })
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const payload = (await response.json()) as { room: GameRoomState; version: number }
    setRoomSnapshot(payload.room, payload.version)
    connectWs(payload.room.roomCode)
  }

  async function refreshRoomState() {
    const currentSession = requireSession()
    const roomCode = roomState.value?.roomCode ?? joiningRoomCode.value.trim().toUpperCase()
    if (!roomCode) {
      return
    }
    const response = await fetch(
      `${apiBase}/api/rooms/${roomCode}/state?sessionToken=${currentSession.sessionToken}`,
    )
    if (!response.ok) {
      throw new Error(await readError(response))
    }
    const payload = (await response.json()) as { room: GameRoomState; version: number }
    setRoomSnapshot(payload.room, payload.version)
    connectWs(payload.room.roomCode)
  }

  function connectWs(roomCode: string) {
    const currentSession = requireSession()
    const normalizedRoomCode = roomCode.toUpperCase()
    closeSocket(true)
    clearReconnectTimer()
    closeExpected = false

    connectionStatus.value = 'connecting'
    const wsUrl = new URL(wsBase)
    wsUrl.searchParams.set('roomCode', normalizedRoomCode)
    wsUrl.searchParams.set('sessionToken', currentSession.sessionToken)

    socket = new WebSocket(wsUrl.toString())
    joiningRoomCode.value = normalizedRoomCode
    localStorage.setItem(ROOM_STORAGE_KEY, normalizedRoomCode)

    socket.onopen = () => {
      connectionStatus.value = 'connected'
      errorMessage.value = ''
    }

    socket.onclose = () => {
      connectionStatus.value = 'disconnected'
      socket = null
      if (!closeExpected && roomState.value && session.value) {
        scheduleReconnect()
      }
    }

    socket.onerror = () => {
      errorMessage.value = i18nError('error.realtimeConnection')
    }

    socket.onmessage = event => {
      try {
        const message = JSON.parse(String(event.data)) as ServerToClientMessage
        handleServerMessage(message)
      } catch {
        errorMessage.value = i18nError('error.serverUnknown')
      }
    }
  }

  function startRoom() {
    send({ type: 'room:start', payload: { roomCode: requireRoomCode() } })
  }

  function rollTurn() {
    send({ type: 'turn:roll', payload: { roomCode: requireRoomCode() } })
  }

  function nextTurn() {
    send({ type: 'turn:next', payload: { roomCode: requireRoomCode() } })
  }

  function leaveRoom() {
    if (roomState.value) {
      try {
        send({ type: 'room:leave', payload: { roomCode: roomState.value.roomCode } })
      } catch {
        // Best-effort leave notification.
      }
    }
    roomState.value = null
    roomVersion.value = 0
    joiningRoomCode.value = ''
    localStorage.removeItem(ROOM_STORAGE_KEY)
    closeSocket(true)
  }

  function resetSession() {
    leaveRoom()
    session.value = null
    localStorage.removeItem(SESSION_STORAGE_KEY)
  }

  function handleServerMessage(message: ServerToClientMessage) {
    switch (message.type) {
      case 'room:snapshot':
        setRoomSnapshot(message.payload.room, message.payload.version)
        return
      case 'error':
        errorMessage.value = mapServerError(message.payload.code, message.payload.message)
        return
      case 'game:rolled':
      case 'game:turn_changed':
      case 'game:ended':
        return
      default:
        return
    }
  }

  function send(message: ClientToServerMessage) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error(i18nError('error.realtimeNotReady'))
    }
    socket.send(JSON.stringify(message))
  }

  function scheduleReconnect() {
    clearReconnectTimer()
    reconnectTimer = window.setTimeout(() => {
      if (!roomState.value) {
        return
      }
      connectWs(roomState.value.roomCode)
    }, 1500)
  }

  function setRoomSnapshot(room: GameRoomState, version: number) {
    roomState.value = room
    roomVersion.value = version
    joiningRoomCode.value = room.roomCode
    localStorage.setItem(ROOM_STORAGE_KEY, room.roomCode)
  }

  function closeSocket(expected: boolean) {
    closeExpected = expected
    if (socket) {
      socket.close()
      socket = null
    }
    connectionStatus.value = 'disconnected'
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function requireSession() {
    if (!session.value) {
      throw new Error(i18nError('error.sessionNotReady'))
    }
    return session.value
  }

  function requireRoomCode() {
    if (!roomState.value) {
      throw new Error(i18nError('error.roomNotJoined'))
    }
    return roomState.value.roomCode
  }

  onBeforeUnmount(() => {
    clearReconnectTimer()
    closeSocket(true)
  })

  return {
    session,
    roomState,
    roomVersion,
    errorMessage,
    connectionStatus,
    joiningRoomCode,
    me,
    currentPlayer,
    isHost,
    isCurrentTurn,
    canRoll,
    canNext,
    createSession,
    createRoom,
    joinRoom,
    refreshRoomState,
    startRoom,
    rollTurn,
    nextTurn,
    leaveRoom,
    resetSession,
  }
}

function defaultWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function loadSession(): SessionPayload | null {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as SessionPayload
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
}

function mapServerError(code: string | undefined, message: string | undefined) {
  const key = mapServerMessageToErrorKey(message)
  if (key) {
    return i18nError(key)
  }
  if (code === 'BAD_REQUEST') {
    return i18nError('error.requestFailed')
  }
  if (message) {
    return message
  }
  return i18nError('error.requestFailed')
}

function mapServerMessageToErrorKey(message: string | undefined): string | null {
  if (!message) {
    return null
  }

  const normalized = message.toLowerCase()
  if (normalized.includes('room not found')) return 'error.roomNotFound'
  if (normalized.includes('invalid room code')) return 'error.invalidRoomCode'
  if (normalized.includes('invalid or expired session')) return 'error.sessionInvalid'
  if (normalized.includes('sessiontoken is required')) return 'error.sessionRequired'
  if (normalized.includes('you are not in this room')) return 'error.notInRoom'
  if (normalized.includes('player not in room')) return 'error.notInRoom'
  if (normalized.includes('only host can start the room')) return 'error.onlyHostCanStart'
  if (normalized.includes('it is not your turn')) return 'error.notYourTurn'
  if (normalized.includes('at least 2 players are required')) return 'error.minPlayersRequired'
  if (normalized.includes('nickname already taken')) return 'error.nicknameTaken'
  if (normalized.includes('game already started')) return 'error.gameAlreadyStarted'
  if (normalized.includes('room is already started')) return 'error.roomAlreadyStarted'
  if (normalized.includes('current turn already rolled')) return 'error.turnAlreadyRolled'
  if (normalized.includes('you must roll before moving to the next turn')) return 'error.rollBeforeNext'
  if (normalized.includes('unknown server error')) return 'error.serverUnknown'
  return null
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { code?: string; message?: string }
    return mapServerError(payload.code, payload.message)
  } catch {
    return i18nError('error.requestFailed')
  }
}
