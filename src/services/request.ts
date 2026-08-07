import type { ApiEnvelope } from '../types/api'
import { resumeSession } from './auth'
import { clearAllSession, getAccessToken } from './session'
import { ApiError, transport, unwrap } from './transport'

interface RequestOptions {
  method?: WechatMiniprogram.RequestOption['method']
  data?: WechatMiniprogram.RequestOption['data']
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  hasRetried = false
): Promise<T> {
  const token = getAccessToken()
  if (!token) {
    const restored = await resumeSession()
    if (!restored) {
      throw new ApiError('登录状态已失效', 401, 'AUTH_UNAUTHORIZED')
    }
  }

  const requestToken = getAccessToken()
  try {
    const envelope: ApiEnvelope<T> = await transport<T>(path, {
      ...options,
      headers: {
        Authorization: `Bearer ${requestToken}`,
      },
    })
    return unwrap(envelope)
  } catch (error) {
    if (
      error instanceof ApiError &&
      error.statusCode === 401 &&
      error.code === 'AUTH_TOKEN_EXPIRED' &&
      !hasRetried
    ) {
      if (getAccessToken() && getAccessToken() !== requestToken) {
        return apiRequest<T>(path, options, true)
      }
      const restored = await resumeSession()
      if (restored) return apiRequest<T>(path, options, true)
      clearAllSession()
    }

    if (
      error instanceof ApiError &&
      error.statusCode === 401 &&
      ['AUTH_SESSION_REVOKED', 'AUTH_UNAUTHORIZED'].includes(error.code)
    ) {
      clearAllSession()
    }
    throw error
  }
}
