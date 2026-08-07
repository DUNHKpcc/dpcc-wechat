const iconPaths: Record<string, string> = {
  openai: '/assets/model-icons/openai.png',
  gpt: '/assets/model-icons/openai.png',
  chatgpt: '/assets/model-icons/openai.png',
  codex: '/assets/model-icons/openai.png',
  'dall-e': '/assets/model-icons/openai.png',
  sora: '/assets/model-icons/openai.png',
  claude: '/assets/model-icons/claude.png',
  anthropic: '/assets/model-icons/claude.png',
  gemini: '/assets/model-icons/gemini.png',
  google: '/assets/model-icons/gemini.png',
  deepseek: '/assets/model-icons/deepseek.png',
  xai: '/assets/model-icons/xai.png',
  grok: '/assets/model-icons/xai.png',
  zhipu: '/assets/model-icons/zhipu.png',
  glm: '/assets/model-icons/zhipu.png',
  moonshot: '/assets/model-icons/moonshot.png',
  kimi: '/assets/model-icons/moonshot.png',
}

function iconBase(value?: string): string {
  return value?.trim().split('.')[0].toLowerCase() || ''
}

export function resolveModelIconPath(
  modelIcon?: string,
  vendorIcon?: string,
  modelName = '',
  vendorName = ''
): string {
  for (const key of [iconBase(modelIcon), iconBase(vendorIcon)]) {
    if (iconPaths[key]) return iconPaths[key]
  }

  const searchable = `${modelName} ${vendorName}`.toLowerCase()
  for (const [key, path] of Object.entries(iconPaths)) {
    if (searchable.includes(key)) return path
  }

  if (/(^|[\s_-])o[134]([\s_-]|$)/.test(searchable)) {
    return iconPaths.openai
  }
  if (searchable.includes('智谱')) return iconPaths.zhipu
  return '/assets/dpcc-logo.png'
}
