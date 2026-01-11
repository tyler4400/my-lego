import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    dts({
      tsconfigPath: './tsconfig.app.json',
      rollupTypes: true, // rollup 成一个 d.ts
      outDir: 'dist-ssr/types',
      include: ['src/ssr/**/*'],
      // exclude: ['src/**/*.test.*'],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 新增：@my-lego/shared → monorepo 中 shared 源码目录
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },

  // ssr(server lib)：输出 CJS，可被后端 import 使用
  build: {
    outDir: './dist-ssr',
    // emptyOutDir: true, // 若 outDir 在根目录之外则会抛出一个警告避免意外删除掉重要的文件。可以设置该选项来关闭这个警告
    lib: {
      entry: fileURLToPath(new URL('./src/ssr/index.ts', import.meta.url)),
      name: 'craft-ssr', // name 是暴露的全局变量，当 formats 包括 'umd' 或 'iife' 时必须使用
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
})
