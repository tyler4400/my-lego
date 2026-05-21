// 路由守卫与全局副作用（鉴权、title、登录态拦截等）请见 @/router/guards.ts
// 本文件只负责声明路由表，业务行为由 guards.ts 装配

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

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
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { title: '首页', requiresAuth: true },
    },
    {
      path: '/editor',
      name: 'editor',
      component: () => import('../views/EditorView'),
      meta: { title: '编辑器', requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { title: '登录', hideForLoggedIn: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('../views/NotFoundView.vue'),
      meta: { title: '页面未找到' },
    },
  ],
})

export default router
