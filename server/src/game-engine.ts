import { randomInt } from 'node:crypto'
import {
  type DiceResult,
  type GameRoomState,
  type PrizeTier,
  type RankType,
  PRIZE_POOL_DEFAULT,
  RANK_SCORE,
} from '../../shared/game-types.js'

interface RankInfo {
  name: string
  title: PrizeTier
  championLevel: number
}

const RANK_INFO: Record<RankType, RankInfo> = {
  liubei_hong: { name: 'Six Reds', title: 'zhuangyuan', championLevel: 5 },
  liubei_hei: { name: 'Six Same', title: 'zhuangyuan', championLevel: 4 },
  wu_hong: { name: 'Five Reds', title: 'zhuangyuan', championLevel: 3 },
  wu_zi: { name: 'Five Same', title: 'zhuangyuan', championLevel: 2 },
  si_hong: { name: 'Four Reds', title: 'zhuangyuan', championLevel: 1 },
  duitang: { name: 'All Different', title: 'bangyan', championLevel: 0 },
  san_hong: { name: 'Three Reds', title: 'tanhua', championLevel: 0 },
  si_jin: { name: 'Four of a Kind', title: 'jinshi', championLevel: 0 },
  er_ju: { name: 'Two Fours', title: 'juren', championLevel: 0 },
  yi_xiu: { name: 'One Four', title: 'xiucai', championLevel: 0 },
}

export function createInitialPrizePool(): Record<PrizeTier, number> {
  return { ...PRIZE_POOL_DEFAULT }
}

export function rollDice(): number[] {
  return Array.from({ length: 6 }, () => randomInt(1, 7))
}

export function judgeDice(dice: number[]): DiceResult {
  const counts: Record<number, number> = {}
  for (const d of dice) {
    counts[d] = (counts[d] ?? 0) + 1
  }

  const fourCount = counts[4] ?? 0

  if (fourCount === 6) return makeResult(dice, 'liubei_hong')

  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 6) return makeResult(dice, 'liubei_hei')
  }

  if (fourCount === 5) return makeResult(dice, 'wu_hong')

  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 5) return makeResult(dice, 'wu_zi')
  }

  if (fourCount === 4) return makeResult(dice, 'si_hong')

  if (dice.length === 6 && new Set(dice).size === 6) return makeResult(dice, 'duitang')

  if (fourCount === 3) return makeResult(dice, 'san_hong')

  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 4) return makeResult(dice, 'si_jin')
  }

  if (fourCount === 2) return makeResult(dice, 'er_ju')
  if (fourCount === 1) return makeResult(dice, 'yi_xiu')

  return { dice, rank: null, rankName: 'No Rank', rankTitle: '', championLevel: 0 }
}

function makeResult(dice: number[], rank: RankType): DiceResult {
  const info = RANK_INFO[rank]
  return {
    dice,
    rank,
    rankName: info.name,
    rankTitle: info.title,
    championLevel: info.championLevel,
  }
}

export function applyRollResult(state: GameRoomState, result: DiceResult) {
  state.lastResult = result
  state.lastPrizeAwarded = null
  state.championStolen = false
  state.hasRolledThisTurn = true
  state.updatedAt = new Date().toISOString()

  if (!result.rank) {
    return { awardedPrize: null as PrizeTier | null, championChanged: false }
  }

  const player = state.players[state.currentPlayerIndex]
  if (!player) {
    return { awardedPrize: null as PrizeTier | null, championChanged: false }
  }

  if (result.championLevel > 0) {
    return handleChampion(state, result)
  }

  const prizeName = result.rankTitle
  if (!prizeName) {
    return { awardedPrize: null as PrizeTier | null, championChanged: false }
  }

  if ((state.prizePool[prizeName] ?? 0) <= 0) {
    return { awardedPrize: null as PrizeTier | null, championChanged: false }
  }

  state.prizePool[prizeName] = (state.prizePool[prizeName] ?? 0) - 1
  player.prizes.push({
    rank: result.rank,
    rankName: result.rankName,
    rankTitle: prizeName,
    round: state.currentRound,
  })
  state.lastPrizeAwarded = prizeName
  return { awardedPrize: prizeName, championChanged: false }
}

function handleChampion(state: GameRoomState, result: DiceResult) {
  const player = state.players[state.currentPlayerIndex]
  if (!player || !result.rank) {
    return { awardedPrize: null as PrizeTier | null, championChanged: false }
  }

  if (!state.champion) {
    if ((state.prizePool.zhuangyuan ?? 0) <= 0) {
      return { awardedPrize: null as PrizeTier | null, championChanged: false }
    }

    state.prizePool.zhuangyuan -= 1
    player.prizes.push({
      rank: result.rank,
      rankName: result.rankName,
      rankTitle: 'zhuangyuan',
      round: state.currentRound,
    })
    state.champion = {
      playerId: player.playerId,
      championLevel: result.championLevel,
      rankName: result.rankName,
      round: state.currentRound,
    }
    state.lastPrizeAwarded = 'zhuangyuan'
    return { awardedPrize: 'zhuangyuan' as PrizeTier, championChanged: true }
  }

  if (result.championLevel > state.champion.championLevel) {
    const previous = state.players.find(p => p.playerId === state.champion?.playerId)
    if (previous) {
      const targetIndex = previous.prizes.findIndex(pr => pr.rankTitle === 'zhuangyuan')
      if (targetIndex >= 0) {
        previous.prizes.splice(targetIndex, 1)
      }
    }

    player.prizes.push({
      rank: result.rank,
      rankName: result.rankName,
      rankTitle: 'zhuangyuan',
      round: state.currentRound,
    })
    state.champion = {
      playerId: player.playerId,
      championLevel: result.championLevel,
      rankName: result.rankName,
      round: state.currentRound,
    }
    state.championStolen = true
    state.lastPrizeAwarded = 'zhuangyuan'
    return { awardedPrize: 'zhuangyuan' as PrizeTier, championChanged: true }
  }

  return { awardedPrize: null as PrizeTier | null, championChanged: false }
}

export function nextTurn(state: GameRoomState) {
  state.lastResult = null
  state.lastPrizeAwarded = null
  state.championStolen = false
  state.hasRolledThisTurn = false

  if (isGameOver(state)) {
    state.phase = 'result'
    state.updatedAt = new Date().toISOString()
    return
  }

  state.currentPlayerIndex += 1
  if (state.currentPlayerIndex >= state.players.length) {
    state.currentPlayerIndex = 0
    state.currentRound += 1
  }

  if (isGameOver(state)) {
    state.phase = 'result'
  }
  state.updatedAt = new Date().toISOString()
}

export function isGameOver(state: GameRoomState): boolean {
  if (state.phase !== 'playing') {
    return false
  }

  const totalPrizesLeft = Object.values(state.prizePool).reduce((sum, count) => sum + count, 0)
  if (totalPrizesLeft <= 0) {
    return true
  }

  if (state.endMode === 'all_prizes_distributed') {
    return false
  }

  return state.currentRound > state.totalRounds
}

export function getRanking(state: GameRoomState) {
  return [...state.players]
    .map((player, index) => ({
      ...player,
      index,
      score: player.prizes.reduce((sum, prize) => sum + (RANK_SCORE[prize.rankTitle] ?? 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
}

