// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // 固定开发端口为 3003（避开 backend 3000 / craft 5173）
  devServer: {
    port: 3003,
  },

  // 源码直连 @my-lego/shared：开发时改 shared 立即生效，无需先 build
  // 同时作用于 Vite(客户端) 与 Nitro(服务端) 以及生成的 TS paths
  alias: {
    '@my-lego/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
  },

  // 把 Tailwind 入口 CSS 加到 css 数组
  css: ['~/assets/css/main.css'],

  // 把 @tailwindcss/vite 注册为 Vite 插件
  vite: {
    plugins: [tailwindcss()],
  },
})
