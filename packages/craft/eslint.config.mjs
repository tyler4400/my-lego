import antfu from '@antfu/eslint-config'

export default antfu(
  {
    // 当前子包是 Vue + TypeScript 前端项目
    vue: {
      overrides: {
        // enforce order of component top-level elements 自定义 Vue 文件中标签的顺序，模板 -> 脚本 -> 样式
        'vue/block-order': ['error', {
          order: ['template', 'script', 'style'],
        }],
        // 组件名使用 PascalCase，例如 <ComponentList />
        'vue/component-name-in-template-casing': ['error', 'PascalCase'],
        // props/attribute 一律使用驼峰写法，禁止 some-prop 这种横线形式（保留 data-*/aria-* 原生属性）
        'vue/attribute-hyphenation': ['error', 'never', {
          ignore: ['data-*', 'aria-*'],
        }],
        // 事件绑定使用驼峰写法，例如 @onItemClick，不允许 @on-item-click
        'vue/v-on-event-hyphenation': ['error', 'never'],
        // 自定义事件名称（emit）使用 camelCase，例如 emit('setActive')
        'vue/custom-event-name-casing': ['error', 'camelCase'],
      },
    },
    typescript: true,

    // 仅忽略本包内的构建产物和依赖目录
    ignores: [
      'dist',
      'node_modules',
    ],
  },
  {
    // 与根项目保持一致，关闭部分主观性较强的规则
    rules: {
      'jsonc/sort-keys': 'off',
      'antfu/top-level-function': 'off',
      'no-console': 'off',
      'style/max-len': ['error', {
        code: 110, // 代码行最长 110
        tabWidth: 2, // 和项目缩进对齐
        comments: 130, // 注释稍微放宽一点
        ignoreUrls: true, // 忽略很长的 URL
        ignoreStrings: true, // 忽略长字符串字面量
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      }],
    },
  },
)
