import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'

const baseConfig = [
  // 全局忽略
  {
    ignores: ['**/node_modules/**', '**/dist/**'],
  },

  // JS: 等价于 eslint:recommended
  js.configs.recommended,

  // TS: 严格但不依赖类型信息（非 type-aware）,性能更高
  ...tseslint.configs.strict,

  // 关闭和 Prettier 冲突的规则
  eslintConfigPrettier,

  // Prettier 作为 ESLint 规则（js/ts）
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',

      // 降低一些 TS 噪音规则的严格度（按你习惯）
      // '@typescript-eslint/no-unsafe-function-type': 'off',
      // '@typescript-eslint/no-this-alias': 'off',
      // '@typescript-eslint/no-explicit-any': 'off',
      // '@typescript-eslint/no-empty-object-type': 'off',
      // '@typescript-eslint/no-wrapper-object-types': 'off'
      // '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    },
  },
]

export default baseConfig
