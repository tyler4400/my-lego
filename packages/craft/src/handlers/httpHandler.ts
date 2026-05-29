import { message } from 'ant-design-vue'
import { httpBus } from '@/api/http'
import { useGlobalLoadingStore } from '@/stores/globalLoading'
import { notifyUnauthorized } from '@/utils/biz/notifyUnauthorized.ts'

/**
 * 注册 http 事件订阅
 * - 错误事件：silentError=true 时跳过 UI 反馈（事件仍然 emit）
 * - 401 未授权：始终弹出（不受 silentError 控制），由 notifyUnauthorized 统一接管
 * - 成功事件：默认弹 raw.message 或兜底文案；业务方可通过 silentSuccess=true 抑制
 * - loading 事件：转发到 globalLoading store，驱动顶部 ProgressBar
 *
 * 设计：业务方可自行订阅具体事件覆盖默认行为；http:error 仅在具体事件无人订阅时触发
 */
export const setupHttpHandler = () => {
  httpBus.on('http:bizError', ({ error, config }) => {
    if (config.silentError) return
    message.error(error.message)
  })

  httpBus.on('http:systemError', ({ error, config }) => {
    if (config.silentError) return
    message.error(error.message)
  })

  httpBus.on('http:networkError', ({ error, config }) => {
    if (config.silentError) return
    message.error(error.message || '网络异常，请稍后重试')
  })

  // 401 未授权：不受 silentError 控制，始终弹出（带「去登录」入口）
  httpBus.on('http:unauthorized', ({ error }) => {
    notifyUnauthorized(error.message)
  })

  httpBus.on('http:error', ({ error, config }) => {
    if (config.silentError) return
    message.error(error.message || '请求失败')
  })

  // ====== 成功事件 ======
  // 默认弹后端返回的 message；后端没给 message 时兜底「请求成功」
  // 业务方传 silentSuccess=true 即可关闭（如 GET 列表、轮询接口）
  httpBus.on('http:success', ({ raw, config }) => {
    if (config.silentSuccess) return
    message.success(raw.message || '请求成功')
  })

  // ====== 全局 loading 事件 → 转发到 store ======
  // store 内部用计数器去重，仅在 0→1/→0 时驱动 ProgressBar
  httpBus.on('http:loadingStart', () => {
    useGlobalLoadingStore().start()
  })

  httpBus.on('http:loadingEnd', () => {
    useGlobalLoadingStore().end()
  })
}
