# Adding nuxt4 project to pnpm monorepo
_Exported on 2026/6/19 at GMT+8 18:52:18 from Cursor (3.7.36)_

---

**User**

这是一个pnpm的monorepo， 我想再加一个nuxt4项目，作为后台admin，叫做craft-admin，应该怎么做

---

**Cursor**

我先了解一下当前 monorepo 的结构和配置，再给你方案。

我了解一下现有 `packages` 目录的结构和已有项目的配置细节，确保新项目和现有约定保持一致。

`eslint.base.mjs` 没找到，我查一下实际的 ESLint 配置位置，以及现有三个 package 的配置。

现在读取 ESLint flat config、Prettier 配置和已有项目的 tsconfig，弄清楚现有约定（特别是 `@antfu/eslint-config` 是怎么用的）。

我看一下根目录是否有 `.npmrc`（Nuxt + pnpm 集成关键）、Node 引擎约定，以及 `craft` 是怎么把 `@my-lego/shared` 源码直连的，这会影响 admin 的方案细节。

我看一下 `craft` 的 Vite 是怎么 alias `@my-lego/shared` 的，同时联网确认 Nuxt 4 当前的脚手架命令与 monorepo 注意事项，确保给你的方案是准确的。

已经摸清现状了，给你方案。

## 现状（关键约定）

- `pnpm-workspace.yaml` 只纳管 `packages/*`，现有三个包 `@my-lego/shared`（纯 TS 库）、`@my-lego/craft`（Vue3+Vite）、`@my-lego/craft-backend`（NestJS）。
- ESLint 全仓统一用 **`@antfu/eslint-config`**，每个包一份薄 `eslint.config.mjs`（注意：`BizDocs` 那篇指南里写的是另一套 prettier 方案，已过时，**以实际代码 antfu 为准**）。
- TS：根 `tsconfig.base.json` + 根 `tsconfig.json`（只 references `shared`/`craft`，`craft-backend` 因为是独立 CommonJS/Nest 构建**没纳入** references）。
- `shared` 被 `craft` 通过 Vite `alias` + tsconfig `paths` **源码直连** `../shared/src`。
- 无 `.npmrc` / `.nvmrc` / `packageManager` 字段。

## 推荐方案（Nuxt 4 作为 `@my-lego/craft-admin`）

整体思路：**用官方脚手架生成 Nuxt 4 标准项目 → 做 monorepo 适配**，对齐现有约定（antfu lint、命名、端口、脚本），TS 沿用 Nuxt 自带体系（像 `craft-backend` 一样不强塞进根 references）。

落地步骤（待确认后执行）：

1. 脚手架（不自动装依赖、不初始化 git、不弹模块选择，保持最小）

```bash
pnpm dlx nuxi@latest init packages/craft-admin --packageManager pnpm --no-install --no-modules --no-gitInit
```

2. 改 `packages/craft-admin/package.json`：`name` → `@my-lego/craft-admin`、加 `private: true`、脚本对齐（`dev` 带固定端口），按需加 `"@my-lego/shared": "workspace:*"`。

3. 新建 `packages/craft-admin/eslint.config.mjs`（与其它包同款 antfu）：

```js
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    vue: true,
    typescript: true,
    ignores: ['dist', 'node_modules', '.nuxt', '.output'],
  },
  {
    rules: {
      'jsonc/sort-keys': 'off',
      'antfu/top-level-function': 'off',
      'no-console': 'off',
      'antfu/if-newline': 'off',
    },
  },
)
```

4. `nuxt.config.ts` 里配 `@my-lego/shared` 源码直连（和 craft 一致）+ 固定端口；TS 保持脚手架生成的 `tsconfig.json`（extends `./.nuxt/tsconfig.json`），**不动根 `tsconfig.base.json`**。

5. 根 `package.json` 加 `"dev:craft-admin": "pnpm --filter @my-lego/craft-admin dev"`；回根 `pnpm install`（Nuxt 的 `postinstall: nuxt prepare` 可能需要往 `pnpm-workspace.yaml` 的 `allowBuilds` 补 `nuxt` 等，按安装提示处理）。

## 需要你确认的点（括号内为我的推荐）

