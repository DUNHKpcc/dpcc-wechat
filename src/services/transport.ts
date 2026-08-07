import { runtimeConfig } from '../config/runtime'
import type { ApiEnvelope } from '../types/api'

export class ApiError extends Error {
  statusCode: number
  code: string

  constructor(message: string, statusCode = 0, code = '') {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

interface TransportOptions {
  method?: WechatMiniprogram.RequestOption['method']
  data?: WechatMiniprogram.RequestOption['data']
  headers?: Record<string, string>
  target?: 'newApi' | 'bff'
}

export function transport<T>(
  path: string,
  options: TransportOptions = {}
): Promise<ApiEnvelope<T>> {
  const baseUrl =
    options.target === 'bff'
      ? runtimeConfig.bffBaseUrl
      : runtimeConfig.newApiBaseUrl

  return new Promise((resolve, reject) => {
    wx.request<ApiEnvelope<T>>({
      url: `${baseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout: 15_000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data)
          return
        }

        reject(
          new ApiError(
            response.data?.message || '请求失败，请稍后重试',
            response.statusCode,
            response.data?.code || ''
          )
        )
      },
      fail(error) {
        reject(new ApiError(error.errMsg || '网络连接失败'))
      },
    })
  })
}

export function unwrap<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success || envelope.data === undefined) {
    throw new ApiError(envelope.message || '服务暂时不可用', 200, envelope.code)
  }
  return envelope.data
}
