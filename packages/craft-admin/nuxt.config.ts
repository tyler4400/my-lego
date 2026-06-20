// https://nuxt.com/docs/api/configuration/nuxt-config
import { fileURLToPath } from 'node:url'

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

  // app 是对整个应用程序的配置，代码中使用useRuntimeConfig()获取
  // 其下的 head 对应 HTML 的 <head> 标签内容。可在这里全局设置第三方 CSS、字符编码、标题、meta 等。
  app: {
    // pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      // 整页编码
      charset: 'utf-8',
      // 全局标题
      title: '海豹乐高后台管理平台',
      // meta 标签数组，可多个
      meta: [
        { name: 'description', content: '海豹乐高后台管理平台' },
      ],
      // link 标签数组：可加第三方 CSS 等
      // link: [
      //   { rel: 'stylesheet', href: 'https://cdn.example.com/some.css' },
      // ],
    },
  },

  // 运行时配置：服务端私有 + 公开
  runtimeConfig: {
    jwt: {
      secret: '', // 被 .env 的 NUXT_JWT_SECRET 覆盖
      expiresIn: 60 * 60, // 1 小时（秒）
      cookieName: 'craft-admin-token',
    },
    bcrypt: {
      saltRounds: 10,
    },
  },

  modules: [
    '@nuxt/ui', // 它会自动处理 Tailwind v4 的 Vite 集成
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

  vite: {
    // 冷启动预构建
    optimizeDeps: {
      include: [
        '@vee-validate/zod',
        'zod',
      ],
    },
  },

})
