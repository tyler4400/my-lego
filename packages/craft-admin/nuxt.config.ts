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

  // 运行时配置：服务端私有 + 公开
  runtimeConfig: {
    jwt: {
      secret: '', // 被 .env 的 NUXT_JWT_SECRET 覆盖
      expiresIn: 10, // 1 小时（秒）
      cookieName: 'craft-admin-token',
    },
    bcrypt: {
      saltRounds: 10,
    },
  },

  modules: [
    ['@vee-validate/nuxt', {
      autoImports: true,
      componentNames: {
        Form: 'VeeForm',
        Field: 'VeeField',
        ErrorMessage: 'VeeErrorMessage',
      },
    }],
    ['nuxt-mongoose', {
      // uri: 'mongodb://localhost:27017/your-db', // 会自动去读.env NUXT_MONGOOSE_URI
      // options: {},
      modelsDir: 'models', // 模型目录，默认 server/models
    }],
  ],

  // 把 Tailwind 入口 CSS 加到 css 数组
  css: ['~/assets/css/main.css'],

  // 把 @tailwindcss/vite 注册为 Vite 插件
  vite: {
    plugins: [tailwindcss()],
  },
})
