import { describe, expect, test } from 'bun:test'

import {
  buildSubscriptionViews,
  calculateQuotaSplit,
  computeUsageSummary,
  findLongestTask,
} from '../utils/metrics'
import { calculateHeaderInset } from '../utils/navigation'

describe('computeUsageSummary', () => {
  test('sums usage and resolves ties by count then model name', () => {
    const result = computeUsageSummary([
      { model_name: 'z-model', token_used: 100, count: 2 },
      { model_name: 'a-model', token_used: 100, count: 3 },
      { model_name: 'a-model', token_used: 25, count: 1 },
      { model_name: 'b-model', token_used: 125, count: 3 },
    ])

    expect(result.totalTokens).toBe(350)
    expect(result.requestCount).toBe(9)
    expect(result.topModels).toEqual([
      { name: 'a-model', tokens: 125, requestCount: 4 },
      { name: 'b-model', tokens: 125, requestCount: 3 },
      { name: 'z-model', tokens: 100, requestCount: 2 },
    ])
  })
})

describe('findLongestTask', () => {
  test('ignores incomplete timestamps and reports bounded scan scope', () => {
    const result = findLongestTask(
      [
        {
          id: 1,
          platform: 'kling',
          task_id: 'one',
          action: 'GENERATE',
          submit_time: 100,
          finish_time: 180,
          status: 'SUCCESS',
        },
        {
          id: 2,
          platform: 'runway',
          task_id: 'two',
          action: 'GENERATE',
          submit_time: 100,
          finish_time: 500,
          status: 'FAILURE',
        },
      ],
      800,
      500
    )

    expect(result?.task?.id).toBe(1)
    expect(result?.durationSeconds).toBe(80)
    expect(result?.scopedLabel).toBe('最近 500 个任务中最长')
  })
})

describe('buildSubscriptionViews', () => {
  test('keeps wallet-independent remaining quota and fills the plan title', () => {
    const result = buildSubscriptionViews(
      [
        {
          subscription: {
            id: 4,
            plan_id: 9,
            status: 'active',
            start_time: 10,
            end_time: 20,
            amount_total: 1000,
            amount_used: 400,
          },
        },
      ],
      [
        {
          plan: {
            id: 9,
            title: 'Pro',
            price_amount: 1,
            currency: 'CNY',
            total_amount: 1000,
            duration_unit: 'month',
            duration_value: 1,
          },
        },
      ]
    )

    expect(result[0].title).toBe('Pro')
    expect(result[0].remaining).toBe(600)
  })
})

describe('calculateHeaderInset', () => {
  test('places page content below the camera area and menu capsule', () => {
    expect(
      calculateHeaderInset(59, {
        top: 63,
        height: 32,
      })
    ).toBe(107)
  })

  test('uses a conservative navigation height when capsule metrics are missing', () => {
    expect(calculateHeaderInset(44)).toBe(96)
  })
})

describe('calculateQuotaSplit', () => {
  test('returns complementary used and remaining percentages', () => {
    expect(calculateQuotaSplit(85.72, 37.47)).toEqual({
      usedPercent: 70,
      remainingPercent: 30,
    })
  })

  test('keeps an empty account deterministic', () => {
    expect(calculateQuotaSplit(0, 0)).toEqual({
      usedPercent: 0,
      remainingPercent: 100,
    })
  })
})
