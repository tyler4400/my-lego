// 使用 @antfu/eslint-config 统一 ESLint 配置
// 注意：本包是纯后端 Nest + TypeScript 项目，不需要 Vue

import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // 启用 TypeScript 支持，并显式指向本包 tsconfig
    // 这样类型相关规则（type-aware rules）才能正常工作
    typescript: {
      tsconfigPath: './tsconfig.json',
    },

    // 后端项目不使用 Vue，显式关闭
    vue: false,

    // 忽略本包的构建产物和依赖目录
    ignores: ['dist', 'node_modules'],
  },
  {
    // 这里是对基础规则的一些补充和个性化设置
    languageOptions: {
      // 使用 ESM 模块解析方式
      // 对应 tsconfig 中的 "module": "nodenext"，推荐这里使用 'module'
      sourceType: 'module',
    },

    rules: {
      // 延续原来的宽松策略：允许使用 any
      '@typescript-eslint/no-explicit-any': 'off',
      // 对 Promise 和 unsafe argument 保持「警告」级别
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'jsonc/sort-keys': 'off',
      'antfu/top-level-function': 'off',
      'no-console': 'off',
      'style/max-len': [
        'error',
        {
          code: 110, // 代码行最长 110
          tabWidth: 2, // 和项目缩进对齐
          comments: 130, // 注释稍微放宽一点
          ignoreUrls: true, // 忽略很长的 URL
          ignoreStrings: true, // 忽略长字符串字面量
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      // if (typeof val !== 'number') return ''  //if 后面换行
      'antfu/if-newline': 'off',
      // 允许在 Nest 后端中直接使用全局 process（如 process.env）
      'node/prefer-global/process': 'off',
      'ts/strict-boolean-expressions': 'off',
    },
  },
);
