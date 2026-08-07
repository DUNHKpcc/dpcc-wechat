import type { TokenActivityPoint, UsageRow } from '../types/api'

export type TokenActivityMode = 'daily' | 'weekly' | 'cumulative'

export interface TokenActivityCell {
  timestamp: number
  dateLabel: string
  tokens: number
  level: number
  future: boolean
}

export interface TokenActivityMonth {
  key: number
  label: string
  left: number
}

export interface TokenActivityWeek {
  index: number
  cells: TokenActivityCell[]
}

export interface TokenActivityHeatmap {
  weeks: TokenActivityWeek[]
  months: TokenActivityMonth[]
}

function localDayTimestamp(timestamp: number): number {
  const date = new Date(timestamp * 1000)
  date.setHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

function addDays(timestamp: number, days: number): number {
  const date = new Date(timestamp * 1000)
  date.setDate(date.getDate() + days)
  return Math.floor(date.getTime() / 1000)
}

function formatCellDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function aggregateTokenActivity(rows: UsageRow[]): TokenActivityPoint[] {
  const totals = new Map<number, number>()
  for (const row of rows) {
    const timestamp = Number(row.created_at)
    if (!Number.isFinite(timestamp) || timestamp <= 0) continue
    const day = localDayTimestamp(timestamp)
    const tokens = Math.max(0, Number(row.token_used) || 0)
    totals.set(day, (totals.get(day) || 0) + tokens)
  }

  return [...totals.entries()]
    .map(([timestamp, tokens]) => ({ timestamp, tokens }))
    .sort((left, right) => left.timestamp - right.timestamp)
}

export function buildTokenActivityHeatmap(
  points: TokenActivityPoint[],
  mode: TokenActivityMode,
  nowTimestamp = Math.floor(Date.now() / 1000)
): TokenActivityHeatmap {
  const today = localDayTimestamp(nowTimestamp)
  const todayDate = new Date(today * 1000)
  const currentWeekStart = addDays(today, -todayDate.getDay())
  const heatmapStart = addDays(currentWeekStart, -52 * 7)
  const dailyTokens = new Map(
    points.map((point) => [localDayTimestamp(point.timestamp), point.tokens])
  )

  const timestamps = Array.from({ length: 53 * 7 }, (_, index) =>
    addDays(heatmapStart, index)
  )
  const dailyValues = timestamps.map(
    (timestamp) => dailyTokens.get(timestamp) || 0
  )
  let values = dailyValues

  if (mode === 'weekly') {
    values = dailyValues.map((_, index) => {
      const weekStartIndex = Math.floor(index / 7) * 7
      return dailyValues
        .slice(weekStartIndex, weekStartIndex + 7)
        .reduce((sum, value) => sum + value, 0)
    })
  } else if (mode === 'cumulative') {
    let runningTotal = 0
    values = dailyValues.map((value, index) => {
      if (timestamps[index] > today) return 0
      runningTotal += value
      return runningTotal
    })
  }

  const visibleValues = values.filter(
    (value, index) => timestamps[index] <= today && value > 0
  )
  const maxValue = Math.max(0, ...visibleValues)
  const cells = timestamps.map((timestamp, index): TokenActivityCell => {
    const tokens = timestamp > today ? 0 : values[index]
    const ratio =
      tokens > 0 && maxValue > 0
        ? Math.log(tokens + 1) / Math.log(maxValue + 1)
        : 0
    return {
      timestamp,
      dateLabel: formatCellDate(timestamp),
      tokens,
      level: tokens > 0 ? Math.max(1, Math.ceil(ratio * 4)) : 0,
      future: timestamp > today,
    }
  })

  const weeks = Array.from({ length: 53 }, (_, index) => ({
    index,
    cells: cells.slice(index * 7, index * 7 + 7),
  }))
  const months: TokenActivityMonth[] = []
  let previousMonth = -1
  timestamps.forEach((timestamp, index) => {
    if (timestamp > today) return
    const date = new Date(timestamp * 1000)
    const month = date.getMonth()
    if (index === 0 || (date.getDate() === 1 && month !== previousMonth)) {
      const weekIndex = Math.floor(index / 7)
      months.push({
        key: timestamp,
        label: `${month + 1}月`,
        left: Math.min(96, Math.round((weekIndex / 52) * 1000) / 10),
      })
      previousMonth = month
    }
  })

  return { weeks, months }
}
