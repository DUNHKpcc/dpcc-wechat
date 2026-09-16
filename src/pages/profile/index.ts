import { ensureAuthenticated, logout } from '../../services/auth'
import { getPlans, getSelf, getSubscriptions } from '../../services/new-api'
import type { UserProfile } from '../../types/api'
import { formatDate, formatQuota } from '../../utils/format'
import { buildSubscriptionViews } from '../../utils/metrics'
import { getHeaderInset } from '../../utils/navigation'
import { ApiError } from '../../services/transport'

Page({
  data: {
    headerInset: getHeaderInset(),
    loading: false,
    guest: true,
    checkingAccess: false,
    refreshing: false,
    errorMessage: '',
    user: null as UserProfile | null,
    displayName: '',
    authIdentity: '',
    logoutMessage: '',
    walletQuota: '--',
    usedQuota: '--',
    subscriptions: [] as Array<{
      id: number
      title: string
      remaining: string
      expiry: string
    }>,
  },

  onLoad() {
    void this.loadForCurrentSession()
  },

  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 3 })
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
    this.setData({
      guest: true,
      checkingAccess: false,
      loading: false,
      refreshing: false,
      errorMessage: '',
      user: null,
      displayName: '',
      authIdentity: '',
      logoutMessage: '',
      walletQuota: '--',
      usedQuota: '--',
      subscriptions: [],
    })
  },

  async loadData(refreshing = false) {
    this.setData({
      loading: !refreshing,
      refreshing,
      errorMessage: '',
    })
    try {
      const [user, subscriptionData, plans] = await Promise.all([
        getSelf(),
        getSubscriptions(),
        getPlans(),
      ])
      const subscriptions = buildSubscriptionViews(
        subscriptionData.subscriptions || [],
        plans
      )
      this.setData({
        loading: false,
        refreshing: false,
        user,
        displayName: user.display_name || user.username,
        authIdentity: user.wechat_id
          ? '微信已绑定'
          : '微信身份已验证',
        logoutMessage: '退出后需要重新使用微信验证身份。',
        walletQuota: formatQuota(user.quota),
        usedQuota: formatQuota(user.used_quota),
        subscriptions: subscriptions.map((subscription) => ({
          id: subscription.id,
          title: subscription.title,
          remaining: formatQuota(subscription.remaining),
          expiry: formatDate(subscription.endTime),
        })),
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
          error instanceof Error ? error.message : '账户信息加载失败',
      })
    }
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: this.data.logoutMessage,
      confirmText: '退出',
      confirmColor: '#b33e3e',
      success: async (result) => {
        if (!result.confirm) return
        await logout()
        this.showGuestState()
        wx.switchTab({ url: '/pages/models/index' })
      },
    })
  },

  onRetry() {
    void this.loadForCurrentSession()
  },

  onOpenLogin() {
    wx.navigateTo({ url: '/pages/login/index' })
  },
})
