import type { BizError, ServiceConfig } from '@/api/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useService } from '@/hooks/useService'

// ---------------------------------------------------------------------------
// 测试辅助
// ---------------------------------------------------------------------------

interface FakeBizError {
  type: string
  message: string
  code?: number
}

/** 构造一个可被外部解析/拒绝的"延迟 service"，便于精确控制时序与竞态 */
const createControllableService = <Data = unknown>() => {
  // 每次 execute 都会创建新的 deferred，按入栈顺序消费
  const pending: Array<{
    resolve: (value: readonly [Data, null] | readonly [null, BizError]) => void
    config: ServiceConfig<any> | undefined
    body: unknown
  }> = []

  const service = vi.fn((body: unknown, config?: ServiceConfig<any>) => {
    return new Promise<readonly [Data, null] | readonly [null, BizError]>((resolve) => {
      pending.push({ resolve, config, body })
    })
  })

  return {
    service,
    /** 解析最早未完成的请求 */
    resolveOldest: (value: readonly [Data, null] | readonly [null, BizError]) => {
      const head = pending.shift()
      if (!head) throw new Error('no pending request to resolve')
      head.resolve(value)
    },
    /** 解析最晚未完成的请求 */
    resolveLatest: (value: readonly [Data, null] | readonly [null, BizError]) => {
      const tail = pending.pop()
      if (!tail) throw new Error('no pending request to resolve')
      tail.resolve(value)
    },
    /** 获取第 N 次调用时实际收到的 config */
    getConfigAt: (callIndex: number): ServiceConfig<any> | undefined => {
      const call = service.mock.calls[callIndex]
      return call?.[1] as ServiceConfig<any> | undefined
    },
    pendingCount: () => pending.length,
  }
}

const makeError = (overrides: Partial<FakeBizError> = {}): BizError => {
  return {
    type: 'biz',
    message: 'fake error',
    code: 1,
    ...overrides,
  } as unknown as BizError
}

