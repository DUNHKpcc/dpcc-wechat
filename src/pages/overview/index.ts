import { loadOverview } from '../../services/new-api'
import { ensureAuthenticated } from '../../services/auth'
import type { OverviewSnapshot, TokenActivityPoint } from '../../types/api'
import {
  buildTokenActivityHeatmap,
  type TokenActivityMode,
} from '../../utils/activity'
import { formatDate, formatInteger, formatQuota } from '../../utils/format'
import { calculateQuotaSplit } from '../../utils/metrics'
import { resolveModelIconPath } from '../../utils/model-icons'
import { getHeaderInset } from '../../utils/navigation'
import { ApiError } from '../../services/transport'

interface OverviewDisplay {
  displayName: string
  group: string
  walletQuota: string
  usedQuota: string
  walletUsedPercent: number
  walletRemainingPercent: number
  subscriptionCount: number
  nearestExpiry: string
  subscriptions: Array<{
    id: number
    title: string
    usedQuota: string
    remainingQuota: string
    usedPercent: number
    remainingPercent: number
    expiry: string
  }>
  totalTokens: string
  topModels: Array<{
    rank: string
    name: string
    iconPath: string
    tokens: string
  }>
  requestCount: string
  usageLabel: string
  dataExportEnabled: boolean
}

const emptyDisplay: OverviewDisplay = {
  displayName: '',
  group: '',
  walletQuota: '--',
  usedQuota: '--',
  walletUsedPercent: 0,
  walletRemainingPercent: 100,
  subscriptionCount: 0,
  nearestExpiry: '--',
  subscriptions: [],
  totalTokens: '--',
  topModels: [],
  requestCount: '--',
  usageLabel: '近 30 天',
  dataExportEnabled: true,
}

const activityModes: Array<{ key: TokenActivityMode; label: string }> = [
  { key: 'daily', label: '每日' },
  { key: 'weekly', label: '每周' },
  { key: 'cumulative', label: '累计' },
]

let tokenActivityPoints: TokenActivityPoint[] = []

function toDisplay(snapshot: OverviewSnapshot): OverviewDisplay {
  const firstSubscription = snapshot.subscriptions[0]
  const quotaSplit = calculateQuotaSplit(
    snapshot.user.used_quota,
    snapshot.user.quota
  )
  return {
    displayName: snapshot.user.display_name || snapshot.user.username,
    group: snapshot.user.group,
    walletQuota: formatQuota(snapshot.user.quota),
    usedQuota: formatQuota(snapshot.user.used_quota),
    walletUsedPercent: quotaSplit.usedPercent,
    walletRemainingPercent: quotaSplit.remainingPercent,
    subscriptionCount: snapshot.subscriptions.length,
    nearestExpiry: firstSubscription
      ? formatDate(firstSubscription.endTime)
      : '暂无订阅',
    subscriptions: snapshot.subscriptions.map((subscription) => {
      const used = Math.max(0, subscription.total - subscription.remaining)
      const split = calculateQuotaSplit(used, subscription.remaining)
      return {
        id: subscription.id,
        title: subscription.title,
        usedQuota: formatQuota(used),
        remainingQuota: formatQuota(subscription.remaining),
        usedPercent: split.usedPercent,
        remainingPercent: split.remainingPercent,
        expiry: formatDate(subscription.endTime),
      }
    }),
    totalTokens: snapshot.usage
      ? formatInteger(snapshot.usage.totalTokens)
      : '统计未开启',
    topModels: (snapshot.usage?.topModels || []).map((model, index) => ({
      rank: String(index + 1).padStart(2, '0'),
      name: model.name,
      iconPath: resolveModelIconPath(undefined, undefined, model.name),
      tokens: formatInteger(model.tokens),
    })),
    requestCount: snapshot.usage
      ? formatInteger(snapshot.usage.requestCount)
      : '统计未开启',
    usageLabel: `近 ${snapshot.usageWindowDays} 天`,
    dataExportEnabled: snapshot.dataExportEnabled,
  }
}

Page({
  data: {
    headerInset: getHeaderInset(),
    loading: false,
    guest: true,
    checkingAccess: false,
    refreshing: false,
    errorMessage: '',
    display: emptyDisplay,
    activityModes,
    activityMode: 'daily' as TokenActivityMode,
    activityWeeks: buildTokenActivityHeatmap([], 'daily').weeks,
    activityMonths: buildTokenActivityHeatmap([], 'daily').months,
  },

  onLoad() {
    void this.loadForCurrentSession()
  },

  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 0 })
    if (!this.data.checkingAccess) void this.loadForCurrentSession()
  },

  async loadForCurrentSession() {
    this.setData({ checkingAccess: true })
    const authenticated = await ensureAuthenticated()
    if (!authenticated) {
      this.showGuestState()
      return
    }

    const wasGuest = this.data.guest
    this.setData({ guest: false, checkingAccess: false })
    if (wasGuest) await this.loadData()
  },

  async onPullDownRefresh() {
    if (this.data.guest) {
      wx.stopPullDownRefresh()
      return
    }
    await this.loadData(true)
    wx.stopPullDownRefresh()
  },

  showGuestState() {
    tokenActivityPoints = []
    const activity = buildTokenActivityHeatmap([], 'daily')
    this.setData({
      guest: true,
      checkingAccess: false,
      loading: false,
      refreshing: false,
      errorMessage: '',
      display: emptyDisplay,
      activityMode: 'daily',
      activityWeeks: activity.weeks,
      activityMonths: activity.months,
    })
  },

  async loadData(refreshing = false) {
    this.setData({
      loading: !refreshing,
      refreshing,
      errorMessage: '',
    })
    try {
      const snapshot = await loadOverview()
      tokenActivityPoints = snapshot.tokenActivity
      const activity = buildTokenActivityHeatmap(
        tokenActivityPoints,
        this.data.activityMode
      )
      this.setData({
        display: toDisplay(snapshot),
        activityWeeks: activity.weeks,
        activityMonths: activity.months,
        loading: false,
        refreshing: false,
      })
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        this.showGuestState()
        return
      }
      this.setData({
        loading: false,
        refreshing: false,
        errorMessage:
          error instanceof Error ? error.message : '概览加载失败',
      })
    }
  },

  onRetry() {
    void this.loadForCurrentSession()
  },

  onOpenLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },

  onSelectActivityMode(event: WechatMiniprogram.TouchEvent) {
    const mode = String(event.currentTarget.dataset.mode) as TokenActivityMode
    if (!activityModes.some((item) => item.key === mode)) return
    const activity = buildTokenActivityHeatmap(tokenActivityPoints, mode)
    this.setData({
      activityMode: mode,
      activityWeeks: activity.weeks,
      activityMonths: activity.months,
    })
  },
})
