import baseConfig from '../../eslint.base.mjs'

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      sourceType: 'module',
    },
    rules: {
      // 这里可以按需添加 shared 特有规则
      // 例如：库里尽量少用 console
      // 'no-console': 'error',
    },
  },
]