describe('useService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // 基础：loading / data / error 三个 ref 的响应式行为
  // -------------------------------------------------------------------------
  describe('基础响应式状态', () => {
    it('初始 loading=false, data=null, error=null', () => {
      const { service } = createControllableService<{ ok: true }>()
      const [, loading, data, error] = useService(service)

      expect(loading.value).toBe(false)
      expect(data.value).toBeNull()
      expect(error.value).toBeNull()
    })

    it('execute 期间 loading=true；成功后 loading=false 且 data 被设置', async () => {
      const harness = createControllableService<{ id: number }>()
      const [execute, loading, data, error] = useService(harness.service)

      const promise = execute({ q: 'foo' })
      // 微任务尚未让出之前 loading 已经 true
      expect(loading.value).toBe(true)

      harness.resolveOldest([{ id: 42 }, null])
      await promise

      expect(loading.value).toBe(false)
      expect(data.value).toEqual({ id: 42 })
      expect(error.value).toBeNull()
    })

    it('execute 失败后 error 被设置，data 保持原值', async () => {
      const harness = createControllableService<{ id: number }>()
      const [execute, loading, data, error] = useService(harness.service)

      const promise = execute({ q: 'foo' })
      const err = makeError({ message: 'oops' })
      harness.resolveOldest([null, err])
      await promise

      expect(loading.value).toBe(false)
      expect(error.value).toBe(err)
      expect(data.value).toBeNull()
    })

    it('两次连续 execute：第一次失败 → 第二次成功，data 应被覆盖、error 应被清空', async () => {
      const harness = createControllableService<{ id: number }>()
      const [execute, , data, error] = useService(harness.service)

      // 第一次失败
      const p1 = execute({})
      harness.resolveOldest([null, makeError()])
      await p1
      expect(error.value).not.toBeNull()
      expect(data.value).toBeNull()

      // 第二次成功 → 应清空 error 并写入 data
      const p2 = execute({})
      harness.resolveOldest([{ id: 7 }, null])
      await p2
      expect(error.value).toBeNull()
      expect(data.value).toEqual({ id: 7 })
    })
  })

  // -------------------------------------------------------------------------
  // AbortController：连续 execute 会取消上一次未完成的请求
  // -------------------------------------------------------------------------
  describe('abortController 取消', () => {
    it('连续 execute 时，前一次的 AbortSignal 被 abort', async () => {
      const harness = createControllableService<{ id: number }>()
      const { execute } = useService(harness.service)

      execute({ q: 1 })
      const firstSignal = harness.getConfigAt(0)?.signal as AbortSignal
      expect(firstSignal.aborted).toBe(false)

      // 第二次 execute 触发取消
      execute({ q: 2 })

      expect(firstSignal.aborted).toBe(true)
      // 第二次 signal 是新创建的，未被 abort
      const secondSignal = harness.getConfigAt(1)?.signal as AbortSignal
      expect(secondSignal.aborted).toBe(false)
    })

    it('abort() 取消当前 in-flight 请求并立即重置 loading', async () => {
      const harness = createControllableService<{ id: number }>()
      const { loading, execute, abort } = useService(harness.service)

      execute({})
      expect(loading.value).toBe(true)

      const signal = harness.getConfigAt(0)?.signal as AbortSignal
      abort()

      expect(loading.value).toBe(false)
      expect(signal.aborted).toBe(true)
    })

    it('abort() 后再次 execute 仍然正常工作', async () => {
      const harness = createControllableService<{ id: number }>()
      const { loading, data, execute, abort } = useService(harness.service)

      execute({})
      abort()

      // 重新发起请求；解析"最新"的 pending（第二次 execute 创建的）
      const p = execute({})
      expect(loading.value).toBe(true)
      harness.resolveLatest([{ id: 99 }, null])
      await p

      expect(loading.value).toBe(false)
      expect(data.value).toEqual({ id: 99 })
    })
  })

  // -------------------------------------------------------------------------
  // 竞态保护：晚到的请求结果不更新 ref（双保险，即便 abort 没生效）
  // -------------------------------------------------------------------------
  describe('竞态保护', () => {
    it('第一次请求晚到，但其结果不会覆盖第二次的结果', async () => {
      const harness = createControllableService<{ id: number }>()
      const [execute, loading, data] = useService(harness.service)

      // 第 1 次：先发起
      execute({ q: 1 })
      // 第 2 次：随即发起，第一次被 abort
      const p2 = execute({ q: 2 })

      // 先解析第二次（最新），再解析第一次（晚到）
      harness.resolveLatest([{ id: 222 }, null])
      await p2
      expect(data.value).toEqual({ id: 222 })

      // 第一次晚到，结果应被丢弃（requestId 不匹配）
      harness.resolveOldest([{ id: 111 }, null])
      await Promise.resolve()

      expect(data.value).toEqual({ id: 222 })
      expect(loading.value).toBe(false)
    })

    it('abort() 后晚到的结果不会更新 ref', async () => {
      const harness = createControllableService<{ id: number }>()
      // abort 仅存在于对象属性上（数组返回前 4 项是 execute/loading/data/error）
      const { data, error, execute, abort } = useService(harness.service)

      execute({})
      abort()
      // 网络层晚到的请求即使返回了，也不应更新 ref
      harness.resolveOldest([{ id: 100 }, null])
      await Promise.resolve()

      expect(data.value).toBeNull()
      expect(error.value).toBeNull()
    })
  })

  // -------------------------------------------------------------------------
  // options.config：被 merge 到 service 调用；signal 字段被强制覆盖
  // -------------------------------------------------------------------------
  describe('options.config 合并', () => {
    it('options.config 被 merge 到 service 收到的 config', () => {
      const harness = createControllableService()
      const { execute } = useService(harness.service, {
        config: { silentToast: true, silentLoading: true } as any,
      })

      execute({ q: 1 })

      const config = harness.getConfigAt(0)
      expect(config?.silentToast).toBe(true)
      expect(config?.silentLoading).toBe(true)
      expect(config?.signal).toBeInstanceOf(AbortSignal)
    })

    it('options.config 中的 signal 字段被 useService 内部 AbortSignal 强制覆盖', () => {
      const externalAc = new AbortController()
      const harness = createControllableService()
      const { execute } = useService(harness.service, {
        // 业务方误传 signal（TS 编译会报错，这里用 as any 模拟运行时）
        config: { signal: externalAc.signal } as any,
      })

      execute({ q: 1 })
      const config = harness.getConfigAt(0)
      const usedSignal = config?.signal as AbortSignal

      // signal 应该是 useService 创建的 AbortController.signal，不等于业务方传入的
      expect(usedSignal).not.toBe(externalAc.signal)
      expect(usedSignal).toBeInstanceOf(AbortSignal)
    })

    it('未配置 options.config 时 service 收到的 config 仅含 signal', () => {
      const harness = createControllableService()
      const { execute } = useService(harness.service)

      execute({ q: 1 })

      const config = harness.getConfigAt(0)
      expect(Object.keys(config ?? {})).toEqual(['signal'])
      expect(config?.signal).toBeInstanceOf(AbortSignal)
    })
  })

  // -------------------------------------------------------------------------
  // 返回值结构：数组 + 对象双重身份
  // -------------------------------------------------------------------------
  describe('数组 + 对象双重返回值', () => {
    it('数组解构与对象解构指向同一份 ref / 同一份 execute', () => {
      const harness = createControllableService()
      const result = useService(harness.service)

      const [executeArr, loadingArr, dataArr, errorArr] = result
      const { loading, data, error, execute, abort } = result

      expect(execute).toBe(executeArr)
      expect(loading).toBe(loadingArr)
      expect(data).toBe(dataArr)
      expect(error).toBe(errorArr)
      expect(typeof abort).toBe('function')
    })
  })
})
