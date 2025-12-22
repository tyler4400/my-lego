## my-lego Monorepo 搭建指南（终极方案）

### 一、背景与整体目标

**整体背景：**

- 基于慕课网[《从 0 实现乐高活动平台（Vue3 + Node）》](https://coding.imooc.com/class/824.html)课程内容，构建自己的现代化实践版本。
- 使用 **pnpm monorepo** 管理多个子项目，包含：
  - **`@my-lego/shared`**：共享工具函数库（TypeScript）
  - **`@my-lego/craft`**：乐高页面编辑器前端（Vue3 + Vite + TypeScript）
- 对课程中相对老旧的技术栈（如 Egg）适当升级（如 NestJS），但本篇文档只聚焦 **monorepo + TS + ESLint + Prettier + Vite alias** 的基础骨架。

**核心诉求：**

- **统一管理 TypeScript：**
  - 根目录有一个 **`tsconfig.base.json`**，定义统一的严格 TS 规则与路径别名。
  - 每个子项目有一个**很薄的 `tsconfig.json`**，只负责自己的输入输出、环境差异。
- **统一管理 ESLint & Prettier：**
  - 根目录有一个 **`eslint.base.mjs`**：
    - 使用 ESLint 9（flat config）；
    - 提供严格的 JS/TS 规则；
    - 集成 Prettier 为 ESLint 规则（`prettier/prettier: error`）。
  - 子项目有极薄的 `eslint.config.mjs`，在 base 基础上按需叠加：
    - `@my-lego/shared`：纯 TS 库规则。
    - `@my-lego/craft`：Vue3 + TypeScript + `eslint-plugin-vue` 的 `flat/recommended`（模板格式以 Vue 规则为主）；JS/TS 继续通过 Prettier 管理格式。
- **路径别名与源码直连：**
  - TypeScript 层面：`@my-lego/shared` → `packages/shared/src`，开发时 IDE 能直接跳转到源码。
  - Vite 层面：**开发与构建都通过 alias 直连 `packages/shared/src` 源码（方案 B）**。
- **一条命令看全仓质量：**
  - `pnpm lint`：一次性检查**语法错误 + 代码风格 + Prettier 格式**。
  - `pnpm format`：统一使用 Prettier 格式化全部代码。

---

### 二、最终效果概览

搭建完成后，你将获得：

- **目录结构：**

  - 根：
    - `package.json`（统一脚本，如 `build` / `lint` / `format` / `dev:craft`）
    - `pnpm-workspace.yaml`
    - `tsconfig.base.json`（公共 TS 配置）
    - `tsconfig.json`（TS project references）
    - `eslint.base.mjs`（JS/TS + Prettier）
    - `eslint.config.mjs`（可选，用于根脚本）
    - `.prettierrc` / `.prettierignore`
    - `docs/`（本指南等文档）
  - `packages/shared`：
    - `package.json`
    - `tsconfig.json`（extends 根 base）
    - `eslint.config.mjs`（复用 base）
    - `src/index.ts`（示例工具函数）
    - `dist/`（由 `tsc` 输出）
  - `packages/craft`：
    - `package.json`（含 `"@my-lego/shared": "workspace:*"`）
    - `tsconfig.json`（维护对 node/app/vitest 子 tsconfig 的 project references）
    - `eslint.config.mjs`（在 base 上叠加 Vue3 flat/recommended + 浏览器 globals 配置）
    - `vite.config.ts`（alias `@my-lego/shared` → `../shared/src`）
    - `src/`（Vue3 应用源码）

- **开发体验：**

  - 任意子项目里写：

    ```ts
    import { formatHello } from '@my-lego/shared'
    ```

    - TypeScript：通过根 `paths`，直接把它解析到 `packages/shared/src/index.ts`。
    - Vite：通过 alias，将其解析到同一目录，**开发 & 构建都吃源码**。

  - IDE 中点击 `formatHello`，直接跳进 `@my-lego/shared` 源码。

- **质量保证：**

  - `pnpm lint`：
    - 所有 JS/TS/TSX/JSX 文件：
      - `eslint:recommended` + `typescript-eslint` 严格规则；
      - `prettier/prettier: error` → 所有格式问题都以 ESLint 错误形式提示；
    - 所有 `.vue` 文件：
      - 使用 `eslint-plugin-vue` 的 `flat/recommended` 规则（包含 Vue 3 推荐规则 + 模板格式约束）；
      - 不再对 `.vue` 启用 `prettier/prettier`，模板部分完全以 Vue 规则为主，避免与 Prettier 冲突。
  - `pnpm format`：
    - 按 `.prettierrc` 配置格式化全仓代码。

---

### 三、项目结构与技术选型（简图）

- **包管理：** pnpm monorepo（`pnpm-workspace.yaml`）。
- **语言：** TypeScript（根统一版本，子项目继承 base tsconfig）。
- **前端：** Vue3 + Vite（`@my-lego/craft`）。
- **共享工具：** 纯 TS 库（`@my-lego/shared`）。
- **Lint：**
  - ESLint 9（flat config）。
  - `typescript-eslint`（非 type-aware 严格配置）。
  - `eslint-plugin-vue`（`flat/recommended`，用于 `.vue` 文件）。
  - `eslint-plugin-prettier` + `eslint-config-prettier`。
- **格式化：** Prettier（通过 ESLint 执行 & 独立脚本）。

---

### 四、从零搭建详细步骤

> 假设从一个全新的空目录开始：`my-lego/`。  
> 所有命令都在项目根执行，除非特别说明。

---

#### 步骤 0：创建仓库目录与 Git

- **命令：**

  ```bash
  mkdir my-lego
  cd my-lego
  git init
  ```

- **效果：**

  - 初始化一个干净的 Git 仓库，后续所有配置可以用 Git 管理和回溯。

---

#### 步骤 1：根 `package.json` 与 pnpm workspace

- **1.1 初始化根 `package.json`**

  ```bash
  pnpm init -y
  ```

  修改生成的 `package.json`，确保包含以下关键内容：

  ```json
  {
    "name": "my-lego",
    "private": true,
    "version": "0.0.0",
    "scripts": {
      "build": "pnpm -r run build",
      "lint": "pnpm -r run lint",
      "format": "pnpm -r run format",
      "dev:craft": "pnpm --filter @my-lego/craft dev"
    }
  }
  ```

  - **`private: true`**：避免根包意外发布到 npm。
  - **`pnpm -r`**：对所有 workspace 子项目执行同名脚本，例如 `build`、`lint`、`format`。

- **1.2 配置 `pnpm-workspace.yaml`**

  ```bash
  cat > pnpm-workspace.yaml << 'EOF'
  packages:
    - "packages/*"
  EOF
  ```

  - **效果：**
    - pnpm 会把 `packages/*` 下每个目录作为一个独立 workspace 包。
    - 支持 `workspace:*` 版本范围，在包之间实现本地链接依赖。

---

#### 步骤 2：在根安装公共开发依赖（TS + ESLint + Prettier）

- **安装命令：**

  ```bash
  pnpm add -D -w \
    typescript \
    eslint \
    @eslint/js \
    typescript-eslint \
    eslint-plugin-prettier \
    eslint-config-prettier \
    prettier
  ```

- **效果：**

  - 所有子项目共享同一版本的：
    - TypeScript；
    - ESLint（支持 9 / flat config）；
    - TypeScript ESLint 支持；
    - Prettier + ESLint 集成。
  - 统一升级、统一维护，避免每个子项目各自装一套工具导致版本发散。

---

#### 步骤 3：根 TypeScript 配置（严格规则 + 路径别名）

- **3.1 创建 `tsconfig.base.json`**

  ```bash
  cat > tsconfig.base.json << 'EOF'
  {
    "compilerOptions": {
      "target": "ESNext",
      "module": "ESNext",
      "moduleResolution": "Node",
      "strict": true,
      "esModuleInterop": true,
      "allowSyntheticDefaultImports": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "outDir": "dist",
      "lib": ["ESNext", "DOM"],
      "baseUrl": ".",
      "paths": {
        "@my-lego/*": ["packages/*/src"]
      }
    }
  }
  EOF
  ```

  - **关键效果：**
    - **严格模式**：通过 `strict`、`forceConsistentCasingInFileNames` 等开关增强类型安全。
    - **路径别名**：
    - 任意子项目写 `import { x } from '@my-lego/xxx'`（例如 `@my-lego/shared`）时，**TypeScript 会直接从对应的 `packages/xxx/src` 解析源码**。
    - 避免在多个项目间写大量 `../../some-other-package/src/...` 这种相对路径。
    - 这些别名 **只影响 TS/IDE 的解析**，不会改变最终打包的 import 字符串。

- **3.2 创建根 `tsconfig.json`（Project References）**

  ```bash
  cat > tsconfig.json << 'EOF'
  {
    "extends": "./tsconfig.base.json",
    "files": [],
    "references": [
      { "path": "./packages/shared" },
      { "path": "./packages/craft" }
    ]
  }
  EOF
  ```

  - **效果：**
    - 将所有子项目纳入 TS 的 Project References 体系。
    - 之后可以用 `pnpm exec tsc -b` 做**全仓类型检查**（等子项目创建完毕）。

---

#### 步骤 4：根 Prettier 配置（格式统一）

- **4.1 创建 `.prettierrc`**

  ```bash
  cat > .prettierrc << 'EOF'
  {
    "singleQuote": true,
    "semi": false,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always"
  }
  EOF
  ```

- **4.2 创建 `.prettierignore`**

  ```bash
  cat > .prettierignore << 'EOF'
  node_modules
  dist
  *.log
  coverage
  EOF
  ```

- **效果：**

  - 全仓统一使用单引号、无分号、结尾逗号等格式约定。
  - `dist` / `node_modules` 等不被 Prettier 处理。

---

#### 步骤 5：根 ESLint base（JS/TS 严格规则 + Prettier）

- **5.1 创建 `eslint.base.mjs`**

  ```bash
  cat > eslint.base.mjs << 'EOF'
  import js from '@eslint/js'
  import tseslint from 'typescript-eslint'
  import prettierPlugin from 'eslint-plugin-prettier'
  import eslintConfigPrettier from 'eslint-config-prettier'

  const baseConfig = [
    {
      ignores: ['**/node_modules/**', '**/dist/**']
    },

    js.configs.recommended,

    ...tseslint.configs.strict,

    eslintConfigPrettier,

    {
      files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
      plugins: {
        prettier: prettierPlugin
      },
      rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/no-unsafe-function-type': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-empty-object-type': 'off',
        '@typescript-eslint/no-wrapper-object-types': 'off'
      }
    }
  ]

  export default baseConfig
  EOF
  ```

  - **效果：**
    - **`js.configs.recommended`**：等价于 `eslint:recommended`。
    - **`tseslint.configs.strict`**：
      - 比 `recommended` 更严格；
      - **不启用 type-aware（无 `parserOptions.project`）**，性能开销低，配置也简单。
    - **`eslint-config-prettier`** + **`eslint-plugin-prettier`**：
      - 关闭与 Prettier 冲突的规则；
      - 把 Prettier 作为 ESLint 规则执行（`prettier/prettier: 'error'`），**lint 一次就统一语法/风格/格式**。

- **5.2 （可选）根 `eslint.config.mjs`**

  ```bash
  cat > eslint.config.mjs << 'EOF'
  import baseConfig from './eslint.base.mjs'

  export default baseConfig
  EOF
  ```

  - **效果：**
    - 对根目录下的 TS/JS 脚本（如果有）也应用统一规则。
    - 对子项目无副作用；每个子项目仍有自己的 `eslint.config.mjs`。

---

#### 步骤 6：创建 `@my-lego/shared`（TS 工具库）

- **6.1 初始化包结构与 `package.json`**

  ```bash
  mkdir -p packages/shared/src
  cd packages/shared
  pnpm init -y
  ```

  修改 `packages/shared/package.json`：

  ```json
  {
    "name": "@my-lego/shared",
    "version": "0.0.0",
    "main": "dist/index.cjs",
    "module": "dist/index.mjs",
    "types": "dist/index.d.ts",
    "scripts": {
      "build": "tsc -p tsconfig.json",
      "lint": "eslint .",
      "format": "prettier --write ."
    }
  }
  ```

  - **效果：**
    - `build` 脚本：使用 `tsc` 编译 `shared` 源码到 `dist`，生成 JS + 类型声明。
    - 未来即使 `@my-lego/craft` 不直接用 `dist`，`shared` 也可以独立发布为 npm 包。

- **6.2 创建 `packages/shared/tsconfig.json`**

  ```bash
  cat > tsconfig.json << 'EOF'
  {
    "extends": "../../tsconfig.base.json",
    "compilerOptions": {
      "rootDir": "src",
      "outDir": "dist",
      "declaration": true,
      "declarationMap": true
    },
    "include": ["src"],
    "exclude": ["dist", "node_modules"]
  }
  EOF
  ```

  - **效果：**
    - 编译时：`src` → `dist`；
    - 生成 `.d.ts` 和 `.d.ts.map`，方便外部项目消费。

- **6.3 创建 `packages/shared/eslint.config.mjs`**

  ```bash
  cat > eslint.config.mjs << 'EOF'
  import baseConfig from '../../eslint.base.mjs'

  export default [
    ...baseConfig,
    {
      files: ['src/**/*.{ts,tsx}'],
      languageOptions: {
        sourceType: 'module'
      },
      rules: {
        // 可在此按需补充 shared 特有规则
      }
    }
  ]
  EOF
  ```

  - **效果：**
    - `shared` 使用与根一致的 JS/TS + Prettier 规则；
    - 你可以根据“工具库”的性质添加更多约束，如禁止 `console.log`。

- **6.4 简单工具函数（`packages/shared/src/index.ts`）**

  ```bash
  cat > src/index.ts << 'EOF'
  export const formatHello = (name: string): string => {
    return `Hello, ${name}!`
  }
  EOF
  ```

  - **效果：**
    - 为后续在 `@my-lego/craft` 中引入做验证示例。

---

#### 步骤 7：创建 `@my-lego/craft`（Vue3 + Vite）

回到根目录：

```bash
cd ../../
```

- **7.1 使用 Vue 官方脚手架创建**

  ```bash
  pnpm create vue@latest packages/craft
  ```

  - TypeScript：**Yes**
  - ESLint：**No**（使用你自己的 ESLint 9 + flat config）
  - 其他按需要选择 Router / Pinia / Vitest 等。

- **7.2 调整 `packages/craft/package.json`**

  ```json
  {
    "name": "@my-lego/craft",
    "scripts": {
      "dev": "vite",
      "build": "run-p type-check \"build-only {@}\" --",
      "preview": "vite preview",
      "test:unit": "vitest",
      "build-only": "vite build",
      "type-check": "vue-tsc --build"
    },
    "dependencies": {
      "@my-lego/shared": "workspace:*"
    },
    "devDependencies": {
      "@tsconfig/node24": "^24.0.3",
      "@types/jsdom": "^27.0.0",
      "@types/node": "^24.10.1",
      "@vitejs/plugin-vue": "^6.0.2",
      "@vue/test-utils": "^2.4.6",
      "@vue/tsconfig": "^0.8.1",
      "eslint-plugin-vue": "^10.6.2",
      "globals": "^16.5.0",
      "jsdom": "^27.2.0",
      "npm-run-all2": "^8.0.4",
      "typescript": "~5.9.0",
      "vite": "^7.2.4",
      "vite-plugin-vue-devtools": "^8.0.5",
      "vitest": "^4.0.14",
      "vue-tsc": "^3.1.5"
    }
  }
  ```

  - **效果：**
    - `workspace:*`：让 `@my-lego/craft` 使用 monorepo 中的 `@my-lego/shared` 包。
  - `@vue/tsconfig` 等 devDeps 为前端提供浏览器/打包环境的 TS preset。
  - `eslint-plugin-vue@^10.6.2` 提供 Vue 3 官方 flat 配置；`globals` 用于在 ESLint 中声明浏览器全局（`window` / `document` / `fetch` 等）。

- **7.3 覆盖 `packages/craft/tsconfig.json`**

最终方案：仅继承 `@vue/tsconfig/tsconfig.dom.json`，并通过 `paths` 补充 `@my-lego/shared` 与 `@/*` 别名（避免多重继承带来的冲突）。

`packages/craft/tsconfig.json` 和 `tsconfig.node.json` 都**保持不变**，只需要把 `tsconfig.app.json` 修改为下面这样（保留原来的 include/exclude 和 `@/*` 路径别名）：

  ```json
  {
    // 继承 Vue 官方为浏览器应用准备的 preset（DOM lib、bundler 解析等）
    // 实际路径以 @vue/tsconfig 当前版本为准
    "extends": "@vue/tsconfig/tsconfig.dom.json",
  
    // 应用代码和 env 声明文件
    "include": [
      "env.d.ts",
      "src/**/*",
      "src/**/*.vue"
    ],
  
    // 排除测试目录（沿用脚手架默认）
    "exclude": [
      "src/**/__tests__/*"
    ],
  
    "compilerOptions": {
      // TS 增量构建信息，脚手架默认即可
      "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
  
      // 为前端项目补上自己的路径别名：
      // - @my-lego/shared → 指向 monorepo 内的 shared 源码目录
      // - @ → 指向当前包的 src 目录
      "paths": {
        "@my-lego/shared": ["../shared/src"],
        "@/*": ["./src/*"]
      }
    }
  }
  ```

  这样之后的效果：

- 在 craft 里既可以用 `@/xxx`，也可以用 `@my-lego/shared`，并且 TS 会直接跳到 `packages/shared/src`。
- Vue preset 继续负责 DOM lib、`moduleResolution: "bundler"`、`jsx: "preserve"` 等，与 Vite 官方推荐保持一致。
- 根 `tsconfig.base.json` 作为 monorepo 其他包的公共基础；craft 在 app 层通过 `extends` + `paths` 做了更贴合前端项目的组合。


- **7.4 修改 `vite.config.ts`（直连 shared 源码）**

  ```ts
  import { fileURLToPath, URL } from 'node:url'
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'

  // Vite 配置：开发 & 构建 都用源码直连 @my-lego/shared
  export default defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@my-lego/shared': fileURLToPath(
          new URL('../shared/src', import.meta.url)
        )
      }
    }
  })
  ```

  - **效果：**
    - `@my-lego/craft` 中：
      - TS：`@my-lego/shared` 指向 `packages/shared/src`（通过 `paths`）。
      - Vite：`@my-lego/shared` 也指向 `packages/shared/src`（通过 alias）。
    - 整个构建过程**直接打进 shared 源码**，不依赖 `dist`，实现“方案 B”。

- **7.5 配置 `packages/craft/eslint.config.mjs`（Vue flat config + 浏览器 globals）**

  ```bash
  cat > eslint.config.mjs << 'EOF'
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
          ...globals.browser
        }
      }
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
          sourceType: 'module'
        }
      }
    }

    // 如果需要自定义 Vue 项目特有规则，可以在这里为 .vue 单独追加
    // 例如：
    // {
    //   files: ['**/*.vue'],
    //   rules: {
    //     'vue/multi-word-component-names': 'off'
    //   }
    // }
  ]
  EOF
  ```

  - **效果：**
    - `.vue` 文件：
      - 通过 `vue.configs['flat/recommended']` 启用官方 Vue 3 flat 推荐规则（包含模板格式与语义检查）；
      - 利用 `parserOptions.parser = tseslint.parser` 正确解析 `<script lang="ts">` 中的 TypeScript 语法（如 `defineProps<{ msg: string }>()`），避免被当成普通 JS 报解析错误。
      - 模板格式全部由 Vue 规则管理，不再对 `.vue` 使用 `prettier/prettier`。
    - `.ts` / `.js` 文件：
      - 继续通过 `eslint.base.mjs` 应用严格 JS/TS 规则 + `prettier/prettier: 'error'`。

- **7.6 在代码中使用 shared（验证源码直连）**

  在 `src/main.ts` 或任意组件中加入：

  ```ts
  import { formatHello } from '@my-lego/shared'

  console.log(formatHello('Craft'))
  ```

  - **效果：**
    - IDE 中点击 `formatHello`，能跳转到 `packages/shared/src/index.ts`。
    - 运行 `pnpm dev:craft` 打开浏览器，可以在控制台看到 `Hello, Craft!`。

---

#### 步骤 8：根安装依赖与常用命令验证

回到根目录：

```bash
cd ../../
```

- **8.1 安装依赖**

  ```bash
  pnpm install
  ```

  - **效果：**
    - 安装根 devDeps、`shared` 与 `craft` 的依赖；
    - `@my-lego/shared` 通过 `workspace:*` 链接为本地包。

- **8.2 质量检查与格式化**

  - 全仓 lint：

    ```bash
    pnpm lint
    ```

    - `shared`：严格 JS/TS + Prettier（包括 `prettier/prettier: error`）。
    - `craft`：严格 JS/TS（含 Prettier，仅作用于 JS/TS 文件）+ Vue3（`eslint-plugin-vue` flat/recommended，用于 `.vue` 模板和脚本；模板不再启用 `prettier/prettier`）。

  - 全仓 format：

    ```bash
    pnpm format
    ```

- **8.3 构建与开发**

  - 构建 shared：
  
    ```bash
    pnpm --filter @my-lego/shared build
    ```
  
  - 启动 craft 开发服务器：
  
    ```bash
    pnpm dev:craft
    ```
  
  - 构建 craft：
  
    ```bash
    pnpm --filter @my-lego/craft build
    ```
  
  ---
