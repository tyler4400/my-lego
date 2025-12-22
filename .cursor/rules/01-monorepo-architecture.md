## Rule: my-lego Monorepo 基础架构与约定（含背景与长期目标）

### 背景与整体目标

- 项目来源：
  - 基于慕课网课程《从 0 实现乐高活动平台（Vue3 + Node）》进行现代化重构。
  - 使用 **pnpm monorepo** 管理多个前端/后端子项目，而不是单一项目。
- 当前与未来子项目规划（示例，不限于此）：
  - 已有：
    - `@my-lego/shared`：共享 TypeScript 工具库。
    - `@my-lego/craft`：乐高页面编辑器前端（Vue3 + Vite + TS）。
  - 未来会新增（示例）：
    - 基于 **NestJS** 的后端服务包（例如 API、后台管理服务等）。
    - 基于 **Nuxt** 的 SSR / BFF / 站点类前端包。
    - 其他工具类、管理端、脚本类子项目。
- 长期整体目标：
  - **统一技术底座**：
    - 全仓共用一套 TypeScript / ESLint / Prettier / 测试工具版本与规则；
    - 不同技术栈（Vue、Nuxt、NestJS 等）在此基础上做“薄差异层”。
  - **统一包间协作方式**：
    - 所有业务/服务/前端项目通过 workspace 依赖与 TS 路径别名共享代码；
    - 允许多个前端/后端包复用 `@my-lego/shared` 等基础库，降低重复实现。
  - **统一质量保障入口**：
    - 根级 `pnpm build / lint / format / dev:*`，能一条命令覆盖整个 monorepo。

> 本规则聚焦：**monorepo + TS + ESLint + Prettier + alias 与包结构的总体约定**，适用于当前及未来所有子项目（包括 NestJS、Nuxt 等）。其他专题（例如“后端接口规范”、“UI 组件规范”）会在单独的 cursor rule 中补充。

---

### 包管理与根脚本

- **统一使用 pnpm**：
  - 不使用 npm / yarn。
  - 所有子项目一律放在 `packages/*` 下，通过脚手架或 `pnpm init` 创建。
- **pnpm workspace**：
  - `pnpm-workspace.yaml`：
    - `packages: ["packages/*"]`，所有子包必须位于该范围。
- **根 `package.json` 脚本语义（适用于当前与未来所有子包）**：
  - `build`：`pnpm -r run build`，对所有子包执行各自的 `build`。
  - `lint`：`pnpm -r run lint`，全仓 lint。
  - `format`：`pnpm -r run format`，全仓格式化。
  - `dev:craft`：`pnpm --filter @my-lego/craft dev`，当前仅用于前端 craft；未来如需其它 dev 脚本，命名应保持清晰前缀（如 `dev:api`、`dev:nuxt`）。
- 新增子项目时：
  - 必须为其补充 `scripts.build / lint / format`（以便被根脚本 `pnpm -r` 调用）。

---

### TypeScript 总体约定（适用于所有子项目）

- **单一 TS 基础配置：`tsconfig.base.json`**：
  - 全仓通用的默认选项必须集中在此文件中：
    - `target: "ESNext"`
    - `module: "ESNext"`
    - `moduleResolution: "Node"`（默认 Node 环境；前端包可在子 tsconfig 覆盖为 bundler）。
    - 严格模式：`strict: true`、`forceConsistentCasingInFileNames: true` 等。
    - 编译辅助：`esModuleInterop`, `allowSyntheticDefaultImports`, `resolveJsonModule`, `isolatedModules`, `skipLibCheck`。
    - 公共库：`lib: ["ESNext", "DOM"]`。
    - 路径别名：
      - `baseUrl: "."`
      - `paths: { "@my-lego/*": ["packages/*/src"] }`
      - 约定：任意包希望被以 `@my-lego/xxx` 方式导入，其源码必须在 `packages/xxx/src` 下。
  - 子项目 **禁止拷贝粘贴** 这些通用选项；如需差异，必须通过“继承 + 覆盖”方式说明清楚。
- **根 `tsconfig.json`（Project References 总入口）**：
  - 仅做两件事：
    - `extends: "./tsconfig.base.json"`；
    - 维护所有子项目的 `references`：
      - 如：`./packages/shared`、`./packages/craft`，未来还会新增 NestJS、Nuxt 等路径。
  - 新增任何子项目（不论前端还是后端），**必须**在这里追加对应的 reference。
- **子项目 TS 继承规则**：
  - 每个包自己的 `tsconfig.json`（或 `tsconfig.app.json` 等变体）都应：
    - 直接或间接 `extends: "../../tsconfig.base.json"`；
    - 只在 `compilerOptions` 中补充该包“环境/输出/paths/类型声明”等 **差异性配置**；
  - 对于前端应用（如 Vue、Nuxt）可以额外继承官方 preset（例如 `@vue/tsconfig`、Nuxt 官方 tsconfig），采用 **extends 数组**：
    - 先继承 `../../tsconfig.base.json`，再继承框架 preset，由后者覆盖前者中与该框架不匹配的部分。

