import type { AxiosResponse } from 'axios'
import type { BizError } from './error'
import type { CraftRequestConfig } from './types'
import mitt from 'mitt'

/**
 * 事件载荷：包含错误对象与触发该错误的请求 config（用于读取 silentError 等开关）
 */
export interface HttpErrEventPayload {
  error: BizError
  config: CraftRequestConfig
}

/**
 * 事件载荷：包含错误对象与触发该错误的请求 config（用于读取 silentError 等开关）
 */
export interface HttpSuccessEventPayload {
  res: AxiosResponse
  config: CraftRequestConfig
}

/**
 * http 事件类型表
 * - 具体事件：bizError / systemError / networkError / unauthorized
 * - 兜底事件：error（仅当所有具体事件均无订阅者时才会被触发）
 *
 * 注意：必须用 type alias 而非 interface，
 * 因为 mitt 的泛型约束要求 Record<EventType, unknown>，
 * interface 默认不具备 implicit string index signature，会导致类型不兼容。
 */
// eslint-disable-next-line ts/consistent-type-definitions
export type HttpEvents = {
  'http:bizError': HttpErrEventPayload
  'http:systemError': HttpErrEventPayload
  'http:networkError': HttpErrEventPayload
  'http:unauthorized': HttpErrEventPayload
  'http:error': HttpErrEventPayload
  'http:success': HttpSuccessEventPayload
}

/**
 * 全局 http 事件总线
 * - 拦截器只负责发事件，UI 反馈由订阅方处理（解耦 http 与 UI）
 * - 业务层可自行订阅特定事件做精细化处理
 */
export const httpBus = mitt<HttpEvents>()

/**
 * 智能错误事件发射器
 * - 若具体事件存在订阅者：只发具体事件
 * - 若具体事件无任何订阅者：发 http:error 兜底事件
 *
 * 设计目的：业务层只需选择「订阅具体事件做精细处理」或「订阅 http:error 统一兜底」其一，
 * 不会出现两条订阅链同时触发导致的重复处理。
 */
export const emitHttpError = (
  type: Exclude<keyof HttpEvents, 'http:error'>,
  payload: HttpErrEventPayload,
) => {
  const handlers = httpBus.all.get(type)
  if (handlers && handlers.length > 0) {
    httpBus.emit(type, payload)
    return
  }
  httpBus.emit('http:error', payload)
}
