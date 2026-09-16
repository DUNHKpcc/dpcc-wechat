import { describe, expect, test } from 'bun:test'
import { getModelContextLength } from '../constants/model-context'

describe('getModelContextLength', () => {
  test('returns the fixed capacity for catalog models', () => {
    expect(getModelContextLength('claude-haiku-4-5')).toBe(200_000)
    expect(getModelContextLength('deepseek-v4-pro')).toBe(1_000_000)
    expect(getModelContextLength('gpt-5.6-sol')).toBe(1_050_000)
    expect(getModelContextLength('grok-4.5')).toBe(500_000)
  })

  test('normalizes model names and leaves unknown models unmarked', () => {
    expect(getModelContextLength('  Claude-Haiku-4-5 ')).toBe(200_000)
    expect(getModelContextLength('new-model')).toBeUndefined()
  })
})
