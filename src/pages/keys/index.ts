import { ensureAuthenticated } from '../../services/auth'
import {
  createApiKey,
  deleteApiKey,
  getApiKeys,
  revealApiKey,
  toggleApiKey,
} from '../../services/new-api'
import type { ApiKey, ApiKeyFormData } from '../../types/api'
import { formatDate, formatQuota, maskKey } from '../../utils/format'
import { getHeaderInset } from '../../utils/navigation'
import { ApiError } from '../../services/transport'

interface KeyDisplay {
  id: number
  name: string
  status: number
  statusLabel: string
  statusClass: string
  quota: string
  expiry: string
  maskedKey: string
}

let sourceKeys: ApiKey[] = []
let revealTimer: ReturnType<typeof setTimeout> | null = null

function toDisplay(key: ApiKey): KeyDisplay {
  const statuses: Record<number, { label: string; className: string }> = {
    1: { label: '启用', className: 'is-active' },
    2: { label: '停用', className: 'is-paused' },
    3: { label: '过期', className: 'is-paused' },
    4: { label: '已耗尽', className: 'is-paused' },
  }
  const status = statuses[key.status] || {
    label: '未知',
    className: 'is-paused',
  }
  return {
    id: key.id,
    name: key.name,
    status: key.status,
    statusLabel: status.label,
    statusClass: status.className,
    quota: key.unlimited_quota ? '不限额度' : `${formatQuota(key.remain_quota)} 剩余`,
    expiry: formatDate(key.expired_time),
    maskedKey: maskKey(key.key),
  }
}

Page({
  data: {
    headerInset: getHeaderInset(),
    loading: false,
    guest: true,
    checkingAccess: false,
    refreshing: false,
    submitting: false,
    errorMessage: '',
    keys: [] as KeyDisplay[],
    total: 0,
    createOpen: false,
    revealOpen: false,
    revealedKey: '',
    revealedName: '',
    formName: '',
    formQuota: '10',
    formUnlimited: false,
  },

  onLoad() {
    void this.loadForCurrentSession()
  },

  onShow() {
    const tabBar = this.getTabBar?.()
    if (tabBar) tabBar.setData({ selected: 2 })
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

  onHide() {
    this.clearRevealedKey()
  },

  onUnload() {
    this.clearRevealedKey()
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
    sourceKeys = []
    this.clearRevealedKey()
    this.setData({
      guest: true,
      checkingAccess: false,
      loading: false,
      refreshing: false,
      errorMessage: '',
      keys: [],
      total: 0,
      createOpen: false,
    })
  },

  async loadData(refreshing = false) {
    this.setData({
      loading: !refreshing,
      refreshing,
      errorMessage: '',
    })
    try {
      const page = await getApiKeys()
      sourceKeys = page.items
      this.setData({
        loading: false,
        refreshing: false,
        total: page.total,
        keys: sourceKeys.map(toDisplay),
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
          error instanceof Error ? error.message : '密钥列表加载失败',
      })
    }
  },

  onOpenCreate() {
    if (this.data.guest) {
      this.onOpenLogin()
      return
    }
    this.setData({
      createOpen: true,
      formName: '',
      formQuota: '10',
      formUnlimited: false,
      errorMessage: '',
    })
  },

  onCloseCreate() {
    if (!this.data.submitting) this.setData({ createOpen: false })
  },

  noop() {},

  onFormName(event: WechatMiniprogram.Input) {
    this.setData({ formName: event.detail.value })
  },

  onFormQuota(event: WechatMiniprogram.Input) {
    this.setData({ formQuota: event.detail.value })
  },

  onToggleUnlimited() {
    this.setData({ formUnlimited: !this.data.formUnlimited })
  },

  async onCreate() {
    const name = this.data.formName.trim()
    const dollars = Number(this.data.formQuota)
    if (!name) {
      this.setData({ errorMessage: '请输入密钥名称' })
      return
    }
    if (!this.data.formUnlimited && (!Number.isFinite(dollars) || dollars <= 0)) {
      this.setData({ errorMessage: '请输入有效额度' })
      return
    }

    const payload: ApiKeyFormData = {
      name,
      remain_quota: this.data.formUnlimited ? 0 : Math.round(dollars * 500_000),
      expired_time: -1,
      unlimited_quota: this.data.formUnlimited,
      model_limits_enabled: false,
      model_limits: '',
      allow_ips: '',
      group: 'default',
      cross_group_retry: false,
    }

    this.setData({ submitting: true, errorMessage: '' })
    try {
      await createApiKey(payload)
      this.setData({ submitting: false, createOpen: false })
      wx.showToast({ title: '密钥已创建', icon: 'success' })
      await this.loadData()
    } catch (error) {
      this.setData({
        submitting: false,
        errorMessage:
          error instanceof Error ? error.message : '创建失败，请稍后重试',
      })
    }
  },

  async onReveal(event: WechatMiniprogram.TouchEvent) {
    const id = Number(event.currentTarget.dataset.id)
    const item = sourceKeys.find((key) => key.id === id)
    if (!item) return
    wx.showLoading({ title: '读取中', mask: true })
    try {
      const key = await revealApiKey(id)
      this.clearRevealedKey()
      this.setData({
        revealOpen: true,
        revealedKey: key,
        revealedName: item.name,
      })
      revealTimer = setTimeout(() => this.clearRevealedKey(), 60_000)
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '读取失败',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
    }
  },

  onCopyKey() {
    if (!this.data.revealedKey) return
    wx.setClipboardData({ data: this.data.revealedKey })
  },

  clearRevealedKey() {
    if (revealTimer) {
      clearTimeout(revealTimer)
      revealTimer = null
    }
    this.setData({
      revealOpen: false,
      revealedKey: '',
      revealedName: '',
    })
  },

  async onToggleStatus(event: WechatMiniprogram.TouchEvent) {
    const id = Number(event.currentTarget.dataset.id)
    const currentStatus = Number(event.currentTarget.dataset.status)
    const nextStatus = currentStatus === 1 ? 2 : 1
    wx.showLoading({ title: '更新中', mask: true })
    try {
      await toggleApiKey(id, nextStatus)
      await this.loadData()
    } catch (error) {
      wx.showToast({
        title: error instanceof Error ? error.message : '更新失败',
        icon: 'none',
      })
    } finally {
      wx.hideLoading()
    }
  },

  onDelete(event: WechatMiniprogram.TouchEvent) {
    const id = Number(event.currentTarget.dataset.id)
    const item = sourceKeys.find((key) => key.id === id)
    if (!item) return
    wx.showModal({
      title: '删除密钥',
      content: `确认删除“${item.name}”？此操作无法撤销。`,
      confirmText: '删除',
      confirmColor: '#b33e3e',
      success: async (result) => {
        if (!result.confirm) return
        try {
          await deleteApiKey(id)
          wx.showToast({ title: '已删除', icon: 'success' })
          await this.loadData()
        } catch (error) {
          wx.showToast({
            title: error instanceof Error ? error.message : '删除失败',
            icon: 'none',
          })
        }
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
