import { runtimeConfig } from '../config/runtime'
import { LEGAL_DOCUMENT_VERSION } from '../constants/legal'
import type { BffAuthData } from '../types/api'
import {
  clearAllSession,
  getAccessExpiresAt,
  getAccessToken,
  getInstallationId,
  getMiniSession,
  setAccessSession,
  setMiniSession,
} from './session'
import { transport, unwrap } from './transport'

let resumeTask: Promise<boolean> | null = null

function getWxLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.login({
      success(result) {
        if (result.code) {
          resolve(result.code)
          return
        }
        reject(new Error('微信登录凭证获取失败'))
      },
      fail(error) {
        reject(new Error(error.errMsg || '微信登录失败'))
      },
    })
  })
}

function applyAuthData(data: BffAuthData): void {
  setMiniSession(data.mini_session_token)
  setAccessSession(data.access_token, data.access_expires_at, data.user.id)
}

export async function loginWithWechat(
  consent: {
    userAgreement: boolean
    privacyPolicy: boolean
  }
): Promise<BffAuthData> {
  if (!consent.userAgreement || !consent.privacyPolicy) {
    throw new Error('请先阅读并同意用户服务协议与隐私政策')
  }
  const code = await getWxLoginCode()
  const envelope = await transport<BffAuthData>('/mini/v1/auth/login', {
    target: 'bff',
    method: 'POST',
    data: {
      code,
      installation_id: getInstallationId(),
      legal_consent: {
        user_agreement: consent.userAgreement,
        privacy_policy: consent.privacyPolicy,
        user_agreement_version: LEGAL_DOCUMENT_VERSION,
        privacy_policy_version: LEGAL_DOCUMENT_VERSION,
      },
    },
  })
  const data = unwrap(envelope)
  applyAuthData(data)
  return data
}

async function runResume(): Promise<boolean> {
  const miniSession = getMiniSession()
  if (!miniSession) return false

  try {
    const envelope = await transport<BffAuthData>('/mini/v1/auth/resume', {
      target: 'bff',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${miniSession}`,
      },
    })
    applyAuthData(unwrap(envelope))
    return true
  } catch {
    clearAllSession()
    return false
  }
}

export function resumeSession(): Promise<boolean> {
  if (resumeTask) return resumeTask
  resumeTask = runResume().finally(() => {
    resumeTask = null
  })
  return resumeTask
}

export function ensureAuthenticated(): Promise<boolean> {
  const expiresAt = getAccessExpiresAt()
  if (
    getAccessToken() &&
    (!expiresAt || expiresAt > Math.floor(Date.now() / 1000) + 30)
  ) {
    return Promise.resolve(true)
  }
  return resumeSession()
}

export async function logout(): Promise<void> {
  const miniSession = getMiniSession()

  if (miniSession) {
    try {
      await transport('/mini/v1/auth/logout', {
        target: 'bff',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${miniSession}`,
        },
      })
    } catch {
      // Local revocation still takes priority when the upstream is unavailable.
    }
  }

  clearAllSession()
}