---

### `@my-lego/shared`（TS 工具库）规则

- 位置：`packages/shared`。
- `package.json`：
  - 名称固定为 `@my-lego/shared`。
  - `scripts`：
    - `build`: `tsc -p tsconfig.json`
    - `lint`: `eslint .`
    - `format`: `prettier --write .`
- `tsconfig.json`：
  - **必须继承根 base**：
    - `extends: "../../tsconfig.base.json"`
  - 仅在 `compilerOptions` 中补充库特有设置：
    - `rootDir: "src"`
    - `outDir: "dist"`
    - `declaration: true`, `declarationMap: true`
  - `include: ["src"]`，`exclude: ["dist", "node_modules"]`。
- 构建与消费：
  - `build` 产生 `dist` 下的 JS + d.ts，供未来单独发布；
  - monorepo 内部（如 `@my-lego/craft`）通过 **源码直连** 使用 `packages/shared/src`，不强依赖 `dist`。
- 约束扩展：
  - 未来若新增其他共享库（例如 `@my-lego/domain`, `@my-lego/server-utils` 等），应参考 `@my-lego/shared` 的模式：
    - 统一使用 `tsc -p tsconfig.json` 构建；
    - 统一继承 `tsconfig.base.json`；
    - 统一由根 `tsconfig.json` 和 `pnpm-workspace.yaml` 管理。

---

### `@my-lego/craft`（Vue3 + Vite 应用）规则

- 位置：`packages/craft`。
- `package.json`：
  - 名称固定为 `@my-lego/craft`。
  - 依赖中通过 `"@my-lego/shared": "workspace:*"` 引用共享库。
  - 保留并遵守脚手架生成的脚本语义（`dev/build/preview/test:unit/type-check` 等）。
- TS 配置文件职责划分：
  - `tsconfig.json`：
    - **仅维护 project references**：
      - `files: []`
      - `references` 指向：
        - `./tsconfig.node.json`
        - `./tsconfig.app.json`
        - `./tsconfig.vitest.json`
    - 不在这里写 `compilerOptions`。
  - `tsconfig.node.json`：
    - 继承 `@tsconfig/node24/tsconfig.json`；
    - 只管 Node 侧文件（`vite.config.*`、`vitest.config.*` 等），不处理浏览器代码。
  - `tsconfig.app.json`（核心应用 TS 配置，**编辑 `src/**` 时主要看它**）：
    - 使用 **extends 数组** 同时继承：
      - `../../tsconfig.base.json`（monorepo 统一规则 + `@my-lego/*` 别名）；
      - `@vue/tsconfig/tsconfig.dom.json`（Vue 官方浏览器应用 preset，包含 DOM lib、`moduleResolution: "bundler"`、`jsx: "preserve"` 等）。
    - 保留 include/exclude：
      - `include`: `["env.d.ts", "src/**/*", "src/**/*.vue"]`
      - `exclude`: `["src/**/__tests__/*"]`
    - `compilerOptions` 仅做 craft 特有补充：
      - `tsBuildInfoFile` 指向 `./node_modules/.tmp/tsconfig.app.tsbuildinfo`。
      - `paths` 增加前端内部别名：
        - `"@/*": ["./src/*"]`
      - （可按需要补充 `types: ["vite/client"]` 等环境类型，但保持最小必要原则）。
- 约束：
  - 不在 `tsconfig.app.json` 重复粘贴 `tsconfig.base.json` 里的公共配置；
  - 如需覆盖 `moduleResolution` 等字段，优先通过 **Vue preset 覆盖**，不要手动硬写与 preset 冲突的值。

---

### 未来子项目（NestJS、Nuxt 等）的延展规则

> 以下是对未来新增后端/SSR 包的“结构级”要求，不是具体业务/接口规范。

- **通用原则**：
  - 不论是 NestJS 后端、Nuxt 应用，还是其他脚本/服务包，都应：
    - 使用 `pnpm` 作为依赖管理；
    - 放在 `packages/*` 下；
    - 为包定义 `build/lint/format` 脚本；
    - 在根 `tsconfig.json` 的 `references` 中登记；
    - 在各自包内的 `tsconfig` 中继承 `../../tsconfig.base.json`。
- **NestJS / Node 后端项目（示例命名：`@my-lego/api`）**：
  - 建议 tsconfig 结构：
    - `packages/api/tsconfig.json`：
      - `extends: "../../tsconfig.base.json"`；
      - 根据 NestJS 官方 `tsconfig.build.json` 等模板，覆盖：
        - `module`: `"CommonJS"` 或 `"NodeNext"`（按 NestJS 推荐）；
        - `moduleResolution`: `"Node"`；
        - `lib`: 至少包含 `"ES2020"`，不需要 DOM；
        - `types`: `["node"]` 或 Nest 官方建议类型。
    - 如果使用 Nest 官方脚手架生成的多个 tsconfig（`tsconfig.app.json`、`tsconfig.build.json` 等），应保持：
      - 最终“入口” tsconfig 仍通过 extends 链接回 `../../tsconfig.base.json`；
      - Nest 官方模板中的差异项仅覆盖必要字段。
  - 与前端共享代码：
    - 尽可能通过 `@my-lego/shared` 等共享库进行逻辑复用，而不是在后端单独维护重复工具。
