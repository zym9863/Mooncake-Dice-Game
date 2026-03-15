import { describe, expect, it } from 'vitest'
import type { DiceResult, GameRoomState, PrizeTier } from '../../shared/game-types.js'
import {
  applyRollResult,
  createInitialPrizePool,
  getRanking,
  isGameOver,
  judgeDice,
  nextTurn,
  rollDice,
} from './game-engine.js'

function makeState(overrides: Partial<GameRoomState> = {}): GameRoomState {
  const base: GameRoomState = {
    roomCode: 'ROOM01',
    hostPlayerId: 'p1',
    phase: 'playing',
    players: [
      { playerId: 'p1', name: 'Alice', prizes: [], connected: true, returnedToWaiting: false },
      { playerId: 'p2', name: 'Bob', prizes: [], connected: true, returnedToWaiting: false },
    ],
    currentPlayerIndex: 0,
    currentRound: 1,
    totalRounds: 2,
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

  return {
    ...base,
    ...overrides,
    players: overrides.players ?? base.players,
    prizePool: {
      ...base.prizePool,
      ...(overrides.prizePool ?? {}),
    },
  }
}

describe('game-engine', () => {
  it('createInitialPrizePool returns a copy', () => {
    const pool = createInitialPrizePool()
    expect(pool).toEqual({
      zhuangyuan: 1,
      bangyan: 2,
      tanhua: 4,
      jinshi: 8,
      juren: 16,
      xiucai: 32,
    })

    pool.juren = 0
    const pool2 = createInitialPrizePool()
    expect(pool2.juren).toBe(16)
  })

  it('rollDice returns six dice values in [1..6]', () => {
    const dice = rollDice()
    expect(dice).toHaveLength(6)
    for (const value of dice) {
      expect(value).toBeGreaterThanOrEqual(1)
      expect(value).toBeLessThanOrEqual(6)
    }
  })

  it.each([
    [[4, 4, 4, 4, 4, 4], 'liubei_hong', 5],
    [[1, 1, 1, 1, 1, 1], 'liubei_hei', 4],
    [[4, 4, 4, 4, 4, 2], 'wu_hong', 3],
    [[2, 2, 2, 2, 2, 4], 'wu_zi', 2],
    [[4, 4, 4, 4, 1, 2], 'si_hong', 1],
    [[1, 2, 3, 4, 5, 6], 'duitang', 0],
    [[4, 4, 4, 1, 2, 3], 'san_hong', 0],
    [[3, 3, 3, 3, 1, 4], 'si_jin', 0],
    [[4, 4, 1, 2, 3, 5], 'er_ju', 0],
    [[4, 1, 1, 2, 3, 5], 'yi_xiu', 0],
  ])('judgeDice identifies %j as %s', (dice, expectedRank, expectedLevel) => {
    const result = judgeDice(dice)
    expect(result.rank).toBe(expectedRank)
    expect(result.championLevel).toBe(expectedLevel)
  })

  it('judgeDice returns no-rank result', () => {
    const result = judgeDice([1, 1, 2, 2, 3, 3])
    expect(result.rank).toBeNull()
    expect(result.rankTitle).toBe('')
    expect(result.championLevel).toBe(0)
  })

  it('applyRollResult handles no-rank roll', () => {
    const state = makeState()
    const result: DiceResult = {
      dice: [1, 1, 2, 2, 3, 3],
      rank: null,
      rankName: 'No Rank',
      rankTitle: '',
      championLevel: 0,
    }

    const outcome = applyRollResult(state, result)
    expect(outcome).toEqual({ awardedPrize: null, championChanged: false })
    expect(state.hasRolledThisTurn).toBe(true)
    expect(state.lastResult).toEqual(result)
  })

  it('applyRollResult awards non-champion prize', () => {
    const state = makeState()
    const result = judgeDice([4, 4, 1, 2, 3, 5])

    const outcome = applyRollResult(state, result)

    expect(outcome).toEqual({ awardedPrize: 'juren', championChanged: false })
    expect(state.prizePool.juren).toBe(15)
    expect(state.players[0].prizes).toHaveLength(1)
    expect(state.players[0].prizes[0].rankTitle).toBe('juren')
  })

  it('applyRollResult does not award when prize exhausted', () => {
    const state = makeState({
      prizePool: {
        zhuangyuan: 1,
        bangyan: 2,
        tanhua: 4,
        jinshi: 8,
        juren: 0,
        xiucai: 32,
      },
    })
    const result = judgeDice([4, 4, 1, 2, 3, 5])

    const outcome = applyRollResult(state, result)

    expect(outcome).toEqual({ awardedPrize: null, championChanged: false })
    expect(state.players[0].prizes).toHaveLength(0)
  })

  it('applyRollResult assigns first champion', () => {
    const state = makeState()
    const result = judgeDice([4, 4, 4, 4, 1, 2])

    const outcome = applyRollResult(state, result)

    expect(outcome).toEqual({ awardedPrize: 'zhuangyuan', championChanged: true })
    expect(state.champion?.playerId).toBe('p1')
    expect(state.prizePool.zhuangyuan).toBe(0)
  })

  it('applyRollResult steals champion when level is higher', () => {
    const state = makeState({
      currentPlayerIndex: 1,
      players: [
        {
          playerId: 'p1',
          name: 'Alice',
          connected: true,
          returnedToWaiting: false,
          prizes: [
            {
              rank: 'si_hong',
              rankName: 'Four Reds',
              rankTitle: 'zhuangyuan',
              round: 1,
            },
          ],
        },
        { playerId: 'p2', name: 'Bob', prizes: [], connected: true, returnedToWaiting: false },
      ],
      champion: {
        playerId: 'p1',
        championLevel: 1,
        rankName: 'Four Reds',
        round: 1,
      },
      prizePool: {
        zhuangyuan: 0,
        bangyan: 2,
        tanhua: 4,
        jinshi: 8,
        juren: 16,
        xiucai: 32,
      },
    })

    const result = judgeDice([4, 4, 4, 4, 4, 2])
    const outcome = applyRollResult(state, result)

    expect(outcome).toEqual({ awardedPrize: 'zhuangyuan', championChanged: true })
    expect(state.champion?.playerId).toBe('p2')
    expect(state.players[0].prizes).toHaveLength(0)
    expect(state.players[1].prizes).toHaveLength(1)
    expect(state.championStolen).toBe(true)
  })

  it('applyRollResult does not steal champion when level is not higher', () => {
    const state = makeState({
      champion: {
        playerId: 'p1',
        championLevel: 3,
        rankName: 'Five Reds',
        round: 1,
      },
      prizePool: {
        zhuangyuan: 0,
        bangyan: 2,
        tanhua: 4,
        jinshi: 8,
        juren: 16,
        xiucai: 32,
      },
    })

    const result = judgeDice([4, 4, 4, 4, 1, 2])
    const outcome = applyRollResult(state, result)

    expect(outcome).toEqual({ awardedPrize: null, championChanged: false })
    expect(state.champion?.playerId).toBe('p1')
  })

  it('nextTurn advances player index and round', () => {
    const state = makeState({ hasRolledThisTurn: true })

    nextTurn(state)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.currentRound).toBe(1)
    expect(state.phase).toBe('playing')

    state.hasRolledThisTurn = true
    nextTurn(state)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.currentRound).toBe(2)
  })

  it('nextTurn sets result when game is over', () => {
    const state = makeState({
      hasRolledThisTurn: true,
      currentRound: 3,
      totalRounds: 2,
    })

    nextTurn(state)
    expect(state.phase).toBe('result')
  })

  it('isGameOver handles both end modes', () => {
    const waiting = makeState({ phase: 'waiting' })
    expect(isGameOver(waiting)).toBe(false)

    const noPrize = makeState({
      prizePool: {
        zhuangyuan: 0,
        bangyan: 0,
        tanhua: 0,
        jinshi: 0,
        juren: 0,
        xiucai: 0,
      },
    })
    expect(isGameOver(noPrize)).toBe(true)

    const prizeMode = makeState({
      endMode: 'all_prizes_distributed',
      currentRound: 99,
      totalRounds: 1,
    })
    expect(isGameOver(prizeMode)).toBe(false)
  })

  it('getRanking sorts by score', () => {
    const state = makeState({
      players: [
        {
          playerId: 'p1',
          name: 'Alice',
          connected: true,
          returnedToWaiting: false,
          prizes: [
            { rank: 'yi_xiu', rankName: 'One Four', rankTitle: 'xiucai', round: 1 },
            { rank: 'er_ju', rankName: 'Two Fours', rankTitle: 'juren', round: 1 },
          ],
        },
        {
          playerId: 'p2',
          name: 'Bob',
          connected: true,
          returnedToWaiting: false,
          prizes: [
            { rank: 'san_hong', rankName: 'Three Reds', rankTitle: 'tanhua', round: 1 },
          ],
        },
      ],
    })

    const ranking = getRanking(state)

    expect(ranking[0].playerId).toBe('p2')
    expect(ranking[0].score).toBe(20)
    expect(ranking[1].score).toBe(7)
  })

  it('applyRollResult handles missing current player safely', () => {
    const state = makeState({ currentPlayerIndex: 999, players: [] })
    const result = judgeDice([4, 1, 2, 3, 5, 6])

    const outcome = applyRollResult(state, result)
    expect(outcome).toEqual({ awardedPrize: null, championChanged: false })
  })

  it('applyRollResult handles empty rankTitle safely', () => {
    const state = makeState()
    const result: DiceResult = {
      dice: [1, 2, 3, 4, 5, 6],
      rank: 'duitang',
      rankName: 'All Different',
      rankTitle: '' as PrizeTier | '',
      championLevel: 0,
    }

    const outcome = applyRollResult(state, result)
    expect(outcome).toEqual({ awardedPrize: null, championChanged: false })
  })
})
