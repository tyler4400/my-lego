/**
 * ProgressBar - 顶部假进度条 factory 函数
 *
 * 设计要点：
 * - 纯 DOM 操作，不依赖任何 UI 框架，因此通用，可独立复用
 * - 命令式 API：start() / finish() / destroy()
 * - 假进度算法：渐近曲线，越接近 95% 越慢；finish 时跳到 100% 然后淡出
 * - 延迟显示：start() 后 delayMs 内若 finish() 则完全不显示，避免快接口闪烁
 *
 * 与 store / 业务逻辑完全解耦，由调用方（如 globalLoading store）命令式驱动
 */

export interface ProgressBarOptions {
  /** 进度条高度（px），默认 2 */
  size?: number
  /** 背景 CSS（支持 gradient），默认紫色单向渐变 */
  background?: string
  /** 阴影 CSS，默认柔和发光 */
  boxShadow?: string
  /** start 到真正显示的延迟时间（ms），默认 500 */
  delayMs?: number
  /** 完成动画时长（ms），默认 300 */
  fadeMs?: number
  /** z-index，默认 9999 */
  zIndex?: number
}

export interface ProgressBarApi {
  /** 启动一次进度（若延迟期内调 finish 则完全不显示） */
  start: () => void
  /** 结束当前进度（跳到 100% 然后淡出） */
  finish: () => void
  /** 销毁实例：移除 DOM、清理定时器 */
  destroy: () => void
}

/**
 * 创建一个 ProgressBar 实例
 * - DOM 自动挂载到 body
 * - 多次 start() 期间只生效一次（内部状态机保证）
 */
export const createProgressBar = (options: ProgressBarOptions = {}): ProgressBarApi => {
  const {
    size = 2,
    background = 'linear-gradient(90deg, #4f46e5 0%, #6366f1 100%)',
    boxShadow = '0 0 8px rgba(99, 102, 241, 0.5)',
    delayMs = 80,
    fadeMs = 300,
    zIndex = 9999,
  } = options

  let el: HTMLDivElement | null = null
  let delayTimer: number | null = null
  let tickTimer: number | null = null
  let progress = 0
  // 状态机：idle（无 loading）/ pending（loading 已 start 但还在延迟期）/ showing（进度条显示中）
  let state: 'idle' | 'pending' | 'showing' = 'idle'

  // 懒创建 DOM：首次 start 真正显示时才插入 body
  const ensureEl = () => {
    if (el) return el
    el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    el.style.cssText = [
      'position:fixed',
      'top:0',
      'left:0',
      `height:${size}px`,
      'width:100%',
      `background:${background}`,
      `box-shadow:${boxShadow}`,
      'transform:scaleX(0)',
      'transform-origin:left',
      `transition:transform ${fadeMs}ms ease, opacity ${fadeMs}ms ease`,
      'pointer-events:none',
      'opacity:0',
      `z-index:${zIndex}`,
      'will-change:transform, opacity',
    ].join(';')
    document.body.appendChild(el)
    return el
  }

  const applyProgress = () => {
    if (!el) return
    el.style.transform = `scaleX(${progress / 100})`
  }

  // 假进度算法：每 200ms 推进一次，越接近 95% 增量越小（永远不超过 95%）
  const tick = () => {
    if (progress >= 95) return
    const remaining = 95 - progress
    progress += Math.max(0.5, remaining * 0.05)
    if (progress > 95) progress = 95
    applyProgress()
  }

  // 真正显示进度条（在 delayMs 之后才会执行到这里）
  const reveal = () => {
    const node = ensureEl()
    node.style.opacity = '1'
    progress = 30 // 跳到 30%：让用户立即看到反馈
    applyProgress()
    tickTimer = window.setInterval(tick, 200)
  }

  // 跳到 100% 然后淡出，结束后重置内部状态
  const conclude = () => {
    if (!el) return
    progress = 100
    applyProgress()
    window.setTimeout(() => {
      if (!el) return
      el.style.opacity = '0'
      // 等淡出动画完成后重置 transform，避免下次 start 时看到 100% 状态
      window.setTimeout(() => {
        if (!el) return
        progress = 0
        el.style.transform = 'scaleX(0)'
      }, fadeMs)
    }, 100)
  }

  const clearTimers = () => {
    if (delayTimer !== null) {
      window.clearTimeout(delayTimer)
      delayTimer = null
    }
    if (tickTimer !== null) {
      window.clearInterval(tickTimer)
      tickTimer = null
    }
  }

  return {
    start: () => {
      // 已经在显示或在延迟期内 → 不重复 start
      if (state !== 'idle') return
      state = 'pending'
      delayTimer = window.setTimeout(() => {
        delayTimer = null
        state = 'showing'
        reveal()
      }, delayMs)
    },

    finish: () => {
      // 延迟期内就结束了 → 完全不显示
      if (state === 'pending') {
        clearTimers()
        state = 'idle'
        return
      }
      if (state !== 'showing') return
      clearTimers()
      state = 'idle'
      conclude()
    },

    destroy: () => {
      clearTimers()
      el?.remove()
      el = null
      state = 'idle'
      progress = 0
    },
  }
}
