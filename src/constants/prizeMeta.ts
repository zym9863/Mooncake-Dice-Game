export interface PrizeMeta {
  title: string
  count: number
  color: string
  surface: string
}

export const PRIZE_META: PrizeMeta[] = [
  { title: '状元', count: 1, color: '#f6b343', surface: 'rgba(246, 179, 67, 0.14)' },
  { title: '榜眼', count: 2, color: '#8ec5ff', surface: 'rgba(142, 197, 255, 0.12)' },
  { title: '探花', count: 4, color: '#ff9f7e', surface: 'rgba(255, 159, 126, 0.12)' },
  { title: '进士', count: 8, color: '#9adf93', surface: 'rgba(154, 223, 147, 0.12)' },
  { title: '举人', count: 16, color: '#f26f6a', surface: 'rgba(242, 111, 106, 0.12)' },
  { title: '秀才', count: 32, color: '#dcc8a6', surface: 'rgba(220, 200, 166, 0.12)' },
]

const PRIZE_META_MAP = Object.fromEntries(
  PRIZE_META.map((item) => [item.title, item]),
)

export function getPrizeColor(title: string): string {
  return PRIZE_META_MAP[title]?.color ?? '#f6b343'
}

export function getPrizeSurface(title: string): string {
  return PRIZE_META_MAP[title]?.surface ?? 'rgba(246, 179, 67, 0.14)'
}
