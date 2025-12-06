import baseConfig from '../../eslint.base.mjs'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

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

  // 为 .vue 文件的 <script> 部分添加「类 Prettier」的代码风格校验
  // 目标：尽量贴近 .prettierrc 中对脚本的配置，但不影响 <template> 的排版
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // 使用 vue-eslint-parser 解析 .vue，内部再委托给 TS 解析器解析 <script lang="ts">
        // 这里的 parser 字段是给 vue-eslint-parser 使用的子解析器
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      // 来自 .prettierrc: "semi": false
      // 要求脚本中不写分号，例如：const x = 1 而不是 const x = 1;
      semi: ['error', 'never'],

      // 来自 .prettierrc: "singleQuote": true
      // 要求使用单引号，必要时允许为了转义而使用双引号
      quotes: ['error', 'single', { avoidEscape: true }],

      // 来自 .prettierrc: "trailingComma": "all"
      // 要求多行结构中使用尾随逗号（对象 / 数组 / 参数 / import 等）
      'comma-dangle': ['error', 'always-multiline'],

      // 额外补充：import / 对象大括号内部需要空格
      // 示例：{ Layout, LayoutContent, LayoutSider }，否则会标红
      'object-curly-spacing': ['error', 'always'],

      // 额外补充：逗号前不能有空格，逗号后必须有空格
      // 示例：LayoutContent, LayoutSider，禁止 LayoutContent,LayoutSider
      'comma-spacing': ['error', { before: false, after: true }],

      // 来自 .prettierrc: "arrowParens": "avoid"
      // 要求箭头函数在只有一个参数时省略括号：param => {}，而不是 (param) => {}
      'arrow-parens': ['error', 'as-needed'],
    },
  },
]
