import baseConfig from '../../eslint.base.mjs'
import vue from 'eslint-plugin-vue'
import prettierPlugin from 'eslint-plugin-prettier'

export default [
  // 通用 JS/TS 规则（含 Prettier for js/ts）
  ...baseConfig,

  // Vue + Prettier（主要针对 .vue）
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vue.parsers['vue-eslint-parser'],
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    plugins: {
      vue,
      prettier: prettierPlugin
    },
    rules: {
      // Vue 3 推荐规则，比 essential 更严格
      ...vue.configs['vue3-recommended'].rules,

      // 让 Prettier 也对 .vue 生效（格式问题视为 ESLint error）
      'prettier/prettier': 'error'

      // 可以在这里添加 Vue 项目特有规则，例如：
      // 'vue/multi-word-component-names': 'off'
    }
  }
]