1. 目录位置：`packages/craft-admin`（推荐，无需改 workspace） / 还是新建 `apps/craft-admin`（需改 `pnpm-workspace.yaml`）？
2. 创建方式：官方脚手架 + 适配（推荐） / 纯手动最小搭建？
3. ESLint：沿用 `@antfu/eslint-config`（推荐，全仓一致） / 改用 Nuxt 自带 `@nuxt/eslint`？
4. 是否现在接入 `@my-lego/shared` 源码直连（推荐：接入）？
5. dev 端口：`3001`（推荐，避开 backend 3000 / craft 5173） / 你指定？
6. UI 库：先不装保持最小（推荐，确认后再加） / 直接上 `ant-design-vue`（与 craft 一致） / 或 `@nuxt/ui`、`Element Plus`、`Naive UI`？

懒得逐条回的话，回一句「**全部按推荐**」我就开干；个别想改的单独说（如「6 用 ant-design-vue」）即可。

---

**User**

问题3， 两者会有什么区别， 使用全仓一致的antfu eslint会不会兼容nuxt自带的@nuxt/eslint，有无影响
问题5， 端口 3003
其它都推荐。

你不要自己实施，这是一个练手项目，你给我完整步骤和适当说明，我自己来操作

---

**Cursor**

用户让我别实施，只给步骤。我先把两个细节确认准确（根 `.gitignore` 是否已忽略 Nuxt 产物、`shared` 实际导出了什么，方便给使用示例），再组织完整回答。

两个细节确认完毕：根 `.gitignore` 目前**没有**忽略 Nuxt 的 `.nuxt` / `.output`（步骤里要补），`shared` 导出了 `constant / crypto / inputStr / try-catch / utils` 这几组工具（用于后面写验证示例）。下面先回答问题3，再给完整步骤。

---

## 问题3：`@antfu/eslint-config` vs `@nuxt/eslint`，会冲突吗？

### 两者定位不同

| 维度 | `@antfu/eslint-config`（你全仓在用的） | `@nuxt/eslint`（Nuxt 官方模块） |
|---|---|---|
| 本质 | 一份**通用全栈** flat config 预设（JS/TS/Vue/JSON/YAML…） | Nuxt 官方 ESLint **集成模块**，按你的 `nuxt.config` **动态生成**贴合本项目的 config |
| Vue 支持 | 有（通用 Vue3 规则，`vue: true`） | 有（基于 `eslint-plugin-vue` + Nuxt 增强） |
| **是否认识 Nuxt auto-import** | **不认识**（不知道 `useFetch`/`useState`/`navigateTo`/`definePageMeta` 等自动全局） | **认识**，自动把这些全局注入 `languageOptions.globals` |
| 格式化 | 内置 stylistic（用 ESLint 代替 Prettier） | 默认不带，可选开启 |
| 生成方式 | 静态预设 | 读取 `nuxt.config` + 已注册模块动态生成 |

### 会不会冲突？有什么影响？

**关键结论：只用 antfu（不装 `@nuxt/eslint`）完全能跑，影响很小。** 具体说明：

1. **不会"报错级"冲突**——前提是**不要两套都全量启用**。如果同时全量开 antfu + `@nuxt/eslint`，两边都管 Vue、都可能带 stylistic，规则会重叠打架。所以方案就是**全仓只用 antfu 一套**，不引入 `@nuxt/eslint`，自然没有冲突。

2. **唯一的潜在影响：antfu 不认识 Nuxt 的 auto-import 全局**。理论上对 `useFetch()`、`useState()`、`navigateTo()` 这类未显式 import 的全局，可能触发 `no-undef`。但实际上：
   - 这些文件都是 TS/`<script setup lang="ts">`，而 **typescript-eslint 默认关闭 `no-undef`**（交给 `tsc` 检查）；
   - Nuxt 的 `nuxt prepare` 会生成 `.nuxt/imports.d.ts` 等类型声明，`tsc`/IDE 知道这些全局存在。
   - 所以**真实场景下基本不会误报**。练手过程中如果偶尔碰到，再按下面的兜底处理即可。

### 建议（按你选的"全仓一致 antfu"）

