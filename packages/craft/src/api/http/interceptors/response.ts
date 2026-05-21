import type { AxiosError, AxiosResponse } from 'axios'
import type { CraftRequestConfig, MetaResponse } from '../types'
import axios from 'axios'
import { SUCCESS_CODE, UNAUTHORIZED_STATUS } from '../constants'
import { BizError } from '../error'
import { emitHttpError, httpBus } from '../events'

/**
 * 判断响应体是否符合 MetaResponse 结构
 * - 流式下载等特殊接口不符合，需直接返回原始 response
 */
const isMetaResponse = (data: unknown): data is MetaResponse<unknown> => {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return typeof d.code === 'number' && typeof d.message === 'string' && 'data' in d
}

/**
 * 发出 http:loadingEnd 事件（除非配置了 silentLoading）
 * - 在 success / error 所有分支前统一调用，确保计数器配对、零泄漏
 */
const emitLoadingEnd = (config: CraftRequestConfig) => {
  if (!config.silentLoading) {
    httpBus.emit('http:loadingEnd', { config })
  }
}

/**
 * 成功响应拦截器（HTTP 2xx）
 * - 顶部统一发 loadingEnd，确保所有路径都正确结束 loading
 * - 非 MetaResponse：直接返回 axios 原始 response（业务侧自行处理）
 * - 成功（code === 0）：发 http:success 事件，根据 returnRaw 配置返回 MetaResponse 或 data
 * - HTTP 200 但 code !== 0：判定为业务异常，转抛 BizError 并触发 http:bizError 事件
 */
export const responseSuccessInterceptor = (response: AxiosResponse) => {
  const config = response.config as CraftRequestConfig
  emitLoadingEnd(config)

  const raw = response.data

  if (!isMetaResponse(raw)) return response

  if (raw.code === SUCCESS_CODE) {
    httpBus.emit('http:success', { data: raw.data, raw, config })
    return config.returnRaw ? raw : raw.data
  }

  const error = new BizError({
    code: raw.code,
    message: raw.message,
    type: 'biz',
    data: raw.data,
    traceId: raw.traceId,
    raw,
  })
  emitHttpError('http:bizError', { error, config })
  return Promise.reject(error)
}

/**
 * 错误响应拦截器（HTTP 非 2xx / 网络错误 / 请求被取消）
 * - 顶部统一发 loadingEnd（即便是 cancel，也要配对 loadingStart）
 * - axios cancel：静默 reject 一个 type=network 的 BizError，但不 emit 任何错误事件
 *   （由 useService 等调用方主动 abort 触发，无需 UI 反馈）
 * - 无 response（网络/超时/CORS）：抛 BizError(type=network)，触发 http:networkError
 * - HTTP 401：抛 BizError(type=system, code=401)，触发 http:unauthorized
 * - 其他系统错误（403/404/500 等）：抛 BizError(type=system)，触发 http:systemError
 *
 * 错误 message 优先级：后端 MetaResponse.message > axios 默认 message > 兜底文案
 */
export const responseErrorInterceptor = (axiosError: AxiosError<MetaResponse<unknown>>) => {
  const config = (axiosError.config ?? {}) as CraftRequestConfig
  emitLoadingEnd(config)

  // 主动取消的请求：静默 reject，不 emit 任何错误事件
  if (axios.isCancel(axiosError)) {
    return Promise.reject(new BizError({
      code: -1,
      message: axiosError.message || 'canceled',
      type: 'network',
      axiosError,
    }))
  }

  const response = axiosError.response
  const raw = response?.data
  const meta = isMetaResponse(raw) ? raw : null

  if (!response) {
    const error = new BizError({
      code: -1,
      message: axiosError.message || '网络异常，请稍后重试',
      type: 'network',
      axiosError,
    })
    emitHttpError('http:networkError', { error, config })
    return Promise.reject(error)
  }

  if (response.status === UNAUTHORIZED_STATUS) {
    const error = new BizError({
      code: UNAUTHORIZED_STATUS,
      message: meta?.message || '登录已过期，请重新登录',
      type: 'system',
      data: meta?.data,
      traceId: meta?.traceId,
      raw: meta ?? undefined,
      axiosError,
    })
    emitHttpError('http:unauthorized', { error, config })
    return Promise.reject(error)
  }

  const error = new BizError({
    code: meta?.code ?? response.status,
    message: meta?.message || axiosError.message || '请求失败',
    type: 'system',
    data: meta?.data,
    traceId: meta?.traceId,
    raw: meta ?? undefined,
    axiosError,
  })
  emitHttpError('http:systemError', { error, config })
  return Promise.reject(error)
}
