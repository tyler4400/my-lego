import type { AxiosError } from 'axios'
import type { MetaResponse } from './types'

/**
 * 错误类型分类
 * - biz：HTTP 200 但业务 code !== 0（如用户已存在）
 * - system：HTTP 非 2xx 且服务端返回了结构化错误（401/403/404/500 等）
 * - network：没有 response，纯网络层错误（超时、断网、CORS 等）
 * - unknown：未分类
 */
export type BizErrorType = 'biz' | 'system' | 'network' | 'unknown'

interface BizErrorInit {
  code: number
  message: string
  type: BizErrorType
  data?: unknown
  traceId?: string
  raw?: MetaResponse<unknown>
  axiosError?: AxiosError
}

/**
 * 统一的业务错误对象
 * - 拦截器在识别到错误时统一抛出 BizError，业务层只需 catch BizError 即可
 * - raw 永远挂载（biz / system 错误时为 MetaResponse，便于排查 traceId 等）
 * - axiosError 在 network / system 错误时挂载，便于查看底层 HTTP 细节
 */
export class BizError extends Error {
  readonly code: number
  readonly type: BizErrorType
  readonly data: unknown
  readonly traceId?: string
  readonly raw?: MetaResponse<unknown>
  readonly axiosError?: AxiosError

  constructor(init: BizErrorInit) {
    super(init.message)
    this.name = 'BizError'
    this.code = init.code
    this.type = init.type
    this.data = init.data ?? null
    this.traceId = init.traceId
    this.raw = init.raw
    this.axiosError = init.axiosError
  }
}
