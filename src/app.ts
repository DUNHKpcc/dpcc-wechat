import { ensureAuthenticated } from './services/auth'
import { clearAccessToken } from './services/session'

App({
  onShow() {
    // 只恢复已有会话，不为游客发起登录或个人信息授权。
    void ensureAuthenticated()
  },

  onHide() {
    clearAccessToken()
  },
})
