const QUOTA_PER_DOLLAR = 500_000

export function formatQuota(quota: number): string {
  const amount = Number.isFinite(quota) ? quota / QUOTA_PER_DOLLAR : 0
  return `$${amount.toFixed(amount >= 100 ? 0 : 2)}`
}

export function formatInteger(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  if (safeValue >= 1_000_000_000) {
    return `${(safeValue / 1_000_000_000).toFixed(1)}B`
  }
  if (safeValue >= 1_000_000) {
    return `${(safeValue / 1_000_000).toFixed(1)}M`
  }
  if (safeValue >= 1_000) {
    return `${(safeValue / 1_000).toFixed(1)}K`
  }
  return Math.round(safeValue).toString()
}

export function formatDate(timestamp: number): string {
  if (!timestamp || timestamp < 0) return '长期有效'
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  if (safeSeconds < 60) return `${safeSeconds} 秒`
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  if (minutes < 60) return `${minutes} 分 ${remainingSeconds} 秒`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours} 小时 ${remainingMinutes} 分`
}

export function maskKey(key: string): string {
  if (!key) return 'sk-••••••••••••'
  if (key.length <= 10) return '••••••••••••'
  return `${key.slice(0, 5)}••••••••${key.slice(-4)}`
}

export function formatContextLength(value?: number): string {
  if (!value) return '未标注'
  if (value >= 1_000_000) return `${value / 1_000_000}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return value.toString()
}
