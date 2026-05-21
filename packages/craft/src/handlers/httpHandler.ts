import { Button, message, notification } from 'ant-design-vue'
import { h } from 'vue'
import { httpBus } from '@/api/http'
import router from '@/router'
import { useGlobalLoadingStore } from '@/stores/globalLoading'
import { useSessionStore } from '../stores/session'

/**
 * 401 notification 的固定 key，用于：
 * - 防止并发 401 弹出多个 notification
 * - 用户点击「去登录」或「关闭」时按 key 精准销毁
 */
const UNAUTHORIZED_MESSAGE_KEY = 'http-unauthorized'

/**
 * 跳转登录页，并带上当前路径用于登录成功后回跳
 * - 若当前路由已经是 login，不重复跳转，避免出现 /login?redirect=/login?redirect=/foo 的嵌套
 * - vue-router 的 query 对象会自动 URL encode/decode，无需手动 encodeURIComponent
 */
const handleGoLogin = () => {
  notification.close(UNAUTHORIZED_MESSAGE_KEY)
  useSessionStore().logout()

  const current = router.currentRoute.value
  if (current.name === 'login') return

  router.push({
    name: 'login',
    query: { redirect: current.fullPath },
  })
}

/**
 * 注册 http 事件订阅
 * - 错误事件：silentToast=true 时跳过 UI 反馈（事件仍然 emit）
 * - 成功事件：默认弹 raw.message 或兜底文案；业务方可通过 silentToast=true 抑制
 * - loading 事件：转发到 globalLoading store，驱动顶部 ProgressBar
 *
 * 设计：业务方可自行订阅具体事件覆盖默认行为；http:error 仅在具体事件无人订阅时触发
 */
export const setupHttpHandler = () => {
  httpBus.on('http:bizError', ({ error, config }) => {
    if (config.silentToast) return
    message.error(error.message)
  })

  httpBus.on('http:systemError', ({ error, config }) => {
    if (config.silentToast) return
    message.error(error.message)
  })

  httpBus.on('http:networkError', ({ error, config }) => {
    if (config.silentToast) return
    message.error(error.message || '网络异常，请稍后重试')
  })

  httpBus.on('http:unauthorized', ({ error, config }) => {
    if (config.silentToast) return
    // duration=0：不自动消失，等待用户手动操作；key：防止并发 401 弹多个
    notification.error({
      key: UNAUTHORIZED_MESSAGE_KEY,
      message: '登录已过期',
      description: error.message,
      duration: 5,
      btn: h(
        Button,
        {
          type: 'text',
          danger: true,
          size: 'small',
          onClick: handleGoLogin,
        },
        { default: () => '去登录' },
      ),
    })
  })

  httpBus.on('http:error', ({ error, config }) => {
    if (config.silentToast) return
    message.error(error.message || '请求失败')
  })

  // ====== 成功事件 ======
  // 默认弹后端返回的 message；后端没给 message 时兜底「请求成功」
  // 业务方传 silentToast=true 即可关闭（如 GET 列表、轮询接口）
  httpBus.on('http:success', ({ raw, config }) => {
    if (config.silentToast) return
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
