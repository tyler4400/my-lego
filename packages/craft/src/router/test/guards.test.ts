import type { Router } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

// ---------------------------------------------------------------------------
// 在 import setupRouterGuards 之前先准备好 session store 的可控 mock
// ---------------------------------------------------------------------------

// 直接 import 真实 store + 真实 token helper
// session store 的 isLogin 依赖一个 setup 时初始化的 tokenRef，
// 因此【必须】先 setToken，再 useSessionStore（顺序敏感）
import { setToken } from '@/api/http'
import { setupRouterGuards } from '@/router/guards'
import { useSessionStore } from '@/stores/session'

// ---------------------------------------------------------------------------
// Mock：用 hoisted 让 mock 在测试中可被读取（验证调用次数、修改返回值等）
// ---------------------------------------------------------------------------

const messageMocks = vi.hoisted(() => ({
  warning: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))

vi.mock('ant-design-vue', () => ({
  message: messageMocks,
}))

// notifyUnauthorized 内部依赖 ant-design-vue 的 notification + Button、router.push 等副作用，
// 在守卫单测里我们只关心“是否被以正确参数调用”这个行为契约，
// 内部如何渲染通知/按钮、点击后如何跳转，由 notifyUnauthorized 自身的单测覆盖。
const notifyUnauthorizedMock = vi.hoisted(() => vi.fn())

vi.mock('@/utils/biz/notifyUnauthorized.ts', () => ({
  notifyUnauthorized: notifyUnauthorizedMock,
}))

const FAKE_TOKEN = 'fake-token-for-test'

// ---------------------------------------------------------------------------
// 测试辅助：创建一个最小可用的 router（覆盖三种 meta 组合 + NotFound）
// ---------------------------------------------------------------------------

const Stub = { template: '<div />' }

const createTestRouter = (): Router => {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: Stub, meta: { title: '首页', requiresAuth: true } },
      { path: '/editor', name: 'editor', component: Stub, meta: { title: '编辑器', requiresAuth: true } },
      { path: '/login', name: 'login', component: Stub, meta: { title: '登录', hideForLoggedIn: true } },
      { path: '/public', name: 'public', component: Stub, meta: { title: '关于' } },
      { path: '/:pathMatch(.*)*', name: 'notFound', component: Stub, meta: { title: '页面未找到' } },
    ],
  })
}

