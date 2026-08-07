import { runtimeConfig } from '../config/runtime'
import type {
  ApiKey,
  ApiKeyFormData,
  AvailableModel,
  OverviewSnapshot,
  PaginatedData,
  PricingModel,
  PricingVendor,
  SelfSubscriptionData,
  SubscriptionPlanRecord,
  SystemStatus,
  UsageRow,
  UserProfile,
} from '../types/api'
import { aggregateTokenActivity } from '../utils/activity'
import { buildSubscriptionViews, computeUsageSummary } from '../utils/metrics'
import { resolveModelIconPath } from '../utils/model-icons'
import { apiRequest } from './request'
import { transport, unwrap } from './transport'

function queryString(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&')
}

export async function getStatus(): Promise<SystemStatus> {
  return unwrap(await transport<SystemStatus>('/api/status'))
}

export async function getSelf(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/user/self')
}

export async function getSubscriptions(): Promise<SelfSubscriptionData> {
  return apiRequest<SelfSubscriptionData>('/api/subscription/self')
}

export async function getPlans(): Promise<SubscriptionPlanRecord[]> {
  return apiRequest<SubscriptionPlanRecord[]>('/api/subscription/plans')
}

export async function getUsageRows(
  startTimestamp: number,
  endTimestamp: number
): Promise<UsageRow[]> {
  const query = queryString({
    start_timestamp: startTimestamp,
    end_timestamp: endTimestamp,
  })
  return apiRequest<UsageRow[]>(`/api/data/self?${query}`)
}

async function getUsageRowsForPeriod(
  startTimestamp: number,
  endTimestamp: number
): Promise<UsageRow[]> {
  const maxWindowSeconds = 30 * 24 * 60 * 60
  const requests: Array<Promise<UsageRow[]>> = []
  let windowStart = startTimestamp

  while (windowStart <= endTimestamp) {
    const windowEnd = Math.min(
      windowStart + maxWindowSeconds,
      endTimestamp
    )
    requests.push(getUsageRows(windowStart, windowEnd))
    windowStart = windowEnd + 1
  }

  return (await Promise.all(requests)).flat()
}

export async function loadOverview(): Promise<OverviewSnapshot> {
  const endTimestamp = Math.floor(Date.now() / 1000)
  const startTimestamp =
    endTimestamp - runtimeConfig.usageWindowDays * 24 * 60 * 60
  const activityStartTimestamp =
    endTimestamp - runtimeConfig.activityWindowDays * 24 * 60 * 60

  const [status, user, subscriptionData, plans] = await Promise.all([
    getStatus(),
    getSelf(),
    getSubscriptions(),
    getPlans(),
  ])

  const dataExportEnabled = status.enable_data_export === true
  const activityRows = dataExportEnabled
    ? await getUsageRowsForPeriod(activityStartTimestamp, endTimestamp)
    : []
  const usageRows = activityRows.filter(
    (row) => !row.created_at || row.created_at >= startTimestamp
  )

  return {
    user,
    subscriptions: buildSubscriptionViews(
      subscriptionData.subscriptions || [],
      plans
    ),
    usage: dataExportEnabled ? computeUsageSummary(usageRows) : null,
    tokenActivity: dataExportEnabled
      ? aggregateTokenActivity(activityRows)
      : [],
    dataExportEnabled,
    usageWindowDays: runtimeConfig.usageWindowDays,
  }
}

async function getPricingCatalog(): Promise<PricingModel[]> {
  const envelope = await transport<PricingModel[]>('/api/pricing')
  const pricing = unwrap(envelope)
  const vendors =
    (
      envelope as typeof envelope & {
        vendors?: PricingVendor[]
      }
    ).vendors || []
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]))
  const vendorIconById = new Map(
    vendors.map((vendor) => [vendor.id, vendor.icon])
  )

  return pricing.map((model) => ({
    ...model,
    vendor_name:
      model.vendor_name ||
      (model.vendor_id ? vendorById.get(model.vendor_id) : undefined),
    vendor_icon:
      model.vendor_icon ||
      (model.vendor_id ? vendorIconById.get(model.vendor_id) : undefined),
  }))
}

function toAvailableModel(
  name: string,
  price?: PricingModel
): AvailableModel {
  const vendor = price?.vendor_name || '其他'
  return {
    name,
    vendor,
    iconPath: resolveModelIconPath(
      price?.icon,
      price?.vendor_icon,
      name,
      vendor
    ),
    description: price?.description || '',
    quotaType: price?.quota_type ?? null,
    modelRatio: price?.model_ratio ?? null,
    completionRatio: price?.completion_ratio ?? null,
    modelPrice: price?.model_price ?? null,
    contextLength: price?.context_length,
    tags: price?.tags
      ? price.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
  }
}

export async function getPublicModels(): Promise<AvailableModel[]> {
  const pricing = await getPricingCatalog()
  return pricing
    .map((model) => toAvailableModel(model.model_name, model))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
}

export async function getAvailableModels(): Promise<AvailableModel[]> {
  const pricing = await getPricingCatalog()
  const modelNames = await apiRequest<string[]>('/api/user/models')

  const priceByName = new Map(pricing.map((model) => [model.model_name, model]))
  return modelNames
    .map((name) => toAvailableModel(name, priceByName.get(name)))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
}

export async function getApiKeys(): Promise<PaginatedData<ApiKey>> {
  return apiRequest<PaginatedData<ApiKey>>('/api/token/?p=1&size=20')
}

export async function revealApiKey(id: number): Promise<string> {
  const result = await apiRequest<{ key: string }>(`/api/token/${id}/key`, {
    method: 'POST',
  })
  return result.key
}

export async function createApiKey(data: ApiKeyFormData): Promise<void> {
  await apiRequest('/api/token/', {
    method: 'POST',
    data,
  })
}

export async function toggleApiKey(id: number, status: number): Promise<void> {
  await apiRequest('/api/token/?status_only=true', {
    method: 'PUT',
    data: { id, status },
  })
}

export async function deleteApiKey(id: number): Promise<void> {
  await apiRequest(`/api/token/${id}/`, {
    method: 'DELETE',
  })
}