- **Nuxt / 其他 SSR 前端项目（示例命名：`@my-lego/nuxt`）**：
  - 推荐模式与 `@my-lego/craft` 类似：
    - 使用 Nuxt 官方 tsconfig preset（如 `@nuxt/tsconfig`），与 root base 组成 **extends 数组**：
      - `[ "../../tsconfig.base.json", "@nuxt/tsconfig/xxx" ]`；
      - 由 Nuxt preset 覆盖 `moduleResolution` / `jsx` / DOM lib 等前端特化配置。
    - 在包内 `compilerOptions.paths` 中：
      - 补充 `@/*` → 当前包的源码根目录（通常是 `src` 或 Nuxt 默认目录）；
      - 通过根级 `@my-lego/*` 路径别名连接共享库或其他内部包。
  - 构建与运行命令应通过根脚本透传，例如未来可能增加：
    - `dev:nuxt`、`build:nuxt` 等（命名模式与 `dev:craft` 保持一致）。

---

### 路径别名与 Vite/工具链 alias（总规则）

- 所有环境（前端、后端、脚本）都应遵循：
  - **TS 层面统一别名**：`@my-lego/*` → `packages/*/src`（由 `tsconfig.base.json` 定义）。
  - 每个前端 app（Vite、Nuxt 等）再加：
    - 本地 `@/*` → 当前包的源代码根目录（通常是 `src`）。
- 对于不同打包工具：
  - **Vite**：`resolve.alias` 必须映射到与 TS `paths` 相同的真实路径；
  - **Nuxt / Webpack / NestJS（如果需要路径别名）**：
    - 应在各自配置（`nuxt.config.ts`、`webpack.config.ts`、`nest-cli.json` 等）中配置相同 alias；
    - 避免“TS 能跳转，运行时 404/找不到模块”。

---

### ESLint 与 Prettier 总体约定（跨子项目）

- 根 `eslint.base.mjs` 定义通用 JS/TS + Prettier 行为：
  - 所有子项目的 `eslint.config.mjs` 必须基于它展开（通常 `...baseConfig` 再追加子项目特有块）。
- 子项目扩展方式：
  - 前端（Vue、Nuxt 等）：
    - 在 `eslint.config.mjs` 中引入相应框架的 flat config（如 `eslint-plugin-vue`，未来可引入 Nuxt 推荐配置）；
    - 确保 `.vue` / `.nuxt` 特定文件类型由框架规则解析；
    - 模板类文件一般不再使用 `prettier/prettier`，以框架规则为主。
  - 后端（NestJS 等）：
    - 在 `eslint.config.mjs` 中为 Node 环境增加 `globals.node` 或对应 runtime 的 globals；
    - 视需要添加安全性/风格特有规则（如禁止 `console.log`、统一日志器等）。
- 全仓格式统一：
  - `.prettierrc` 在根维护，所有包使用相同格式风格（单引号、无分号、trailing comma 等）。

---

### 质量检查与命令（适用于现在和未来）

- 根命令始终为“单一入口”：
  - `pnpm lint`：全仓 lint（所有子项目）。
  - `pnpm format`：全仓格式化。
  - `pnpm build`：对所有包执行构建。
  - 各子项目的 `dev:*` / `build:*` 统一通过 `pnpm --filter 包名` 调用。
- 新增子项目（NestJS、Nuxt 等）时：
  - 必须思考它如何被接入现有命令体系：
    - 是否需要额外的根级 dev 命令（如 `dev:api`、`dev:nuxt`）；
    - 它的 `build/lint/format` 脚本如何被 `pnpm -r` 正确调用。

---

### 与其他 cursor rules 的关系

- 本规则只关心：
  - monorepo 布局；
  - TypeScript / ESLint / Prettier 统一策略；
  - alias / 包间协作的整体约定；
  - 对未来子项目（NestJS、Nuxt 等）的结构级约束。
- 未来可以为以下主题创建独立 cursor rule：
  - 后端 API 设计与错误处理规范（NestJS）；
  - 前端 UI/UX 设计规范（组件、状态管理、路由结构等）；
  - 部署与 CICD 规范；
  - 业务领域建模规则等。
- 当代码实现与本规则不一致时：
  - 以当前实现为准；
  - 优先同步更新本规则与 `docs/my-lego Monorepo 项目搭建指南.md`，保持“文档 = 代码的设计意图`。



