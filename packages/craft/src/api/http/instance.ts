import type { AxiosInstance } from 'axios'
import type { CraftRequestConfig, MetaResponse } from './types'
import axios from 'axios'
import {
  API_HOST,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  DEFAULT_TIMEOUT,
} from './constants'
import { requestInterceptor } from './interceptors/request'
import {
  responseErrorInterceptor,
  responseSuccessInterceptor,
} from './interceptors/response'

/**
 * 底层 axios 实例
 * - 后端走 JWT Bearer，故 withCredentials = false，不带 cookie
 * - xsrfCookieName / xsrfHeaderName 在 env 未配置时为 undefined（axios 默认行为，不影响 JWT）
 *   后端集成 CSRF 后只需在 .env 中填值即可启用
 */
const axiosInstance = axios.create({
  baseURL: API_HOST,
  timeout: DEFAULT_TIMEOUT,
  withCredentials: false,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: CSRF_HEADER_NAME,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

axiosInstance.interceptors.request.use(requestInterceptor)

/**
 * 注意：成功拦截器内部已展开返回 data 或 MetaResponse，
 * 实际返回类型不再是 AxiosResponse；用 Parameters<...>[0] 强制匹配 axios 期望的回调签名
 * 对外类型由下方 HttpClient 函数重载保证。
 */
type ResponseFulfilledFn = Parameters<typeof axiosInstance.interceptors.response.use>[0]

axiosInstance.interceptors.response.use(responseSuccessInterceptor as ResponseFulfilledFn, responseErrorInterceptor)

/** 复用的"返回业务 data"请求配置类型 */
type ConfigForData<D = unknown> = CraftRequestConfig<D> & { returnRaw?: false }
/** 复用的"返回 MetaResponse"请求配置类型 */
type ConfigForRaw<D = unknown> = CraftRequestConfig<D> & { returnRaw: true }

/**
 * HttpClient 接口
 * - 通过函数重载让 returnRaw 决定返回类型：
 *   - 默认 / returnRaw=false：返回 T（业务数据）
 *   - returnRaw=true：返回 MetaResponse<T>（含 traceId / requestTime 等）
 * - raw：暴露底层 axios 实例，用于流式下载等特殊场景（绕过 MetaResponse 解析）
 */
export interface HttpClient {
  get: {
    <T>(url: string, config?: ConfigForData): Promise<T>
    <T>(url: string, config: ConfigForRaw): Promise<MetaResponse<T>>
  }
  delete: {
    <T>(url: string, config?: ConfigForData): Promise<T>
    <T>(url: string, config: ConfigForRaw): Promise<MetaResponse<T>>
  }
  post: {
    <T, D = unknown>(url: string, data?: D, config?: ConfigForData<D>): Promise<T>
    <T, D = unknown>(url: string, data: D, config: ConfigForRaw<D>): Promise<MetaResponse<T>>
  }
  put: {
    <T, D = unknown>(url: string, data?: D, config?: ConfigForData<D>): Promise<T>
    <T, D = unknown>(url: string, data: D, config: ConfigForRaw<D>): Promise<MetaResponse<T>>
  }
  patch: {
    <T, D = unknown>(url: string, data?: D, config?: ConfigForData<D>): Promise<T>
    <T, D = unknown>(url: string, data: D, config: ConfigForRaw<D>): Promise<MetaResponse<T>>
  }
  raw: AxiosInstance
}

/**
 * 全局 http 客户端
 * - 业务侧统一通过此对象发起请求，不要直接 import axios
 */
export const http: HttpClient = {
  get: (url: string, config?: CraftRequestConfig) => axiosInstance.get(url, config) as Promise<unknown>,
  delete: (url: string, config?: CraftRequestConfig) => axiosInstance.delete(url, config) as Promise<unknown>,
  post: (url: string, data?: unknown, config?: CraftRequestConfig) => axiosInstance.post(url, data, config) as Promise<unknown>,
  put: (url: string, data?: unknown, config?: CraftRequestConfig) => axiosInstance.put(url, data, config) as Promise<unknown>,
  patch: (url: string, data?: unknown, config?: CraftRequestConfig) => axiosInstance.patch(url, data, config) as Promise<unknown>,
  raw: axiosInstance,
} as HttpClient
