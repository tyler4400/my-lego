// 路由守卫与全局副作用（鉴权、title、登录态拦截等）请见 @/router/guards.ts
// 本文件只负责声明路由表，业务行为由 guards.ts 装配

import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import EditorLayout from '@/views/EditorView/EditorLayout.vue'
import HomeView from '@/views/HomeView.vue'
import LoginView from '@/views/LoginView.vue'

/**
 * 路由 meta 字段类型扩展
 * - title：浏览器标签页标题（守卫会自动拼接站点名 + 宣传语）
 * - requiresAuth：是否需要登录才能访问（true 时未登录会跳登录页）
 * - hideForLoggedIn：已登录用户是否不允许访问（true 时已登录用户会跳 redirect 或 /）
 */
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    requiresAuth?: boolean
    hideForLoggedIn?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    /**
     * 通用布局：含 AppHeader
     * - 业务页（首页 / 我的作品 / 个人设置）都挂在这里
     * - meta 沿嵌套链合并，守卫读 to.meta 即可拿到 requiresAuth/title
     * - name 都放在 leaf 路由，父级不取名，避免 router.push({ name }) 跳到空壳父级
     */
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: HomeView,
          meta: { title: '首页', requiresAuth: true },
        },
        {
          path: 'works',
          name: 'works',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '我的作品', requiresAuth: true },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('@/views/SettingsView.vue'),
          meta: { title: '个人设置', requiresAuth: true },
        },
      ],
    },

    /**
     * 编辑器布局：含 EditorHeader
     * - EditorLayout / EditorHeader 跟 EditorView 强耦合（共用 editorStore / historyStore），
     *   所以放在 views/EditorView 下而不是 layouts/
     */
    {
      path: '/editor',
      component: EditorLayout,
      children: [
        {
          path: '',
          name: 'editor',
          component: () => import('../views/EditorView'),
          meta: { title: '编辑器', requiresAuth: true },
        },
      ],
    },

    /**
     * 登录页：不套任何 layout（全屏沉浸式品牌展示 + 表单）
     */
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { title: '登录', hideForLoggedIn: true },
    },

    /**
     * 404 通配：仍套 MainLayout，未登录访问错误 URL 时也能看到"去登录"入口
     * - 必须放在路由数组最后（Vue Router 按声明顺序匹配）
     */
    {
      path: '/:pathMatch(.*)*',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'notFound',
          component: () => import('@/views/NotFoundView.vue'),
          meta: { title: '页面未找到' },
        },
      ],
    },
  ],
})

export default router
