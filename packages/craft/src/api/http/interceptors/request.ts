import type { InternalAxiosRequestConfig } from 'axios'
import type { CraftRequestConfig } from '../types'
import { v4 as uuidv4 } from 'uuid'
import { AUTHORIZATION_HEADER, TRACE_ID_HEADER } from '../constants'
import { httpBus } from '../events'
import { getToken } from '../token'

/**
 * 请求拦截器
 * - 注入 traceId：每个请求生成唯一 ID，便于配合后端日志做链路追踪
 * - 注入 Authorization：从 token helper 取 JWT，自动拼 Bearer
 * - 发出 http:loadingStart 事件：除非 silentLoading=true，否则触发全局 loading 起点
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

  // 把 InternalAxiosRequestConfig 视为 CraftRequestConfig（业务方传入的自定义字段都挂在 config 上）
  const craftConfig = config as InternalAxiosRequestConfig & CraftRequestConfig
  if (!craftConfig.silentLoading) {
    httpBus.emit('http:loadingStart', { config: craftConfig })
  }

  return config
}
