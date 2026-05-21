import type { Ref, ShallowRef } from 'vue'
import type { BizError, ServiceConfig } from '@/api/http'
import { ref, shallowRef } from 'vue'

/**
 * service 函数的结果元组：[data, null] 表示成功，[null, error] 表示失败
 * - 使用 readonly tuple，兼容上游用 `as const` 返回（如 session store 的 action）以及普通 tryCatch 返回
 */
export type ServiceResult<Data> = readonly [Data, null] | readonly [null, BizError]

/**
 * service 函数约束：最后一个参数必须是可选 config
 * - useService 内部会自动注入 AbortSignal 到这个 config
 * - 业务方 service 形如：(body, config?: ServiceConfig<Body>) => Promise<ServiceResult<T>>
 * - config 类型用 any（TS escape hatch）：不同 service 的 ServiceConfig<Body> 中 Body 类型不一致，
 *   useService 作为通用工具不关心具体 body 类型，用 any 让逆变检查通过。
 */
export type ServiceFn<Data, Args extends any[]> = (
  ...args: [...Args, config?: any]
) => Promise<ServiceResult<Data>>

/**
 * useService 配置项
 */
export interface UseServiceOptions {
  /**
   * 此 hook 内所有 execute 调用共享的 config
   * - 会被 merge 到 service 的 config 参数（与 useService 自动注入的 signal 一起传给 service）
   * - 不能配置 signal：signal 由 useService 内部 AbortController 强制控制
   * - 如需"单次定制 config"：为该场景另开一个 useService 实例（推荐），或者直接调 service 函数
   */
  config?: Omit<ServiceConfig<any>, 'signal'>
}

/**
 * useService 的返回类型：同时具备数组（前 4 项）与对象（含 abort）的双重身份
 * - 数组解构：const [loading, data, error, execute] = useService(...)
 * - 对象解构：const { loading, data, error, execute, abort } = useService(...)
 */
export type UseServiceReturn<Data, Args extends any[]> = readonly [
  Ref<boolean>,
  ShallowRef<Data | null>,
  ShallowRef<BizError | null>,
  (...args: Args) => Promise<ServiceResult<Data>>,
] & {
  loading: Ref<boolean>
  data: ShallowRef<Data | null>
  error: ShallowRef<BizError | null>
  execute: (...args: Args) => Promise<ServiceResult<Data>>
  abort: () => void
}

/**
 * useService - 把 service 函数转成响应式 hook
 *
 * 特性：
 * - 自动管理 loading / data / error 三个 ref，业务方无需自己声明和翻转 loading
 * - 真实 AbortController：execute 会取消上一次 in-flight 请求（通过 axios signal）
 * - 竞态保护（双保险）：requestId 机制确保即使 abort 失效也只接受最新请求的结果
 * - 取消事件不弹 toast（由 axios cancel 拦截器层面静默处理）
 * - options.config：此 hook 内所有调用共享的 config（如 silentToast），signal 字段被 useService 独占
 *   单次特殊化场景请另开一个 useService 实例，或绕过 useService 直接调 service
 * - execute 的参数类型只包含 service 的 body 参数，不含 config（config 由 options 提供）
 * - 返回值同时支持数组与对象解构，按需选用
 *
 * 注意：必须在 setup 顶层调用（因为返回的 ref 需要在模板中使用）。
 * 如需"挂载时立即执行"，直接在 setup 中调一次 execute() 即可。
 *
 * @example 数组解构（推荐：业务相关声明紧挨 handler，可读性高）
 * ```ts
 * const [phoneLoading, , , doPhoneLogin] = useService(sessionStore.loginByCellphone)
 * const handlePhoneLogin = async () => {
 *   await phoneFormRef.value?.validate()
 *   const [, err] = await doPhoneLogin(phoneForm)
 *   if (err) return
 *   redirectAfterLogin()
 * }
 * ```
 *
 * @example 配置默认 config（如某接口全程静默）
 * ```ts
 * const [, , , doFetchList] = useService(api.fetchList, {
 *   config: { silentToast: true },
 * })
 * doFetchList(query)  // 所有调用都不会弹 toast
 * ```
 *
 * @example 对象解构（需要访问 abort 时）
 * ```ts
 * const { loading, data, abort } = useService(api.fetchList)
 * onUnmounted(() => abort())
 * ```
 *
 * @example 立即执行
 * ```ts
 * const [loading, userInfo, , doFetchMe] = useService(api.getMe)
 * doFetchMe()  // setup 中直接调用即可
 * ```
 */
export const useService = <Data, Args extends any[]>(
  service: ServiceFn<Data, Args>,
  options: UseServiceOptions = {},
): UseServiceReturn<Data, Args> => {
  const loading = ref(false)
  const data = shallowRef<Data | null>(null)
  const error = shallowRef<BizError | null>(null)

  // 竞态保护：每次 execute 自增；只有最新请求的结果会被采纳
  let currentRequestId = 0
  // 当前 in-flight 请求的 abort controller，用于取消上一次
  let currentAbortController: AbortController | null = null

  const execute = async (...args: Args): Promise<ServiceResult<Data>> => {
    // 取消上一次未完成的请求（避免资源浪费）
    if (currentAbortController) currentAbortController.abort()

    const ac = new AbortController()
    currentAbortController = ac
    const requestId = ++currentRequestId

    loading.value = true

    // merge options.config 与 useService 注入的 signal
    // signal 字段一定由 useService 独占（覆盖 options.config 中可能误传的 signal）
    const finalConfig = {
      ...options.config,
      signal: ac.signal,
    }

    const result = await (service as (...rest: unknown[]) => Promise<ServiceResult<Data>>)(
      ...args,
      finalConfig,
    )

    // 竞态保护：只有最后一次 execute 的结果会更新 ref
    if (requestId !== currentRequestId) return result

    const [d, e] = result
    data.value = d
    error.value = e
    loading.value = false
    currentAbortController = null
    return result
  }

  /**
   * 主动取消当前 in-flight 请求
   * - 真实取消网络请求（axios 通过 signal 接收）
   * - 取消触发的 reject 会被拦截器静默处理，不弹 toast
   * - 立即重置 loading，业务方可放心使用
   */
  const abort = () => {
    if (currentAbortController) {
      currentAbortController.abort()
      currentAbortController = null
    }
    // 自增 requestId：即使 in-flight 请求最终返回，也不会被采纳
    currentRequestId++
    loading.value = false
  }

  const tuple = [loading, data, error, execute] as const
  return Object.assign(tuple, {
    loading,
    data,
    error,
    execute,
    abort,
  }) as UseServiceReturn<Data, Args>
}
