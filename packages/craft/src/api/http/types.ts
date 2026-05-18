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
 * - silent：抑制 UI 错误提示（事件依然会发出，业务层可自行订阅处理）
 * - returnRaw：返回完整 MetaResponse 而非 data（用于需要 traceId / requestTime 的场景）
 */
export interface CraftRequestConfig<D = unknown> extends AxiosRequestConfig<D> {
  silent?: boolean
  returnRaw?: boolean
}