- **主方案**：craft-admin 只用 antfu（开 `vue: true`），和其它包保持一致。
- **如果以后真的想要 Nuxt 专属增强**（auto-import 全局识别、Nuxt 页面/组件规则），最佳实践是**让两者协作而非二选一**：装 `@nuxt/eslint` 并设 `config.standalone: false`，它会生成一个 `withNuxt()` helper，把"Nuxt 项目感知部分"叠加到你的 antfu 配置之上：

```js
// 进阶可选（现在不需要做）：antfu + Nuxt 项目感知 合并
import antfu from '@antfu/eslint-config'
// 由 @nuxt/eslint 在 nuxt prepare 时生成，包含 Nuxt auto-import 全局等
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({ vue: true, typescript: true }),
)
```

> 一句话：**现在纯 antfu 即可，不冲突、影响可忽略**；将来若需要 Nuxt 全局识别，用 `withNuxt()` 叠加，而不是换掉 antfu。

---

## 完整搭建步骤（`@my-lego/craft-admin`，端口 3003）

> 最终配置：目录 `packages/craft-admin`、官方脚手架 + 适配、纯 antfu lint、接入 `@my-lego/shared` 源码直连、端口 3003、UI 库先不装。
> 所有命令默认在**仓库根** `/Users/tylerzzheng/projects/lego/my-lego` 执行，除非特别说明。

### 步骤 0：前置确认

- Node 版本满足 craft 的 `engines`（`^20.19.0 || >=22.12.0`），Nuxt 4 也要求 Node 18.18+。用 `node -v` 看一下。
- 确认在干净的工作区（你当前只有两张登录图片是 staged，不影响）。

### 步骤 1：用官方脚手架生成 Nuxt 4 项目

```bash
# 在仓库根执行：生成到 packages/craft-admin
# --no-install：先不装依赖（稍后回根目录统一 pnpm install）
# --no-modules：跳过交互式模块选择，保持最小骨架
# 不传 --gitInit：因为已在 monorepo 的 git 仓库内，不需要再初始化
pnpm dlx nuxi@latest init packages/craft-admin --packageManager pnpm --no-install --no-modules
```

生成后大致结构（Nuxt 4 默认源码在 `app/` 下）：

```text
packages/craft-admin/
  app/
    app.vue
  public/
  nuxt.config.ts
  package.json
  tsconfig.json
  .gitignore
  README.md
```

### 步骤 2：改 `packages/craft-admin/package.json`

把脚手架生成的 `name` 改成 scope 包名，补 `private`、`@my-lego/shared` 依赖和对齐的 lint 脚本。改完大致如下（版本号以脚手架实际生成的为准，不要手填）：

```json
{
  "name": "@my-lego/craft-admin",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "nuxt build",
    "dev": "nuxt dev",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  },
  "dependencies": {
    "@my-lego/shared": "workspace:*",
    "nuxt": "脚手架生成的版本",
    "vue": "脚手架生成的版本",
    "vue-router": "脚手架生成的版本"
  }
}
```

> 说明：
> - `dev` 不用加 `--port`，端口我们统一放到 `nuxt.config.ts`（步骤 4）里，更集中。
> - lint 用 `eslint .`：flat config 会自动识别要检查的文件，无需像旧包那样写 `--ext`。
> - `@my-lego/shared` 用 `workspace:*`，让 pnpm 把它链接到本地包（和 craft/craft-backend 一致）。

### 步骤 3：新建 `packages/craft-admin/eslint.config.mjs`（纯 antfu）

```js
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
```

> `@antfu/eslint-config`、`eslint` 已装在仓库**根** `devDependencies`，子包直接 import 即可，无需在 craft-admin 里单独安装。

### 步骤 4：改 `packages/craft-admin/nuxt.config.ts`（端口 3003 + shared 源码直连）

在脚手架生成的基础上补两块配置：

```ts
import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // 脚手架会自动生成 compatibilityDate，保留它不要删
  compatibilityDate: '脚手架生成的日期',
  devtools: { enabled: true },

  // 固定开发端口为 3003（避开 backend 3000 / craft 5173）
  devServer: {
    port: 3003,
  },

  // 源码直连 @my-lego/shared：开发时改 shared 立即生效，无需先 build
  // 同时作用于 Vite(客户端) 与 Nitro(服务端) 以及生成的 TS paths
  alias: {
    '@my-lego/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
  },
})
```

