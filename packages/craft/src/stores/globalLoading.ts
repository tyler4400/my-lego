import type { ProgressBarApi } from '@/components/ProgressBar'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createProgressBar } from '@/components/ProgressBar'

/**
 * 全局 loading store
 *
 * 设计要点：
 * - 用「计数器」而不是 boolean：多个并发请求同时进行时，计数器能正确反映状态，
 *   不会出现「A 请求完成 → loading=false → B 请求还在跑」的提前关闭 bug
 * - 命令式驱动 ProgressBar：仅在 0→1 时 start、→0 时 finish，避免重复触发
 * - lazy 创建 ProgressBar 单例：首次 start 时才挂 DOM，避免 SSR / 模块加载顺序问题
 *
 * 触发方：handlers/httpHandler.ts 订阅 http:loadingStart/End 事件后调 start()/end()
 */

let progressBar: ProgressBarApi | null = null

const getProgressBar = () => {
  if (!progressBar) progressBar = createProgressBar()
  return progressBar
}

export const useGlobalLoadingStore = defineStore('globalLoading', () => {
  const counter = ref(0)

  const isLoading = computed(() => counter.value > 0)

  const start = () => {
    counter.value++
    // 仅在 0→1 时启动进度条；后续并发请求只累加计数器
    if (counter.value === 1) getProgressBar().start()
  }

  const end = () => {
    counter.value = Math.max(0, counter.value - 1)
    // 仅在 →0 时结束进度条
    if (counter.value === 0) getProgressBar().finish()
  }

  return {
    counter,
    isLoading,
    start,
    end,
  }
})
