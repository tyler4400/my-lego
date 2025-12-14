import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // 根项目启用基础 TS/JS 规则，不在这里开 Vue
    typescript: true,
    vue: false,

    // 根级别通用忽略
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
    ],
  },
  {
    // 全局关闭部分主观性较强的规则
    rules: {
      // 不强制 JSON / JSONC / package.json / tsconfig.json 的 key 排序
      'jsonc/sort-keys': 'off',
      // 允许顶层使用箭头函数声明，而不仅仅是 function 关键字
      'antfu/top-level-function': 'off',
      // 允许使用 console（如需后面改成 warn 也可以）
      'no-console': 'off',
      // if (typeof val !== 'number') return ''  //if 后面换行
      'antfu/if-newline': 'off',
    },
  },
)
