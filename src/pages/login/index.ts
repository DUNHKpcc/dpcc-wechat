import { ensureAuthenticated, loginWithWechat } from '../../services/auth'
import { getHeaderInset } from '../../utils/navigation'

Page({
  data: {
    headerInset: getHeaderInset(),
    loading: true,
    submitting: false,
    agreed: false,
    errorMessage: '',
  },

  async onLoad() {
    const restored = await ensureAuthenticated()
    if (restored) {
      wx.switchTab({ url: '/pages/overview/index' })
      return
    }
    this.setData({ loading: false })
  },

  onToggleConsent() {
    this.setData({ agreed: !this.data.agreed, errorMessage: '' })
  },

  onOpenUserAgreement() {
    wx.navigateTo({ url: '/pages/legal/index?type=agreement' })
  },

  onOpenPrivacyPolicy() {
    wx.navigateTo({ url: '/pages/legal/index?type=privacy' })
  },

  onLoginTap() {
    if (!this.data.agreed || this.data.submitting) return
    if (typeof wx.getPrivacySetting !== 'function') {
      void this.submitLogin()
      return
    }
    wx.getPrivacySetting({
      success: (result) => {
        if (!result.needAuthorization) void this.submitLogin()
      },
    })
  },

  onAgreePrivacyAuthorization() {
    if (!this.data.agreed || this.data.submitting) return
    void this.submitLogin()
  },

  async submitLogin() {
    if (!this.data.agreed || this.data.submitting) return
    this.setData({ submitting: true, errorMessage: '' })
    try {
      await loginWithWechat({
        userAgreement: true,
        privacyPolicy: true,
      })
      wx.switchTab({ url: '/pages/overview/index' })
    } catch (error) {
      this.setData({
        submitting: false,
        errorMessage:
          error instanceof Error ? error.message : '登录失败，请稍后重试',
      })
    }
  },
})
