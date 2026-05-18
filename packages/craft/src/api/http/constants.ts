/**
 * http 封装相关常量
 * - 集中读取 import.meta.env，避免在多处分散使用 env 变量
 */

/** token 在 localStorage 中的存储 key */
export const TOKEN_STORAGE_KEY = 'craft:token'

/** 透传到后端用于链路追踪的请求头名（与 craft-backend MetaContextMiddleware 约定保持一致） */
export const TRACE_ID_HEADER = 'x-trace-id'

/** 鉴权请求头名（JWT Bearer Token） */
export const AUTHORIZATION_HEADER = 'Authorization'

/** 后端 API 基础地址 */
export const API_HOST = import.meta.env.VITE_API_HOST

/** 前端版本号（未配置时为空字符串） */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? ''

/**
 * CSRF cookie / header 名
 * - 后端未集成 CSRF 时 env 为空字符串，这里转 undefined 让 axios 走默认（不会启用 XSRF 逻辑）
 * - 后端集成后，在 .env 中填值即可
 */
export const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME || undefined
export const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME || undefined

/** 默认请求超时时间（毫秒） */
export const DEFAULT_TIMEOUT = 30 * 1000

/** 成功业务码（与 craft-backend MetaResponseInterceptor 中 DEFAULT_SUCCESS_CODE 保持一致） */
export const SUCCESS_CODE = 0

/** 未授权 HTTP 状态码 */
export const UNAUTHORIZED_STATUS = 401
