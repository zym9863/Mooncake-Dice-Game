import { reactive, computed } from 'vue'
import { type DiceResult, type RankType, getRankInfo } from './useDiceRoll'

export type GamePhase = 'setup' | 'playing' | 'result'
export type GameEndMode = 'all_rounds_completed' | 'all_prizes_distributed'

export interface Prize {
  rank: RankType
  rankName: string
  rankTitle: string
  round: number
}

export interface Player {
  name: string
  prizes: Prize[]
}

export interface Champion {
  playerIndex: number
  championLevel: number
  rankName: string
  round: number
}

interface GameState {
  phase: GamePhase
  players: Player[]
  currentPlayerIndex: number
  currentRound: number
  totalRounds: number
  endMode: GameEndMode
  prizePool: Record<string, number>
  champion: Champion | null
  lastResult: DiceResult | null
  lastPrizeAwarded: string | null
  championStolen: boolean
}

const DEFAULT_PRIZE_POOL: Record<string, number> = {
  '状元': 1,
  '榜眼': 2,
  '探花': 4,
  '进士': 8,
  '举人': 16,
  '秀才': 32,
}

const PRIZE_ORDER = ['状元', '榜眼', '探花', '进士', '举人', '秀才']

export function useGameState() {
  const state = reactive<GameState>({
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    totalRounds: 10,
    endMode: 'all_rounds_completed',
    prizePool: { ...DEFAULT_PRIZE_POOL },
    champion: null,
    lastResult: null,
    lastPrizeAwarded: null,
    championStolen: false,
  })

  const currentPlayer = computed(() => state.players[state.currentPlayerIndex])

  const totalPrizesRemaining = computed(() =>
    Object.values(state.prizePool).reduce((a, b) => a + b, 0)
  )

  const isGameOver = computed(() => {
    if (state.phase !== 'playing') return false

    if (totalPrizesRemaining.value <= 0) {
      return true
    }

    if (state.endMode === 'all_prizes_distributed') {
      return false
    }

    return state.currentRound > state.totalRounds
  })

  function startGame(playerNames: string[], totalRounds: number, endMode: GameEndMode) {
    state.players = playerNames.map(name => ({ name, prizes: [] }))
    state.currentPlayerIndex = 0
    state.currentRound = 1
    state.totalRounds = totalRounds
    state.endMode = endMode
    state.prizePool = { ...DEFAULT_PRIZE_POOL }
    state.champion = null
    state.lastResult = null
    state.lastPrizeAwarded = null
    state.championStolen = false
    state.phase = 'playing'
  }

  function awardPrize(result: DiceResult): { awarded: boolean; prizeName: string; stolen: boolean } {
    state.lastResult = result
    state.championStolen = false
    state.lastPrizeAwarded = null

    if (!result.rank) {
      return { awarded: false, prizeName: '', stolen: false }
    }

    const rank = result.rank
    const info = getRankInfo(rank)
    const player = state.players[state.currentPlayerIndex]
    if (!player) return { awarded: false, prizeName: '', stolen: false }

    // 状元类
    if (result.championLevel > 0) {
      return handleChampion(result, rank, player)
    }

    // 非状元奖品
    const prizeName = info.prize
    if ((state.prizePool[prizeName] ?? 0) > 0) {
      state.prizePool[prizeName] = (state.prizePool[prizeName] ?? 0) - 1
      player.prizes.push({
        rank,
        rankName: info.name,
        rankTitle: info.title,
        round: state.currentRound,
      })
      state.lastPrizeAwarded = prizeName
      return { awarded: true, prizeName, stolen: false }
    }

    return { awarded: false, prizeName, stolen: false }
  }

  function handleChampion(
    result: DiceResult,
    rank: RankType,
    currentPlayer: Player
  ): { awarded: boolean; prizeName: string; stolen: boolean } {
    const info = getRankInfo(rank)

    if (!state.champion) {
      // 首次获得状元
      if ((state.prizePool['状元'] ?? 0) > 0) {
        state.prizePool['状元'] = (state.prizePool['状元'] ?? 0) - 1
        currentPlayer.prizes.push({
          rank,
          rankName: info.name,
          rankTitle: '状元',
          round: state.currentRound,
        })
        state.champion = {
          playerIndex: state.currentPlayerIndex,
          championLevel: result.championLevel,
          rankName: info.name,
          round: state.currentRound,
        }
        state.lastPrizeAwarded = '状元'
        return { awarded: true, prizeName: '状元', stolen: false }
      }
      return { awarded: false, prizeName: '状元', stolen: false }
    }

    // 抢状元：更高级别才能抢
    if (result.championLevel > state.champion.championLevel) {
      // 从前任状元手中移除
      const prevPlayer = state.players[state.champion.playerIndex]
      if (prevPlayer) {
        const champIdx = prevPlayer.prizes.findIndex(p => p.rankTitle === '状元')
        if (champIdx !== -1) {
          prevPlayer.prizes.splice(champIdx, 1)
        }
      }

      // 给新状元
      currentPlayer.prizes.push({
        rank,
        rankName: info.name,
        rankTitle: '状元',
        round: state.currentRound,
      })
      state.champion = {
        playerIndex: state.currentPlayerIndex,
        championLevel: result.championLevel,
        rankName: info.name,
        round: state.currentRound,
      }
      state.championStolen = true
      state.lastPrizeAwarded = '状元'
      return { awarded: true, prizeName: '状元', stolen: true }
    }

    // 级别不够高，抢不了
    return { awarded: false, prizeName: '状元（级别不够）', stolen: false }
  }

  function nextTurn() {
    if (isGameOver.value) {
      state.phase = 'result'
      return
    }

    state.currentPlayerIndex++
    if (state.currentPlayerIndex >= state.players.length) {
      state.currentPlayerIndex = 0
      state.currentRound++
    }

    if (isGameOver.value) {
      state.phase = 'result'
    }
  }

  function resetGame() {
    state.phase = 'setup'
    state.players = []
    state.currentPlayerIndex = 0
    state.currentRound = 1
    state.endMode = 'all_rounds_completed'
    state.prizePool = { ...DEFAULT_PRIZE_POOL }
    state.champion = null
    state.lastResult = null
    state.lastPrizeAwarded = null
    state.championStolen = false
  }

  function getPlayerRanking() {
    const rankValue: Record<string, number> = {
      '状元': 1000,
      '榜眼': 500,
      '探花': 200,
      '进士': 100,
      '举人': 50,
      '秀才': 10,
    }
    return [...state.players]
      .map((p, i) => ({
        ...p,
        index: i,
        score: p.prizes.reduce((sum, pr) => sum + (rankValue[pr.rankTitle] || 0), 0),
      }))
      .sort((a, b) => b.score - a.score)
  }

  return {
    state,
    currentPlayer,
    totalPrizesRemaining,
    isGameOver,
    startGame,
    awardPrize,
    nextTurn,
    resetGame,
    getPlayerRanking,
    PRIZE_ORDER,
  }
}
