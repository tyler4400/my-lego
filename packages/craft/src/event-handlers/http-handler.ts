import { message } from 'ant-design-vue'
import { h } from 'vue'
import { clearToken, httpBus } from '@/api/http'
import router from '@/router'
import { useUserInfoStore } from '@/stores/userInfo'

/**
 * 401 message 的固定 key，用于：
 * - 防止并发 401 弹出多个 message
 * - 用户点击「去登录」或「关闭」时按 key 精准销毁
 */
const UNAUTHORIZED_MESSAGE_KEY = 'http-unauthorized'

/**
 * 跳转登录页，并带上当前路径用于登录成功后回跳
 */
const handleGoLogin = () => {
  message.destroy(UNAUTHORIZED_MESSAGE_KEY)
  clearToken()
  useUserInfoStore().$reset()
  router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
}

/**
 * 关闭 401 提示但不跳转（用户希望继续当前操作）
 */
const handleDismiss = () => {
  message.destroy(UNAUTHORIZED_MESSAGE_KEY)
}

/**
 * 构造 401 message 的 VNode 内容
 * - 文案在前，「去登录」「关闭」两个文字按钮在后
 * - 因为项目未使用 Tailwind，这里直接用 inline style 控制样式
 */
const renderUnauthorizedContent = (text: string) =>
  h('span', { style: 'display: inline-flex; align-items: center; gap: 12px' }, [
    text,
    h(
      'a',
      {
        style: 'color: #1677ff; cursor: pointer; text-decoration: none',
        onClick: handleGoLogin,
      },
      '去登录',
    ),
    h(
      'a',
      {
        style: 'color: rgba(0, 0, 0, 0.45); cursor: pointer; text-decoration: none',
        onClick: handleDismiss,
      },
      '关闭',
    ),
  ])

/**
 * 注册 http 事件订阅
 * - 入参：所有事件载荷均带 error 和原始请求 config，silent=true 时跳过 UI 反馈
 * - 设计：业务方可以自行订阅具体事件覆盖默认行为；http:error 仅在具体事件无人订阅时触发
 */
export const setupHttpHandler = () => {
  httpBus.on('http:bizError', ({ error, config }) => {
    if (config.silent) return
    message.error(error.message)
  })

  httpBus.on('http:systemError', ({ error, config }) => {
    if (config.silent) return
    message.error(error.message)
  })

  httpBus.on('http:networkError', ({ error, config }) => {
    if (config.silent) return
    message.error(error.message || '网络异常，请稍后重试')
  })

  httpBus.on('http:unauthorized', ({ error, config }) => {
    if (config.silent) return
    // duration=0：不自动消失，等待用户手动操作；key：防止并发 401 弹多个
    message.error({
      key: UNAUTHORIZED_MESSAGE_KEY,
      duration: 0,
      content: () => renderUnauthorizedContent(error.message || '登录已过期'),
    })
  })

  httpBus.on('http:error', ({ error, config }) => {
    if (config.silent) return
    message.error(error.message || '请求失败')
  })
}
