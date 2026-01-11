import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 新增：@my-lego/shared → monorepo 中 shared 源码目录
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },

  // h5(client)：输出到 packages/craft-backend/static/lego-h5/，供SSR之后在客户端执行的水合脚本
  base: '/static/lego-h5/',
  build: {
    outDir: fileURLToPath(new URL('../craft-backend/static/lego-h5', import.meta.url)),
    emptyOutDir: true, // 若 outDir 在根目录之外则会抛出一个警告避免意外删除掉重要的文件。可以设置该选项来关闭这个警告
    manifest: true, // 因为 Vite 生产构建默认会给 JS/CSS 加 hash 文件名，在后端模板里没法提前写死，可通过manifest寻找
    rollupOptions: {
      input: fileURLToPath(new URL('./src/ssr/clientEntry.ts', import.meta.url)),
    },
  },
})
