import { ensureAuthenticated } from './services/auth'
import { clearAccessToken } from './services/session'

App({
  onShow() {
    void ensureAuthenticated()
  },

  onHide() {
    clearAccessToken()
  },
})
