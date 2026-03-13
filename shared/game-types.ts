export type GamePhase = 'waiting' | 'playing' | 'result'

export type GameEndMode = 'all_rounds_completed' | 'all_prizes_distributed'

export type PrizeTier =
  | 'zhuangyuan'
  | 'bangyan'
  | 'tanhua'
  | 'jinshi'
  | 'juren'
  | 'xiucai'

export type RankType =
  | 'liubei_hong'
  | 'liubei_hei'
  | 'wu_hong'
  | 'wu_zi'
  | 'si_hong'
  | 'duitang'
  | 'san_hong'
  | 'si_jin'
  | 'er_ju'
  | 'yi_xiu'

export interface DiceResult {
  dice: number[]
  rank: RankType | null
  rankName: string
  rankTitle: PrizeTier | ''
  championLevel: number
}

export interface PrizeRecord {
  rank: RankType
  rankName: string
  rankTitle: PrizeTier
  round: number
}

export interface PlayerState {
  playerId: string
  name: string
  prizes: PrizeRecord[]
  connected: boolean
  returnedToWaiting: boolean
}

export interface ChampionState {
  playerId: string
  championLevel: number
  rankName: string
  round: number
}

export interface GameRoomState {
  roomCode: string
  hostPlayerId: string
  phase: GamePhase
  players: PlayerState[]
  currentPlayerIndex: number
  currentRound: number
  totalRounds: number
  endMode: GameEndMode
  prizePool: Record<PrizeTier, number>
  champion: ChampionState | null
  lastResult: DiceResult | null
  lastPrizeAwarded: PrizeTier | null
  championStolen: boolean
  hasRolledThisTurn: boolean
  updatedAt: string
}

export interface RoomSnapshotMessage {
  type: 'room:snapshot'
  payload: {
    room: GameRoomState
    version: number
  }
}

export interface ErrorMessage {
  type: 'error'
  payload: {
    code: string
    message: string
  }
}

export interface GameRolledMessage {
  type: 'game:rolled'
  payload: {
    roomCode: string
    result: DiceResult
    awardedPrize: PrizeTier | null
    championChanged: boolean
  }
}

export interface GameTurnChangedMessage {
  type: 'game:turn_changed'
  payload: {
    roomCode: string
    currentPlayerIndex: number
    currentRound: number
  }
}

export interface GameEndedMessage {
  type: 'game:ended'
  payload: {
    roomCode: string
  }
}

export type ServerToClientMessage =
  | RoomSnapshotMessage
  | ErrorMessage
  | GameRolledMessage
  | GameTurnChangedMessage
  | GameEndedMessage

export interface StartRoomMessage {
  type: 'room:start'
  payload: {
    roomCode: string
  }
}

export interface RollTurnMessage {
  type: 'turn:roll'
  payload: {
    roomCode: string
  }
}

export interface NextTurnMessage {
  type: 'turn:next'
  payload: {
    roomCode: string
  }
}

export interface LeaveRoomMessage {
  type: 'room:leave'
  payload: {
    roomCode: string
  }
}

export interface RestartGameMessage {
  type: 'game:restart'
  payload: {
    roomCode: string
  }
}

export type ClientToServerMessage =
  | StartRoomMessage
  | RollTurnMessage
  | NextTurnMessage
  | LeaveRoomMessage
  | RestartGameMessage

export const PRIZE_POOL_DEFAULT: Record<PrizeTier, number> = {
  zhuangyuan: 1,
  bangyan: 2,
  tanhua: 4,
  jinshi: 8,
  juren: 16,
  xiucai: 32,
}

export const PRIZE_ORDER: PrizeTier[] = [
  'zhuangyuan',
  'bangyan',
  'tanhua',
  'jinshi',
  'juren',
  'xiucai',
]

export const PRIZE_LABELS: Record<PrizeTier, string> = {
  zhuangyuan: 'Zhuangyuan',
  bangyan: 'Bangyan',
  tanhua: 'Tanhua',
  jinshi: 'Jinshi',
  juren: 'Juren',
  xiucai: 'Xiucai',
}

export const RANK_SCORE: Record<PrizeTier, number> = {
  zhuangyuan: 100,
  bangyan: 50,
  tanhua: 20,
  jinshi: 10,
  juren: 5,
  xiucai: 2,
}
