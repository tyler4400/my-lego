import type { BizError } from './error'
import type { MetaResponse } from './types'
import { tryCatch } from '@my-lego/shared'

export { BizError } from './error'
export type { BizErrorType } from './error'
export { httpBus } from './events'
export type {
  HttpErrorPayload,
  HttpEvents,
  HttpLoadingPayload,
  HttpSuccessPayload,
} from './events'

export { http } from './instance'
export type { HttpClient } from './instance'
export { clearToken, getToken, setToken } from './token'
export type { CraftRequestConfig, MetaResponse, ServiceConfig } from './types'

/**
 * httpTry：http 请求专用的 tryCatch
 * - 将默认 Error 类型收口为 BizError，业务层无需重复标注泛型
 * - 业务 service 推荐用此 helper 包装，调用方直接拿 [data, err] 元组
 *
 * @example
 * ```ts
 * // service 中：
 * export const getMe = () => httpTry(http.get<UserInfoDto>('/user/me'))
 *
 * // 业务调用：
 * const [me, err] = await getMe()
 * if (err) { return }  // err: BizError
 * console.log(me.username)  // me: UserInfoDto
 * ```
 */
export const httpTry = <T>(promise: Promise<T>): Promise<[T, null] | [null, BizError]> => {
  return tryCatch<T, BizError>(promise)
}

/**
 * httpTryRaw：返回 MetaResponse 版本的 tryCatch
 * - 适用于需要 traceId / requestTime 的特殊场景
 */
export const httpTryRaw = <T>(
  promise: Promise<MetaResponse<T>>,
): Promise<[MetaResponse<T>, null] | [null, BizError]> => {
  return tryCatch<MetaResponse<T>, BizError>(promise)
}
