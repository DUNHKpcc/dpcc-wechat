import { describe, expect, test } from 'bun:test'
import { resolveModelIconPath } from '../utils/model-icons'

describe('resolveModelIconPath', () => {
  test('prefers the model icon returned by pricing', () => {
    expect(
      resolveModelIconPath('Claude.Color', 'OpenAI', 'gpt-5.6', 'OpenAI')
    ).toBe('/assets/model-icons/claude.png')
  })

  test('falls back to the vendor icon', () => {
    expect(
      resolveModelIconPath(undefined, 'Gemini.Color', 'custom-model', 'Google')
    ).toBe('/assets/model-icons/gemini.png')
  })

  test('infers a provider from the model name', () => {
    expect(resolveModelIconPath(undefined, undefined, 'deepseek-v4')).toBe(
      '/assets/model-icons/deepseek.png'
    )
    expect(resolveModelIconPath(undefined, undefined, 'gpt-5.6-luna')).toBe(
      '/assets/model-icons/openai.png'
    )
  })
})
