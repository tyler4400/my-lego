import type { AxiosRequestConfig } from 'axios'

/**
 * 后端协议字段（与 craft-backend meta.types.ts 中 MetaProtocol 保持一致）
 */
export type MetaProtocol = 'default'

/**
 * 后端统一响应结构
 * - 与 craft-backend MetaResponse 一一对应
 * - 成功时 code === 0，业务异常时 code 为 errno（如 101003），系统异常时 code 为 HTTP status
 */
export interface MetaResponse<T> {
  code: number
  data: T
  message: string
  version: string
  traceId: string
  requestTime: number
  protocol: MetaProtocol
  ip?: string
}

/**
 * 扩展 axios 的请求配置
 * - silentError：抑制全局错误 toast（事件依然会发出，业务方可自行订阅处理）
 * - silentSuccess：抑制全局成功 toast（占位字段，等接入全局成功提示拦截后启用）
 * - silentLoading：抑制全局 loading（占位字段，等接入全局 loading 进度条后启用）
 * - returnRaw：返回完整 MetaResponse 而非 data（用于需要 traceId / requestTime 的场景）
 *
 * 命名约定：所有 silentXxx 都是「抑制 / opt-out」语义，默认 false（即默认走全局），
 * 业务侧只在需要"自定义反馈 UI / 后台静默请求"时才设为 true。
 */
export interface CraftRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  silentError?: boolean
  silentSuccess?: boolean
  silentLoading?: boolean
  returnRaw?: boolean
}
