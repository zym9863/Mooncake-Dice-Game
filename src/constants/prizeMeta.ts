import type { PrizeTier } from '../../shared/game-types'

export interface PrizeMeta {
  key: PrizeTier
  title: string
  count: number
  color: string
  surface: string
}

export const PRIZE_META: PrizeMeta[] = [
  { key: 'zhuangyuan', title: 'Zhuangyuan', count: 1, color: '#f6b343', surface: 'rgba(246, 179, 67, 0.14)' },
  { key: 'bangyan', title: 'Bangyan', count: 2, color: '#8ec5ff', surface: 'rgba(142, 197, 255, 0.12)' },
  { key: 'tanhua', title: 'Tanhua', count: 4, color: '#ff9f7e', surface: 'rgba(255, 159, 126, 0.12)' },
  { key: 'jinshi', title: 'Jinshi', count: 8, color: '#9adf93', surface: 'rgba(154, 223, 147, 0.12)' },
  { key: 'juren', title: 'Juren', count: 16, color: '#f26f6a', surface: 'rgba(242, 111, 106, 0.12)' },
  { key: 'xiucai', title: 'Xiucai', count: 32, color: '#dcc8a6', surface: 'rgba(220, 200, 166, 0.12)' },
]

const PRIZE_META_MAP: Record<PrizeTier, PrizeMeta> = PRIZE_META.reduce((acc, item) => {
  acc[item.key] = item
  return acc
}, {} as Record<PrizeTier, PrizeMeta>)

export function getPrizeColor(key: string): string {
  return PRIZE_META_MAP[key as PrizeTier]?.color ?? '#f6b343'
}

export function getPrizeSurface(key: string): string {
  return PRIZE_META_MAP[key as PrizeTier]?.surface ?? 'rgba(246, 179, 67, 0.14)'
}
