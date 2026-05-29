import type { Router } from 'vue-router'
import { message } from 'ant-design-vue'
import { UNAUTHORIZED_STATUS } from '@/api/http/constants.ts'
import { useSessionStore } from '@/stores/session'

/**
 * 路由守卫装配
 *
 * 职责：
 * - beforeEach：登录态拦截 + 已登录访问 login 重定向 + 刷新页面后兜底拉用户信息
 * - afterEach：根据 meta.title 设置 document.title（拼接站点名与宣传语）
 *
 * 设计要点：
 * - title 用 afterEach 而不是 beforeEach/beforeResolve：
 *   afterEach 在导航 100% 确认完成后触发，不会因为后续守卫取消导航而导致 title 与路由不一致
 * - fetchMe 仅在 401（token 失效）时主动 logout；网络 / 服务错误保留登录态，
 *   错误提示统一交给全局 httpHandler，守卫只负责导航控制流（避免提示重复）
 * - 三个重定向分支都用 message 提示用户，让用户知晓页面变化的原因
 */

const SITE_NAME = '海豹乐高'
const SITE_TAGLINE = '最创意的海报生成工具'

const buildTitle = (pageTitle?: string) => {
  return pageTitle
    ? `${pageTitle} - ${SITE_NAME} - ${SITE_TAGLINE}`
    : `${SITE_NAME} - ${SITE_TAGLINE}`
}

export const setupRouterGuards = (router: Router) => {
  router.beforeEach(async (to) => {
    const session = useSessionStore()

    // 1. 有 token 但 userInfo 还未拉取（典型场景：用户刷新页面）→ 兜底拉一次
    //    silentSuccess 抑制无意义的成功 toast；错误提示交给全局 httpHandler 统一接管
    if (session.isLogin && session.userInfo.id === -1) {
      const [, err] = await session.fetchMe({ silentSuccess: true })
      if (err) {
        // 仅 401（token 失效）才登出；网络 / 服务错误保留登录态，下次导航会自动重试 fetchMe
        if (err.code === UNAUTHORIZED_STATUS) {
          session.logout()
        }
        // 错误提示由全局 httpHandler 接管（401 → notification 带「去登录」，网络 / 系统 → message），守卫只取消本次导航
        return false
      }
    }

    // 2. 目标路由需要登录 + 当前未登录 → 跳登录页（带 redirect 用于回跳）
    if (to.meta.requiresAuth && !session.isLogin) {
      message.warning('请登录后再访问该页面')
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // 3. 目标路由不允许已登录访问（如 login 页）+ 当前已登录 → 跳到 redirect 或首页
    if (to.meta.hideForLoggedIn && session.isLogin) {
      message.info('您已登录')
      return (to.query.redirect as string) || '/'
    }
  })

  router.afterEach((to) => {
    document.title = buildTitle(to.meta.title)
  })
}
