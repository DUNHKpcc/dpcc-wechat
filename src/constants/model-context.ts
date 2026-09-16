const MODEL_CONTEXT_LENGTHS: Record<string, number> = {
  'claude-haiku-4-5': 200_000,
  'claude-sonnet-4-6': 1_000_000,
  'claude-sonnet-5': 1_000_000,
  'claude-opus-4-6': 1_000_000,
  'claude-opus-4-7': 1_000_000,
  'claude-opus-4-8': 1_000_000,
  'claude-opus-5': 1_000_000,
  'deepseek-v4-flash': 1_000_000,
  'deepseek-v4-pro': 1_000_000,
  'deepseek-v4-flash-0731': 128_000,
  'glm-5.1': 128_000,
  'glm-5.2': 128_000,
  'gpt-5.5': 128_000,
  'gpt-5.6-luna': 1_050_000,
  'gpt-5.6-sol': 1_050_000,
  'gpt-5.6-terra': 1_050_000,
  'gpt-5.3-codex-spark': 128_000,
  'grok-4.3': 1_000_000,
  'grok-4.5': 500_000,
  'grok-4.6': 500_000,
  'kimi-k3': 128_000,
}

export function getModelContextLength(modelName: string): number | undefined {
  return MODEL_CONTEXT_LENGTHS[modelName.trim().toLowerCase()]
}
