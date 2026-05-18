import type { InternalAxiosRequestConfig } from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { AUTHORIZATION_HEADER, TRACE_ID_HEADER } from '../constants'
import { getToken } from '../token'

/**
 * 请求拦截器
 * - 注入 traceId：每个请求生成唯一 ID，便于配合后端日志做链路追踪
 * - 注入 Authorization：从 token helper 取 JWT，自动拼 Bearer
 *
 * 已显式设置的同名 header 会被尊重（不会覆盖业务方手动传入的值）
 */
export const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  if (!config.headers.has(TRACE_ID_HEADER)) {
    config.headers.set(TRACE_ID_HEADER, uuidv4())
  }

  const token = getToken()
  if (token && !config.headers.has(AUTHORIZATION_HEADER)) {
    config.headers.set(AUTHORIZATION_HEADER, `Bearer ${token}`)
  }

  return config
}
