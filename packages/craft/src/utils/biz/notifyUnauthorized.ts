import { Button, notification } from 'ant-design-vue'
import { h } from 'vue'
import router from '@/router'
import { useSessionStore } from '@/stores/session.ts'

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

export const notifyUnauthorized = (message: string) => {
  // duration=0：不自动消失，等待用户手动操作；key：防止并发 401 弹多个
  notification.error({
    key: UNAUTHORIZED_MESSAGE_KEY,
    message: '登录已失效',
    description: message,
    duration: null,
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
}
