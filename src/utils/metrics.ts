import type {
  LongestTask,
  SubscriptionPlanRecord,
  SubscriptionView,
  TaskLog,
  UsageRow,
  UsageSummary,
  UserSubscriptionRecord,
} from '../types/api'

export function calculateQuotaSplit(
  usedQuota: number,
  remainingQuota: number
): { usedPercent: number; remainingPercent: number } {
  const used = Math.max(0, Number(usedQuota) || 0)
  const remaining = Math.max(0, Number(remainingQuota) || 0)
  const total = used + remaining
  if (total === 0) {
    return { usedPercent: 0, remainingPercent: 100 }
  }

  const usedPercent = Math.round((used / total) * 100)
  return {
    usedPercent,
    remainingPercent: 100 - usedPercent,
  }
}

export function computeUsageSummary(rows: UsageRow[]): UsageSummary {
  const models = new Map<string, { tokens: number; count: number }>()
  let totalTokens = 0
  let requestCount = 0

  for (const row of rows) {
    const tokens = Math.max(0, Number(row.token_used) || 0)
    const count = Math.max(0, Number(row.count) || 0)
    const modelName = row.model_name?.trim() || '未知模型'
    const current = models.get(modelName) || { tokens: 0, count: 0 }
    current.tokens += tokens
    current.count += count
    models.set(modelName, current)
    totalTokens += tokens
    requestCount += count
  }

  const ranked = [...models.entries()].sort((left, right) => {
    if (right[1].tokens !== left[1].tokens) {
      return right[1].tokens - left[1].tokens
    }
    if (right[1].count !== left[1].count) {
      return right[1].count - left[1].count
    }
    return left[0].localeCompare(right[0], 'en')
  })

  return {
    totalTokens,
    topModels: ranked.slice(0, 3).map(([name, usage]) => ({
      name,
      tokens: usage.tokens,
      requestCount: usage.count,
    })),
    requestCount,
  }
}

export function findLongestTask(
  tasks: TaskLog[],
  total: number,
  maxScanned: number
): LongestTask | null {
  const validTasks = tasks
    .filter(
      (task) =>
        task.status === 'SUCCESS' &&
        task.submit_time > 0 &&
        Number(task.finish_time) > task.submit_time
    )
    .map((task) => ({
      task,
      durationSeconds: Number(task.finish_time) - task.submit_time,
    }))
    .sort((left, right) => right.durationSeconds - left.durationSeconds)

  const longest = validTasks[0]
  if (!longest) return null

  return {
    ...longest,
    scopedLabel:
      total > maxScanned
        ? `最近 ${maxScanned} 个任务中最长`
        : '统计周期内最长',
  }
}

export function buildSubscriptionViews(
  records: UserSubscriptionRecord[],
  planRecords: SubscriptionPlanRecord[]
): SubscriptionView[] {
  const planNames = new Map(
    planRecords.map(({ plan }) => [plan.id, plan.title])
  )

  return records
    .map(({ subscription }) => ({
      id: subscription.id,
      title: planNames.get(subscription.plan_id) || '当前订阅',
      remaining: Math.max(
        0,
        subscription.amount_total - subscription.amount_used
      ),
      total: Math.max(0, subscription.amount_total),
      endTime: subscription.end_time,
      status: subscription.status,
    }))
    .sort((left, right) => left.endTime - right.endTime)
}
