const MINI_SESSION_KEY = 'new-api-mini-session'
const INSTALLATION_ID_KEY = 'new-api-installation-id'

let accessToken = ''
let accessExpiresAt = 0
let currentUserId = 0

function randomId(): string {
  const random = Math.random().toString(36).slice(2)
  return `${Date.now().toString(36)}-${random}`
}

export function getInstallationId(): string {
  const existing = wx.getStorageSync<string>(INSTALLATION_ID_KEY)
  if (existing) return existing
  const created = randomId()
  wx.setStorageSync(INSTALLATION_ID_KEY, created)
  return created
}

export function setMiniSession(token: string): void {
  wx.setStorageSync(MINI_SESSION_KEY, token)
}

export function getMiniSession(): string {
  return wx.getStorageSync<string>(MINI_SESSION_KEY) || ''
}

export function clearMiniSession(): void {
  wx.removeStorageSync(MINI_SESSION_KEY)
}

export function setAccessSession(
  token: string,
  expiresAt: number,
  userId?: number
): void {
  accessToken = token
  accessExpiresAt = expiresAt
  if (userId) currentUserId = userId
}

export function getAccessToken(): string {
  return accessToken
}

export function getAccessExpiresAt(): number {
  return accessExpiresAt
}

export function getCurrentUserId(): number {
  return currentUserId
}

export function clearAccessToken(): void {
  accessToken = ''
  accessExpiresAt = 0
}

export function clearAllSession(): void {
  clearAccessToken()
  clearMiniSession()
  currentUserId = 0
}
