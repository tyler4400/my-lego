import baseConfig from '../../eslint.base.mjs'
import vue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default [
  // 通用 JS/TS 规则（含 Prettier for js/ts）
  ...baseConfig,

  // 为前端源码开启完整浏览器全局（window / document / fetch 等）
  // 只作用于 craft 包的源码目录，不影响其他包
  {
    files: ['src/**/*.{js,ts,vue}'],
    languageOptions: {
      globals: {
        // browser 环境内置的所有全局变量：window / document / fetch / console 等
        ...globals.browser,
      },
    },
  },

  // Vue 3 官方 flat 推荐配置（包含 parser / plugins / rules / processor 等）
  // 注意：这里会自动为 .vue 文件启用 vue-eslint-parser、vue 插件以及推荐规则集合
  ...vue.configs['flat/recommended'],

  // 追加一段仅针对 .vue 的配置：
  // 让 <script lang="ts"> 使用 TypeScript 解析器，避免 defineProps 泛型等 TS 语法被当成普通 JS 报 “Parsing error”
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parserOptions: {
        // 使用 typescript-eslint 暴露的 parser 解析 <script lang="ts"> 部分
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },

  // 如果需要自定义 Vue 项目特有规则，可以在这里为 .vue 单独追加
  // 例如：
  // {
  //   files: ['**/*.vue'],
  //   rules: {
  //     'vue/multi-word-component-names': 'off',
  //   },
  // },
]