> 关于 shared 接入方式的权衡（练手时了解一下）：
> - **源码直连（上面这种，推荐、和 craft 一致）**：开发体验好，改 shared 立刻生效。
> - **兜底方案**：万一 SSR/Nitro 端解析 TS 源码报错，有两个选择——① 加 `build: { transpile: ['@my-lego/shared'] }`；或 ② 干脆**去掉上面的 alias**，改为消费已编译产物（`shared` 的 `package.json` 已把 `exports` 指向 `dist/index.js`），此时只需先跑一次 `pnpm --filter @my-lego/shared build` 即可正常 `import`。

### 步骤 5：TypeScript 配置——保持脚手架默认，不动根 references

- craft-admin 的 `tsconfig.json` 保持脚手架生成的样子（它 `extends` Nuxt 自动生成的 `./.nuxt/tsconfig.json`）。
- **不要**把 craft-admin 加进根 `tsconfig.json` 的 `references`——和 `craft-backend` 一样，Nuxt 有自己独立的类型体系/构建，自成一体即可。根 `tsconfig.base.json` 完全不用改。

### 步骤 6：根 `package.json` 加一条 dev 脚本

参照现有 `dev:craft` / `dev:craft-backend` 的写法，在 scripts 里加：

```9:13:package.json
  "scripts": {
    "build": "pnpm -r run build",
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "format": "pnpm -r run format",
    "test:craft": "pnpm --filter @my-lego/craft test:unit",
    "dev:craft": "pnpm --filter @my-lego/craft dev",
    "dev:craft-backend": "pnpm --filter @my-lego/craft-backend dev"
  },
```

在 `dev:craft-backend` 后面加一行：

```json
    "dev:craft-admin": "pnpm --filter @my-lego/craft-admin dev"
```

> 根的 `build` / `lint` 用的是 `pnpm -r`，会自动带上 craft-admin，无需额外改。

### 步骤 7：忽略 Nuxt 产物（确认 `.gitignore`）

`nuxi init` 会在 `packages/craft-admin/.gitignore` 写好 `.nuxt`、`.output`、`.data` 等忽略项，子目录这份就够用。

可选：如果你想在仓库根 `.gitignore` 也兜一层，追加：

```gitignore
# Nuxt
.nuxt
.output
.data
```

> 当前根 `.gitignore` 只有 `node_modules`、`dist`、`dist-ssr` 等，没有 Nuxt 产物；子项目自带的 `.gitignore` 会负责，所以这步是可选保险。

### 步骤 8：回根安装依赖并验证

```bash
# 在仓库根
pnpm install
```

可能遇到的两个提示，按需处理：

1. **`Ignored build scripts ...`**（pnpm 拦截依赖的 build 脚本）：按提示把对应包名加到 `pnpm-workspace.yaml` 的 `allowBuilds` 即可（你现在已有 `esbuild`、`sharp` 等）。
2. **Nuxt 启动报找不到某依赖**（pnpm 严格 node_modules 偶发）：在仓库根 `.npmrc` 加一行 `shamefully-hoist=true` 再重装。⚠️ 它会影响整个 workspace 的 hoist 行为，**非必要不加**，遇到再说。

启动开发服务器：

```bash
pnpm dev:craft-admin
# 打开 http://localhost:3003
```

### 步骤 9：验证 shared 源码直连（可选小测试）

在 `packages/craft-admin/app/app.vue` 里临时引一个 shared 的工具，确认能跳转源码、能正常运行：

```vue
<script setup lang="ts">
// 从 shared 导入工具（具体函数名以 packages/shared/src 实际导出为准）
import { /* 例如 */ } from '@my-lego/shared'
// 在控制台或模板里用一下，验证类型提示 & 运行无报错
</script>
```

> `@my-lego/shared` 导出聚合在 `packages/shared/src/index.ts`，包含 `constant / crypto / inputStr / try-catch / utils` 几组。IDE 里点函数名应能直接跳进 `packages/shared/src`，dev 控制台无报错即接入成功。验证完把临时代码删掉即可。

