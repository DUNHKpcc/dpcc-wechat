interface RuntimeConfig {
  newApiBaseUrl: string
  bffBaseUrl: string
  usageWindowDays: number
  activityWindowDays: number
}

export const runtimeConfig: RuntimeConfig = {
  newApiBaseUrl: 'https://api.dpccgaming.xyz',
  bffBaseUrl: 'https://api.dpccgaming.xyz',
  usageWindowDays: 30,
  activityWindowDays: 371,
}
