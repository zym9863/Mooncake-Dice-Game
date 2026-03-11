import { ref } from 'vue'

export interface DiceResult {
  dice: number[]
  rank: RankType | null
  rankName: string
  rankTitle: string
  championLevel: number // 0=非状元, 1=四红, 2=五子, 3=五红, 4=六杯黑, 5=六杯红
}

export type RankType =
  | 'liubei_hong'  // 六杯红
  | 'liubei_hei'   // 六杯黑
  | 'wu_hong'      // 五红
  | 'wu_zi'        // 五子
  | 'si_hong'      // 四红
  | 'duitang'      // 对堂
  | 'san_hong'     // 三红
  | 'si_jin'       // 四进
  | 'er_ju'        // 二举
  | 'yi_xiu'       // 一秀

const RANK_INFO: Record<RankType, { name: string; title: string; prize: string; championLevel: number }> = {
  liubei_hong: { name: '六杯红', title: '状元', prize: '状元', championLevel: 5 },
  liubei_hei:  { name: '六杯黑', title: '状元', prize: '状元', championLevel: 4 },
  wu_hong:     { name: '五红',   title: '状元', prize: '状元', championLevel: 3 },
  wu_zi:       { name: '五子',   title: '状元', prize: '状元', championLevel: 2 },
  si_hong:     { name: '四红',   title: '状元', prize: '状元', championLevel: 1 },
  duitang:     { name: '对堂',   title: '榜眼', prize: '榜眼', championLevel: 0 },
  san_hong:    { name: '三红',   title: '探花', prize: '探花', championLevel: 0 },
  si_jin:      { name: '四进',   title: '进士', prize: '进士', championLevel: 0 },
  er_ju:       { name: '二举',   title: '举人', prize: '举人', championLevel: 0 },
  yi_xiu:      { name: '一秀',   title: '秀才', prize: '秀才', championLevel: 0 },
}

export function getRankInfo(rank: RankType) {
  return RANK_INFO[rank]
}

export function judgeDice(dice: number[]): DiceResult {
  const counts: Record<number, number> = {}
  for (const d of dice) {
    counts[d] = (counts[d] || 0) + 1
  }

  const fourCount = counts[4] || 0

  // 六杯红：6个四
  if (fourCount === 6) {
    return makeResult(dice, 'liubei_hong')
  }

  // 六杯黑：6个相同（非四）
  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 6) {
      return makeResult(dice, 'liubei_hei')
    }
  }

  // 五红：5个四
  if (fourCount === 5) {
    return makeResult(dice, 'wu_hong')
  }

  // 五子：5个相同（非四）
  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 5) {
      return makeResult(dice, 'wu_zi')
    }
  }

  // 四红：4个四
  if (fourCount === 4) {
    return makeResult(dice, 'si_hong')
  }

  // 对堂：1-2-3-4-5-6各一个
  if (dice.length === 6 && new Set(dice).size === 6) {
    return makeResult(dice, 'duitang')
  }

  // 三红：恰好3个四
  if (fourCount === 3) {
    return makeResult(dice, 'san_hong')
  }

  // 四进：4个相同（此时四的数量 < 4，所以是非四的数字）
  for (let i = 1; i <= 6; i++) {
    if (i !== 4 && counts[i] === 4) {
      return makeResult(dice, 'si_jin')
    }
  }

  // 二举：恰好2个四
  if (fourCount === 2) {
    return makeResult(dice, 'er_ju')
  }

  // 一秀：恰好1个四
  if (fourCount === 1) {
    return makeResult(dice, 'yi_xiu')
  }

  // 无奖
  return { dice, rank: null, rankName: '无', rankTitle: '', championLevel: 0 }
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

export function rollDice(): number[] {
  return Array.from({ length: 6 }, () => Math.floor(Math.random() * 6) + 1)
}

export function useDiceRoll() {
  const currentDice = ref<number[]>([1, 2, 3, 4, 5, 6])
  const currentResult = ref<DiceResult | null>(null)
  const isRolling = ref(false)

  function roll(): Promise<DiceResult> {
    return new Promise((resolve) => {
      isRolling.value = true
      currentResult.value = null

      // 动画阶段：CSS 3D翻滚进行中，移除高频数字刷新以确保纯净的3D旋转
      const animDuration = 1500 // 等待CSS 3D动画的时间，可调得长一点

      setTimeout(() => {
        // 最终结果
        const finalDice = rollDice()
        currentDice.value = finalDice
        const result = judgeDice(finalDice)
        currentResult.value = result
        isRolling.value = false
        resolve(result)
      }, animDuration)
    })
  }

  return { currentDice, currentResult, isRolling, roll }
}