---

### 验收清单

- `pnpm dev:craft-admin` 能在 `http://localhost:3003` 打开 Nuxt 欢迎页。
- `pnpm --filter @my-lego/craft-admin lint` 无报错（antfu 生效）。
- 从 `@my-lego/shared` import 能跳转到源码、运行无报错。
- `pnpm lint` / `pnpm build`（根）能把 craft-admin 一起带上。

按这个顺序做就行。哪一步卡住了，把报错贴给我，我帮你定位。需要的话，UI 库（`@nuxt/ui` / `ant-design-vue` / `Naive UI`）后面单独加也很简单。

---

**User**

现在已经可以跑起来了，一起都ok。但还有几个问题我挺疑惑的：

像craft和craft-backend的package.json 都显示引入了    "@my-lego/shared": "workspace:*",
为什么craf-admin不用。

@packages/craft-admin/nuxt.config.ts:14-16 alias这里为什么是配置在@packages/craft-admin/nuxt.config.ts ，而不是tsconfig。

我又把shared 源码的直连和 build后产物连接 的两种方式 遗忘了，第一种相当于只是import的时候写了别名，看起来是像导入了一个库，实际只是别名指向的文件路径？ 第二种是真实的import库？ 还有在monorepo中又产生了别的什么影响（又回到了第一个问题）

---

**Cursor**

这三个问题其实是同一根藤上的瓜，串起来一次讲清楚。

---

## 总览：两套独立的"路径解析系统"

理解一切的关键：你的 import 语句要被**两个完全独立的系统**各自解析一次：

| 系统 | 谁在用 | 配置在哪 | 不配会怎样 |
|---|---|---|---|
| **类型系统**（TS/IDE） | `tsc`、`vue-tsc`、VSCode 跳转/补全 | `tsconfig.json` 的 `paths` | 红波浪线、跳转失败、类型推断丢失 |
| **运行/打包系统**（bundler/runtime） | Vite、Nitro、Webpack、Node | bundler 的 `alias` / `node_modules` 解析 | "Cannot find module"，跑不起来 |

**两者互不知道对方的存在**。所以 monorepo 里你看到的所有"奇怪配置"，本质都是在分别喂这两个系统。

---

## 问题2：alias 为什么放 `nuxt.config.ts` 而不是 `tsconfig.json`

按上面"两套系统"的逻辑，正常做法应该是**两边都配**：
- `tsconfig.json` 配 `paths` → 给 TS/IDE
- `nuxt.config.ts` 配 `alias` → 给 Vite/Nitro

**craft 那边就是这么做的**（你看 craft 的 `vite.config.ts` 有 alias，`tsconfig.app.json` 也有 paths，两份）。

但 Nuxt 4 帮你**省掉了一份**——这是 Nuxt 特有的便利：

```text
nuxt.config.ts 里的 alias
        │
        ├── 自动注入到 Vite/Nitro 的 resolve.alias  （运行 / 打包）
        │
        └── nuxt prepare 时，自动同步生成到
            .nuxt/tsconfig.app.json 的 paths       （TS / IDE）
```

你 `packages/craft-admin/tsconfig.json` 里 `references` 的那几个 `./.nuxt/tsconfig.*.json`，就是 `nuxt prepare` 自动生成的——里面已经替你写好了 `paths`。所以你**只配一处就两边都生效了**。

> 验证方法：跑 `pnpm dev:craft-admin` 后看 `packages/craft-admin/.nuxt/tsconfig.app.json`，会发现里面 `paths` 已经有 `@my-lego/shared` 那一项。

---

## 问题3：源码直连 vs build 产物（本质 + monorepo 影响）

你的理解基本到位，我把它讲透。

### 方式 A：源码直连（目前 craft / craft-admin 用的）

```text
你写：    import { foo } from '@my-lego/shared'
                  ↓  bundler 看到 alias 命中
等价于：  import { foo } from '/绝对路径/packages/shared/src/index.ts'
```

- bundler **跳过** Node 模块解析机制（不查 `node_modules`、不看 `package.json` 的 `exports`）
- 直接把 shared 的 **`.ts` 源码**当成自己项目的一部分编译
- 改 `shared/src/xxx.ts` → HMR 立即生效

