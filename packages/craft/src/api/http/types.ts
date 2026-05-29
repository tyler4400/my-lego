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
export interface MetaResponse<Data> {
  code: number
  data: Data
  message: string
  version: string
  traceId: string
  requestTime: number
  protocol: MetaProtocol
  ip?: string
}

/**
 * 扩展 axios 的请求配置
 * - silentError：抑制错误类自动 toast（bizError / systemError / networkError / 兜底 error）；
 *   事件依然会发出，业务方可自行订阅处理。注意：不影响 401 未授权通知（http:unauthorized 始终弹出）
 * - silentSuccess：抑制成功 toast，事件依然会发出
 * - silentLoading：抑制全局 loading 进度条
 * - returnRaw：返回完整 MetaResponse 而非 data（用于需要 traceId / requestTime 的场景）
 *
 * 命名约定：所有 silentXxx 都是「抑制 / opt-out」语义，默认 false（即默认走全局），
 * 业务侧只在需要"自定义反馈 UI / 后台静默请求"时才设为 true。
 */
export interface CraftRequestConfig<RequestBody = unknown> extends AxiosRequestConfig<RequestBody> {
  silentError?: boolean
  silentSuccess?: boolean
  silentLoading?: boolean
  returnRaw?: boolean
}

/**
 * service 函数对外暴露的 config 类型
 * - 比 CraftRequestConfig 收窄：去掉 returnRaw（service 自己决定返回 data 还是 MetaResponse，业务方不应控制）
 * - 业务方可传 silentError / silentSuccess / silentLoading / signal / timeout 等
 * - useService 内部会通过此类型注入 AbortSignal
 */
export type ServiceConfig<RequestBody = unknown> = Omit<CraftRequestConfig<RequestBody>, 'returnRaw'>