describe('setupRouterGuards', () => {
  let router: Router

  beforeEach(() => {
    setActivePinia(createPinia())
    messageMocks.warning.mockClear()
    messageMocks.info.mockClear()
    messageMocks.success.mockClear()
    messageMocks.error.mockClear()
    notifyUnauthorizedMock.mockClear()

    router = createTestRouter()
    setupRouterGuards(router)
    // 故意不调 router.isReady()：memory history 的初始路由是 '/'，会被守卫拦截到 login，
    // 这个过程在不同 vue-router 版本下表现不一，容易让 beforeEach 超时。
    // 每个用例自己 push 并 await，控制流更清晰。
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // 清理 token，避免污染其它 case
    setToken('')
  })

  // -------------------------------------------------------------------------
  // 分支 1：requiresAuth + 未登录 → 跳 login，弹 warning
  // -------------------------------------------------------------------------
  describe('鉴权拦截', () => {
    it('未登录访问 requiresAuth 路由 → 重定向到 /login，并弹 warning', async () => {
      const session = useSessionStore()
      // 未登录：tokenRef 为空，isLogin=false（store 默认状态）
      expect(session.isLogin).toBe(false)

      await router.push('/editor')

      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.query.redirect).toBe('/editor')
      expect(messageMocks.warning).toHaveBeenCalledWith('请登录后再访问该页面')
    })

    it('未登录访问无 requiresAuth 的公开页面 → 正常放行', async () => {
      await router.push('/public')
      expect(router.currentRoute.value.name).toBe('public')
      expect(messageMocks.warning).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // 分支 2：hideForLoggedIn + 已登录 → 跳首页或 redirect，弹 info
  // -------------------------------------------------------------------------
  describe('已登录访问 login 页', () => {
    it('已登录访问 /login → 跳首页，弹 info', async () => {
      // 顺序敏感：先 setToken（影响 store 初始化时的 tokenRef）再 useSessionStore
      setToken(FAKE_TOKEN)
      const session = useSessionStore()
      // 填充 userInfo.id，让守卫的"兜底拉用户信息"分支不触发
      session.setUserInfo({ id: 1, username: 'tester' })

      await router.push('/login')

      expect(router.currentRoute.value.name).toBe('home')
      expect(messageMocks.info).toHaveBeenCalledWith('您已登录')
    })

    it('已登录 + redirect query → 跳到 redirect 指定路径', async () => {
      setToken(FAKE_TOKEN)
      const session = useSessionStore()
      session.setUserInfo({ id: 1, username: 'tester' })

      await router.push('/login?redirect=%2Feditor')

      expect(router.currentRoute.value.path).toBe('/editor')
    })
  })

  // -------------------------------------------------------------------------
  // 分支 3：有 token 但 userInfo.id 缺失 → 调 fetchMe 兜底
  // -------------------------------------------------------------------------
  describe('fetchMe 兜底', () => {
    it('isLogin + userInfo.id 缺失 → 调用 fetchMe', async () => {
      setToken(FAKE_TOKEN)
      const session = useSessionStore()
      // 此时 userInfo.id === -1（初始值），守卫应触发 fetchMe

      // mock fetchMe 返回成功
      const fetchMeSpy = vi.spyOn(session, 'fetchMe').mockResolvedValue([
        { id: 99, username: 'me' },
        null,
      ] as any)

      await router.push('/editor')

      expect(fetchMeSpy).toHaveBeenCalledTimes(1)
      // fetchMe 必须用 silentToast 调用，避免与守卫自身的 message.warning 重复
      expect(fetchMeSpy).toHaveBeenCalledWith({ silentToast: true })
      // 拉取成功 → 不再走 requiresAuth 拦截（因为 isLogin=true）
      expect(router.currentRoute.value.name).toBe('editor')
    })

    it('fetchMe 失败 → logout + 取消导航 + 触发 notifyUnauthorized 提示', async () => {
      setToken(FAKE_TOKEN)
      const session = useSessionStore()

      vi.spyOn(session, 'fetchMe').mockResolvedValue([
        null,
        { type: 'system', code: 401, message: '登录已过期' },
      ] as any)
      const logoutSpy = vi.spyOn(session, 'logout')

      await router.push('/editor')

      // 1) 守卫主动登出
      expect(logoutSpy).toHaveBeenCalledTimes(1)
      // 2) 守卫委托 notifyUnauthorized 提示“登录失效”，
      //    具体的 UI 表现（notification + 按钮 + 跳转）由 notifyUnauthorized 自身负责
      expect(notifyUnauthorizedMock).toHaveBeenCalledTimes(1)
      expect(notifyUnauthorizedMock).toHaveBeenCalledWith('登录已过期，请重新登录')
      // 3) 守卫 return false：当前导航被取消，未跳进 /editor
      //    （memory history 此时停留在 START_LOCATION，path 为 '/'）
      expect(router.currentRoute.value.path).not.toBe('/editor')
      // 4) 不再走 message.warning（防止退化回旧行为）
      expect(messageMocks.warning).not.toHaveBeenCalled()
    })

    it('userInfo.id 已有 → 不会重复调 fetchMe', async () => {
      setToken(FAKE_TOKEN)
      const session = useSessionStore()
      session.setUserInfo({ id: 1, username: 'tester' })

      const fetchMeSpy = vi.spyOn(session, 'fetchMe')

      await router.push('/editor')

      expect(fetchMeSpy).not.toHaveBeenCalled()
      expect(router.currentRoute.value.name).toBe('editor')
    })
  })

  // -------------------------------------------------------------------------
  // afterEach：document.title 按模板拼接
  // -------------------------------------------------------------------------
  describe('document.title 设置（afterEach）', () => {
    const SITE_FULL = '海豹乐高 - 最创意的海报生成工具'

    it('有 meta.title → "{pageTitle} - 海豹乐高 - 最创意的海报生成工具"', async () => {
      await router.push('/login')
      expect(document.title).toBe(`登录 - ${SITE_FULL}`)
    })

    it('notFound 路由也按模板拼接', async () => {
      await router.push('/some-unknown-path')
      expect(router.currentRoute.value.name).toBe('notFound')
      expect(document.title).toBe(`页面未找到 - ${SITE_FULL}`)
    })

    it('meta.title 缺失时退化为 "海豹乐高 - 最创意的海报生成工具"', async () => {
      const r = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/no-title', name: 'noTitle', component: Stub, meta: {} },
        ],
      })
      setupRouterGuards(r)

      await r.push('/no-title')
      expect(document.title).toBe(SITE_FULL)
    })
  })
})
