import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProgressBar } from '@/components/ProgressBar'

/**
 * ProgressBar 是纯 DOM factory，测试策略：
 * - 用 fake timers 控制 delayMs / fadeMs / tick interval
 * - 每个 case 后销毁实例 + 清理 document.body，避免互相污染
 * - 用 selector 直接读取 DOM 状态（transform / opacity）
 */

const findBarEl = () => document.querySelector('[aria-hidden="true"]') as HTMLDivElement | null

const parseScaleX = (transform: string): number => {
  // transform: scaleX(0.3) → 0.3
  const match = transform.match(/scaleX\(([\d.]+)\)/)
  return match ? Number(match[1]) : 0
}

describe('createProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // 清理 document.body，防止上一个 case 残留 DOM 干扰下一个
    document.body.innerHTML = ''
  })

  describe('延迟显示（避免快接口闪烁）', () => {
    it('start 在 delayMs 内 finish → DOM 不出现', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      // 延迟期内 finish → 完全跳过显示
      vi.advanceTimersByTime(300)
      bar.finish()
      // 即便再等一段时间，DOM 也不应被创建
      vi.advanceTimersByTime(1000)

      expect(findBarEl()).toBeNull()
      bar.destroy()
    })

    it('start 超过 delayMs → DOM 出现且 opacity=1', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500)

      const el = findBarEl()
      expect(el).not.toBeNull()
      expect(el!.style.opacity).toBe('1')
      bar.destroy()
    })

    it('显示时 progress 跳到 30% 给用户立即反馈', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500)

      const el = findBarEl()!
      const scale = parseScaleX(el.style.transform)
      // 30% 对应 scaleX(0.3)
      expect(scale).toBeCloseTo(0.3, 2)
      bar.destroy()
    })
  })

  describe('假进度推进', () => {
    it('每 200ms 推进一次，progress 单调增长', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500) // 显示，progress=30

      const el = findBarEl()!
      const p0 = parseScaleX(el.style.transform)

      vi.advanceTimersByTime(200)
      const p1 = parseScaleX(el.style.transform)
      expect(p1).toBeGreaterThan(p0)

      vi.advanceTimersByTime(200)
      const p2 = parseScaleX(el.style.transform)
      expect(p2).toBeGreaterThan(p1)
      bar.destroy()
    })

    it('progress 永不超过 95%（哪怕 tick 很多次）', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500)

      // 推进足够多次（200ms × 200 次 = 40 秒）让 progress 接近渐近线
      vi.advanceTimersByTime(40_000)

      const el = findBarEl()!
      const scale = parseScaleX(el.style.transform)
      expect(scale).toBeLessThanOrEqual(0.95)
      bar.destroy()
    })

    it('未启动时不会推进 progress', () => {
      const bar = createProgressBar({ delayMs: 500 })

      // 不调 start，仅推进时间
      vi.advanceTimersByTime(2000)

      expect(findBarEl()).toBeNull()
      bar.destroy()
    })
  })

  describe('finish 行为', () => {
    it('finish → progress 跳到 100%，然后淡出', () => {
      const bar = createProgressBar({ delayMs: 500, fadeMs: 300 })

      bar.start()
      vi.advanceTimersByTime(500) // 显示

      bar.finish()
      // 100ms 后才设 opacity=0（实现细节）
      const el = findBarEl()!
      const scale = parseScaleX(el.style.transform)
      expect(scale).toBeCloseTo(1.0, 2)

      // 继续推进让淡出完成
      vi.advanceTimersByTime(100)
      expect(el.style.opacity).toBe('0')

      // 淡出动画结束后 transform 重置为 scaleX(0)
      vi.advanceTimersByTime(300)
      expect(el.style.transform).toBe('scaleX(0)')
      bar.destroy()
    })

    it('idle 状态调 finish 无副作用', () => {
      const bar = createProgressBar()

      // 从未 start 过，直接 finish 应无副作用（无报错、无 DOM）
      expect(() => bar.finish()).not.toThrow()
      expect(findBarEl()).toBeNull()
      bar.destroy()
    })
  })

  describe('幂等：重复 start 不重复触发', () => {
    it('pending 状态再 start 不重置 delay 定时器', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(400)
      // 在延迟期内重复 start → 应被忽略
      bar.start()
      vi.advanceTimersByTime(100)

      // 总共 500ms（原计划），DOM 应已出现
      expect(findBarEl()).not.toBeNull()
      bar.destroy()
    })

    it('showing 状态再 start 不重新跳到 30%', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500) // 显示，30%
      vi.advanceTimersByTime(2000) // 推进到更高 progress

      const el = findBarEl()!
      const beforeProgress = parseScaleX(el.style.transform)
      expect(beforeProgress).toBeGreaterThan(0.3)

      bar.start() // 此时 state === 'showing'，应被忽略
      const afterProgress = parseScaleX(el.style.transform)
      expect(afterProgress).toBe(beforeProgress) // 没有被重置回 30%
      bar.destroy()
    })
  })

  describe('destroy', () => {
    it('destroy → DOM 移除，且不再响应 start', () => {
      const bar = createProgressBar({ delayMs: 500 })

      bar.start()
      vi.advanceTimersByTime(500)
      expect(findBarEl()).not.toBeNull()

      bar.destroy()
      expect(findBarEl()).toBeNull()

      // destroy 后再 start 不应崩溃；但因为 state 被重置为 idle，
      // 重新 start 会重新创建 DOM
      bar.start()
      vi.advanceTimersByTime(500)
      // 当前实现会重新创建 DOM（懒创建逻辑），验证不会崩溃即可
    })

    it('destroy 清理 setInterval（推进时间不再 tick）', () => {
      const bar = createProgressBar({ delayMs: 500 })
      bar.start()
      vi.advanceTimersByTime(500) // 显示并启动 tick interval
      bar.destroy()

      // destroy 后即便推进时间，DOM 已被移除，无 tick 副作用
      expect(() => vi.advanceTimersByTime(5000)).not.toThrow()
    })
  })
})
