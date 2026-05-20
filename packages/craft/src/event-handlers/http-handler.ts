import { Button, message, notification } from 'ant-design-vue'
import { h } from 'vue'
import { clearToken, type CraftRequestConfig, httpBus } from '@/api/http'
import router from '@/router'
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
  clearToken()
  useSessionStore().clearUserInfo()

  const current = router.currentRoute.value
  if (current.name === 'login') return

  router.push({
    name: 'login',
    query: { redirect: current.fullPath },
  })
}

/**
 * 注册 http 事件订阅
 * - 入参：所有事件载荷均带 error 和原始请求 config，silentError=true 时跳过错误 UI 反馈
 * - 设计：业务方可以自行订阅具体事件覆盖默认行为；http:error 仅在具体事件无人订阅时触发
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

  httpBus.on('http:unauthorized', ({ error, config }) => {
    if (config.silentError) return
    // duration=0：不自动消失，等待用户手动操作；key：防止并发 401 弹多个
    notification.error({
      key: UNAUTHORIZED_MESSAGE_KEY,
      message: '登录已过期',
      description: error.message,
      duration: 0,
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
    if (config.silentError) return
    message.error(error.message || '请求失败')
  })

  httpBus.on('http:success', ({ res, config }) => {
    if (config.silentSuccess) return
    message.success(res.data.message || '请求成功')
  })
}
