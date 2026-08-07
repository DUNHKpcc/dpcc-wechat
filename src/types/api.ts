export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  code?: string
  data?: T
}

export interface UserProfile {
  id: number
  username: string
  display_name: string
  email?: string
  wechat_id?: string
  role?: number
  status?: number
  group: string
  quota: number
  used_quota: number
  request_count?: number
}

export interface SystemStatus {
  system_name?: string
  enable_data_export?: boolean
}

export interface SubscriptionPlan {
  id: number
  title: string
  subtitle?: string
  price_amount: number
  currency: string
  total_amount: number
  duration_unit: string
  duration_value: number
}

export interface SubscriptionPlanRecord {
  plan: SubscriptionPlan
}

export interface UserSubscription {
  id: number
  plan_id: number
  status: string
  start_time: number
  end_time: number
  amount_total: number
  amount_used: number
  next_reset_time?: number
}

export interface UserSubscriptionRecord {
  subscription: UserSubscription
}

export interface SelfSubscriptionData {
  billing_preference?: string
  subscriptions: UserSubscriptionRecord[]
  all_subscriptions?: UserSubscriptionRecord[]
}

export interface UsageRow {
  model_name?: string
  created_at?: number
  token_used?: number
  count?: number
}

export interface TokenActivityPoint {
  timestamp: number
  tokens: number
}

export interface TaskLog {
  id: number
  platform: string
  task_id: string
  action: string
  submit_time: number
  finish_time?: number
  status: string
}

export interface ApiKey {
  id: number
  name: string
  key: string
  status: number
  remain_quota: number
  used_quota: number
  unlimited_quota: boolean
  expired_time: number
  created_time: number
  accessed_time: number
  group?: string
  model_limits_enabled: boolean
  model_limits?: string
  allow_ips?: string
  cross_group_retry?: boolean
}

export interface ApiKeyFormData {
  name: string
  remain_quota: number
  expired_time: number
  unlimited_quota: boolean
  model_limits_enabled: boolean
  model_limits: string
  allow_ips: string
  group: string
  cross_group_retry: boolean
}

export interface PricingModel {
  id: number
  model_name: string
  description?: string
  icon?: string
  vendor_id?: number
  vendor_name?: string
  vendor_icon?: string
  quota_type: number
  model_ratio: number
  completion_ratio: number
  model_price?: number
  enable_groups: string[]
  tags?: string
  context_length?: number
  max_output_tokens?: number
  input_modalities?: string[]
  capabilities?: string[]
}

export interface PricingVendor {
  id: number
  name: string
  icon?: string
}

export interface PricingData {
  data: PricingModel[]
}

export interface AvailableModel {
  name: string
  vendor: string
  iconPath: string
  description: string
  quotaType: number | null
  modelRatio: number | null
  completionRatio: number | null
  modelPrice: number | null
  contextLength?: number
  tags: string[]
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface BffAuthData {
  mini_session_token: string
  mini_session_expires_at: number
  access_token: string
  access_expires_at: number
  session?: {
    sid?: string
  }
  user: UserProfile
}

export interface SubscriptionView {
  id: number
  title: string
  remaining: number
  total: number
  endTime: number
  status: string
}

export interface UsageSummary {
  totalTokens: number
  topModels: Array<{
    name: string
    tokens: number
    requestCount: number
  }>
  requestCount: number
}

export interface LongestTask {
  task?: TaskLog
  durationSeconds: number
  scopedLabel: string
}

export interface OverviewSnapshot {
  user: UserProfile
  subscriptions: SubscriptionView[]
  usage: UsageSummary | null
  tokenActivity: TokenActivityPoint[]
  dataExportEnabled: boolean
  usageWindowDays: number
}