你的概括完全正确："看起来像导入了一个库，实际只是别名指向的文件路径"。

### 方式 B：build 产物连接（标准 npm 包做法）

```text
你写：    import { foo } from '@my-lego/shared'
                  ↓  走标准 Node 模块解析
                  ↓  在 node_modules 里找到 @my-lego/shared
                  ↓  读 package.json 的 exports / main 字段
等价于：  import { foo } from 'node_modules/@my-lego/shared/dist/index.js'
```

- 必须先 `pnpm --filter @my-lego/shared build` 生成 `dist/`
- 改 shared 源码 → 不会自动生效，要重新 build
- 是"正经地把它当一个 npm 包用"

### 在 monorepo 里的对比

| 维度 | 方式 A 源码直连 | 方式 B build 产物 |
|---|---|---|
| dev 体验 | shared 改了立即热更 | 要 rebuild，dev 体验差 |
| 是否要先 build shared | 不需要 | **必须**先 build，否则 import 失败 |
| `workspace:*` 是否必须 | 理论上可以不写（alias 绕过了 node_modules） | **必须**写（不写连软链都没有） |
| 类型来源 | 直接看 `src/*.ts` | 看 `dist/*.d.ts` |
| 适用场景 | monorepo 内部消费 | 发布到 npm、跨仓库使用 |

**你的 `@my-lego/shared` 其实"两手准备"**：
- `package.json` 里有 `exports.import: dist/index.js` → 支持方式 B（万一发 npm，直接能用）
- 同时 craft/craft-admin 用 alias 走方式 A → 内部开发爽

---

## 问题1：为什么 craft-admin 没写 `"@my-lego/shared": "workspace:*"`

接着上面就好讲了——**这是个该补的疏忽，不是设计差异**。

### 为什么"没写也能跑"

因为你用了**方式 A（alias）**：bundler 直接命中 alias 跳过了 `node_modules` 查找，根本没去问 pnpm "这包在哪"。所以即便没声明依赖，import 也能解析。

类比：你家门牌号系统没登记你的房子（pnpm 不知道 craft-admin 依赖 shared），但你直接拿钥匙开门走进去（alias 直通文件路径）也能住，物业（pnpm/构建工具）只是不知道你存在。

### 为什么 craft / craft-backend 都写了

| 用处 | 说明 |
|---|---|
| **声明意图** | 让人/工具一眼看出"我依赖了 shared"——读 `package.json` 就知道依赖图 |
| **建立软链** | pnpm 会把 `packages/craft-admin/node_modules/@my-lego/shared` 软链到 `packages/shared/`，**作为 alias 失效时的兜底**（万一哪天去掉 alias 切换到方式 B，立即可用） |
| **构建拓扑** | `pnpm -r build` 会按依赖图拓扑排序：先 build shared，再 build 依赖它的包。没声明 → pnpm 不知道有依赖关系 → 顺序可能出错 |
| **filter 命令** | `pnpm --filter '...^@my-lego/shared' build`（"build 所有依赖 shared 的包"）这种命令需要依赖图才能工作 |
| **一致性** | craft / craft-backend 都写了，craft-admin 不写显得突兀 |

### 实操建议（小修正）

往 `packages/craft-admin/package.json` 的 `dependencies` 里补一行，然后回根 `pnpm install`：

```json
{
  "dependencies": {
    "@my-lego/shared": "workspace:*",
    "nuxt": "^4.4.8",
    "vue": "^3.5.35",
    "vue-router": "^5.1.0"
  }
}
```

加了之后行为完全一样（dev 仍走 alias 直连源码），但**意图清晰、构建顺序正确、未来切换无成本**。

---

## 把三个问题串起来的一句话总结

> 你的 monorepo 里，**`workspace:*`** 管"包之间的依赖**关系**"，**`tsconfig.paths`** 管"TS/IDE 怎么找**类型**"，**bundler `alias`** 管"运行时怎么找**代码**"——三件事各管一摊。Nuxt 的好处是把后两件合并成一个 `alias` 配置，但第一件（`workspace:*`）该写还是要写，alias 不能替代它。

