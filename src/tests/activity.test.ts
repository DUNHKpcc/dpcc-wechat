import { describe, expect, test } from 'bun:test'

import {
  aggregateTokenActivity,
  buildTokenActivityHeatmap,
} from '../utils/activity'

function timestamp(year: number, month: number, day: number, hour = 12): number {
  return Math.floor(new Date(year, month - 1, day, hour).getTime() / 1000)
}

describe('aggregateTokenActivity', () => {
  test('sums model usage into local calendar days', () => {
    const result = aggregateTokenActivity([
      { created_at: timestamp(2026, 7, 25, 9), token_used: 120 },
      { created_at: timestamp(2026, 7, 25, 18), token_used: 80 },
      { created_at: timestamp(2026, 7, 26), token_used: 40 },
      { token_used: 999 },
    ])

    expect(result).toHaveLength(2)
    expect(result.map((point) => point.tokens)).toEqual([200, 40])
  })
})

describe('buildTokenActivityHeatmap', () => {
  test('builds 53 weeks and supports daily, weekly, and cumulative values', () => {
    const now = timestamp(2026, 7, 26)
    const points = [
      { timestamp: timestamp(2026, 7, 25), tokens: 100 },
      { timestamp: timestamp(2026, 7, 26), tokens: 50 },
    ]

    const daily = buildTokenActivityHeatmap(points, 'daily', now)
    const weekly = buildTokenActivityHeatmap(points, 'weekly', now)
    const cumulative = buildTokenActivityHeatmap(points, 'cumulative', now)

    expect(daily.weeks).toHaveLength(53)
    expect(daily.weeks.every((week) => week.cells.length === 7)).toBe(true)
    expect(daily.weeks[51].cells[6].tokens).toBe(100)
    expect(daily.weeks[52].cells[0].tokens).toBe(50)
    expect(weekly.weeks[51].cells[6].tokens).toBe(100)
    expect(cumulative.weeks[51].cells[6].tokens).toBe(100)
    expect(cumulative.weeks[52].cells[0].tokens).toBe(150)
  })
})
