import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // craft-admin 是 Nuxt(Vue3) + TypeScript 项目
    vue: true,
    typescript: true,
    // 忽略 Nuxt 构建产物与依赖目录
    ignores: ['dist', 'node_modules', '.nuxt', '.output'],
  },
  {
    // 与根/其它子包保持一致，关闭主观性较强的规则
    rules: {
      'jsonc/sort-keys': 'off',
      'antfu/top-level-function': 'off',
      'no-console': 'off',
      'antfu/if-newline': 'off',
    },
  },
)