---

**User**

我想知道为什么nuxt的自动导入在开发阶段是怎么工作的，原理是什么，比如我这里使用了useState但没有直接导入，为什么webstorm没报错且还能hover的时候显示相关文档@packages/craft-admin/app/app.vue 

---

**Cursor**

这个问题非常好，因为它**同时涉及"类型系统"和"运行/打包系统"两端**——和上次三件事的总结恰好对上。我先把现场证据拉出来，再讲原理。

证据齐了，恰好对应上次说的"两套独立的解析系统"——auto-import 也是**两端各做一件事**。

---

## 总览：两端各自独立做了一件事

| 端 | 解决的问题 | 谁做的 | 在哪 |
|---|---|---|---|
| **类型端** | IDE 不报错 + hover 显示文档 + 跳转 | `nuxt prepare` 生成 `.d.ts` 文件，用 `declare global` 把 API 声明成"全局变量" | `.nuxt/types/imports.d.ts` |
| **运行端** | 代码真能跑起来 | Vite 里的 [unimport](https://github.com/unjs/unimport) 插件，在编译时扫描代码并**真的注入** `import` 语句 | 编译时改写源码 |

**两端互不依赖**：删掉运行端，IDE 仍不报错但跑不起来；删掉类型端，能跑但 IDE 全是红波浪线。Nuxt 在两端共享同一份"可 auto-import 清单"，所以体验一致。

---

## 类型端：为什么 WebStorm 不报错、能 hover 出文档（你的核心问题）

我把现场证据按"信任链"画出来，每一步都能在你机器上验证。

### Step 1：生成的全局声明文件

`packages/craft-admin/.nuxt/types/imports.d.ts`，文件头一行就写着 `// Generated by auto imports`：

```ts
export {}
declare global {
  const useState: typeof import('.../nuxt/dist/app/composables/state').useState
  const useFetch:  typeof import('.../nuxt/dist/app/composables/fetch').useFetch
  const ref:       typeof import('vue').ref
  const computed:  typeof import('vue').computed
  // ... 几百个
}
```

三个关键设计：

- **`declare global { const useState: ... }`**：让 TS 觉得 `useState` 是一个**全局变量**，地位等同于 `window`、`process`，无需 import 就能用。
- **`typeof import('...').useState`**：这是 TS 的"类型导入表达式"——**只取类型，不取值**（不会触发实际 import）。所以 hover 时能看到完整签名 + JSDoc + 跳转到原始 `.d.ts`。
- **顶部 `export {}`**：把这个文件标记为"模块"——这是 TS 语法要求，否则 `declare global` 不生效。

### Step 2：入口声明文件 `.nuxt/nuxt.d.ts` 把它拉进来

```ts
/// <reference path="imports.d.ts" />
/// <reference path="types/imports.d.ts" />     ← 就是 Step 1 那个文件
/// <reference path="types/components.d.ts" />  ← 让 <NuxtWelcome /> 也被识别
export {}
```

`/// <reference path="..." />` 是 TS 的 triple-slash 指令，告诉 tsserver "解析当前文件时，请把这些 .d.ts 也读一遍"。

### Step 3：TS 项目配置把入口拉进编译范围

```json
// packages/craft-admin/.nuxt/tsconfig.app.json
{
  "include": [
    "./nuxt.d.ts",   // ← 第一项就是它
    "../app/**/*",
    ...
  ]
}
```

而你的 `packages/craft-admin/tsconfig.json` 又通过 `references` 指向了 `./.nuxt/tsconfig.app.json`。

### 把这条链拼起来

```text
WebStorm 的 tsserver
   │ 读
   ▼
packages/craft-admin/tsconfig.json
   │ references →
   ▼
packages/craft-admin/.nuxt/tsconfig.app.json
   │ include "./nuxt.d.ts"
   ▼
packages/craft-admin/.nuxt/nuxt.d.ts
   │ /// <reference path="types/imports.d.ts" />
   ▼
packages/craft-admin/.nuxt/types/imports.d.ts
   │ declare global { const useState: typeof import('...').useState }
   ▼
useState 在你的 .vue 文件里成为"全局可用符号"
→ IDE 不报错、hover 显示文档、Cmd+Click 跳转到 nuxt 源码
```

**这一切都在 `.nuxt/` 目录里，且只是 .d.ts 文件——它们对运行时零影响**。

---

## 运行端：代码为什么真的能跑

`declare global` **只骗 TS，不骗运行时**。浏览器执行 JS 时不认识 `useState`，所以必须有人**真的把 import 写进去**。

这一步由 Vite 里集成的 **unimport 插件**完成。每个 `.ts` / `.vue` 文件被 Vite 编译前，插件做三件事：

1. **扫描**：用 AST 找出代码中"被使用但没声明"的标识符（如 `useState`）。
2. **匹配**：拿这些标识符去比对 Nuxt 维护的"可 auto-import 清单"（vue 的 `ref/computed` + nuxt 的 `useState/useFetch` + `app/composables/` 下所有导出 + `app/utils/` 下所有导出 + 各模块贡献的 composable）。
3. **注入**：匹配上的，在文件顶部真的写一行 `import` 进去。

伪代码示意，你 `app.vue` 被 Vite 编译时大致经历：

```ts
// 你写的 <script setup>：
const user = useState('user', () => ({ name: 'admin' }))

// unimport 转换后：
import { useState } from '#app/composables/state'   // ← 自动注入的
const user = useState('user', () => ({ name: 'admin' }))
```

这一步是**纯运行/打包概念**，和 TS/IDE 完全无关。

---

## 你 `app.vue` 当前两条线的对照

```vue
<script lang="ts" setup>
// 显式 import 的 isFunction：
//   类型 ✓ 由 .nuxt/tsconfig.app.json 的 paths "@my-lego/shared" → ../shared/src/index 解析
//   运行 ✓ 由 nuxt.config.ts 的 alias 解析
import { isFunction } from '@my-lego/shared'

// 没 import 的 useState：
//   类型 ✓ 由 .nuxt/types/imports.d.ts 的 declare global 提供
//   运行 ✓ 由 unimport 在 Vite 编译时自动注入 import 语句
const user = useState('user', () => ({ name: 'admin', age: 18 }))
</script>
```

把这张对照和上次的"三件事总结"放一起就完整了：
- `workspace:*` 管 **包依赖关系**
- `tsconfig.paths` / `declare global` 管 **类型解析**
- bundler `alias` / unimport 注入 管 **运行时解析**

---

## 几个你大概率会再问的延伸点

**1. 我自己写的 `composables/` 也能 auto-import 吗？**  
能。Nuxt 4 默认扫 `app/composables/**`、`app/utils/**`，每次 dev 启动 / 文件保存时同步更新到 `.nuxt/types/imports.d.ts`。新写完一个文件就能在别处直接用，IDE 也立即认识。

**2. 如果 `nuxt prepare` 没跑过会怎样？**  
`.nuxt/` 不存在，`useState` 立刻全是红波浪线。你 `package.json` 里有 `"postinstall": "nuxt prepare"`，所以 `pnpm install` 完会自动生成；`nuxt dev` 启动时也会再生成一次。

**3. WebStorm 偶尔抽风认不出怎么办？**  
说明 `.nuxt/types/imports.d.ts` 没生成或被 IDE 缓存住了：
- 跑一次 `pnpm dlx nuxi prepare` 或 `pnpm dev:craft-admin` 让它重新生成。
- WebStorm: File → Invalidate Caches → 重启。

**4. 为什么 antfu ESLint 不报 "useState is not defined"？**（呼应上次"antfu vs @nuxt/eslint"）  
理论上 `no-undef` 会报。但 antfu 对 `.ts` / `.vue` 文件**默认关闭 `no-undef`**（信任 TS 自己检查），刚好规避掉。如果你写 `.js` 就会暴露——这正是 `@nuxt/eslint` 想填补的缺口（它把 auto-import 清单同步注入 ESLint 的 `globals`）。

---

想直观验证的话，在 WebStorm 里直接打开 `packages/craft-admin/.nuxt/types/imports.d.ts`，搜 `useState`——亲眼看到那行 `declare global { const useState: typeof import('...').useState }`，会比任何解释都直观。

---
