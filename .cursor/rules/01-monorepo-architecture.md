## Rule: my-lego Monorepo 架构与工程约定（2025-12 更新版）

> 本规则覆盖：**monorepo 布局 + TS 别名/继承 + ESLint（无 Prettier）+ 现有 NestJS 后端(craft-backend)硬约定 + 未来 Nuxt/SSR 扩展**。  
> 项目业务对标课程章节目录（但会做技术升级）：[慕课网课程章节目录](https://coding.imooc.com/class/chapter/824.html#Anchor)。

---

### 1) 当前真实项目结构（务必与代码一致）

- **monorepo**：统一使用 `pnpm` + `packages/*` 组织子项目。
- **已落地的子包（当前代码事实）**：
  - `packages/shared` → `@my-lego/shared`：共享 TS 工具库（包含后端密码加密封装 `crypto`）。
  - `packages/craft` → `@my-lego/craft`：前端编辑器（Vue3 + Vite + TS）。
  - `packages/craft-backend` → `@my-lego/craft-backend`：后端服务（NestJS + Mongo + Redis + JWT + MetaResponse + errno 体系）。

---

### 2) 包管理与根脚本（必须遵守）

- **包管理**：只用 `pnpm`，不使用 npm/yarn。
- **workspace**：`pnpm-workspace.yaml` 必须包含 `packages/*`。
- **根脚本语义（以根 `package.json` 为准）**：
  - `pnpm build`：`pnpm -r run build`，对子包逐个构建。
  - `pnpm lint` / `pnpm lint:fix`：对子包执行各自 lint。
  - `pnpm dev:craft`：只启动 `@my-lego/craft`。
  - `pnpm dev:craft-backend`：只启动 `@my-lego/craft-backend`。
- **重要：Prettier 已全仓移除**：
  - 不再维护 `.prettierrc/.prettierignore`。
  - 不再依赖 `prettier` 或 `eslint-plugin-prettier`。
  - “格式化”行为由 **ESLint（含其格式/风格规则）**统一承担。
  - 若根脚本仍存在 `format` 字段，它应视为“待清理/不再使用”，后续新增包**禁止**再引入 Prettier。

---

### 3) TypeScript 总体约定（适用于所有子项目）

- **单一 TS 基础配置**：`tsconfig.base.json` 是全仓底座（strict/paths 等）。
- **路径别名（全仓一致）**：
  - `@my-lego/*` → `packages/*/src`
  - 约定：希望被 `@my-lego/xxx` 导入的包，源码必须放在 `packages/xxx/src`。
- **各子项目 TS 配置**：
  - 必须 `extends: "../../tsconfig.base.json"`（或间接继承）。
  - 只在子 `tsconfig` 中写“差异项”（如 module/moduleResolution/lib/outDir）。
- **前端与后端差异**：
  - 前端（如 `craft`）可使用框架 preset（如 Vue 的 tsconfig dom preset），并以 **extends 数组**组合。
  - 后端（如 `craft-backend`）可使用 `module: CommonJS`（当前即如此）。

---

### 4) ESLint 统一规则（无 Prettier）

- **统一入口**：所有包都必须提供：
  - `scripts.lint`
  - `scripts.lint:fix`
- **风格与格式**：由 ESLint 规则负责（例如 `@antfu/eslint-config` 等），不再通过 Prettier 管理。
- **原则**：
  - 任何“格式统一”需求先通过 ESLint 配置实现；
  - 禁止引入 Prettier 相关依赖来“补救格式”。

---

### 5) `@my-lego/shared`（共享工具库）硬约定

- **定位**：跨前端/后端共享的 TypeScript 工具库。
- **构建**：`tsc -p tsconfig.json` 产出 `dist/*`。
- **导出**：从 `packages/shared/src/index.ts` 统一导出。
- **后端密码加密封装**：
  - 位置：`packages/shared/src/crypto.ts`
  - 入口导出：`packages/shared/src/index.ts` 会导出 crypto（当前实现已如此）
  - 约定：
    - `hashPassword(plain)`：bcryptjs hash
    - `verifyPassword(plain, hash)`：bcryptjs compare
  - **团队约定（强制）**：前端包不得调用 crypto（即使它被入口导出）。如需前端加密/签名，请新增专用前端工具模块，不要复用后端密码 hash。

---

### 6) `@my-lego/craft-backend`（NestJS 后端）硬规则（迁移 eggjs 的核心成果）

> 这一节是“硬约定”：后续新增接口/模块必须按这里实现，否则会造成返回结构/错误码/鉴权行为不一致。

#### 6.1 统一响应：MetaResponse（必须）

- **全局统一返回结构**：`MetaResponse<T>`
  - `code`：业务码（等价旧 egg 的 `returnCode/errno`）
  - `data`：业务数据
  - `message`：提示信息
  - `version`：从 `.env` 的 `VERSION` 读取
  - `traceId`：支持 `x-trace-id` 透传；未传则 uuid 生成；并回写到响应头 `x-trace-id`
  - `requestTime`：毫秒时间戳 `Date.now()`
  - `protocol`：固定 `'default'`
- **成功**：`code = 0`
- **业务失败**：`code = errno`（来自 errorMessages 表）
- **系统异常**：
  - HTTP status 仍然保持（401/404/500…）
  - body 仍然是 MetaResponse，但 `code = httpStatus`
- **controller 编码规则**：
  - controller **只 return 业务 data**（不要手写 `{code,data,message}`）
  - 如需自定义成功 message：使用 `@MetaRes({ message })`
  - 流式/文件下载/手动写响应：必须 `@SkipMetaRes()`（避免 Interceptor 包装导致响应格式错误）
- **实现位置（当前代码事实）**：
  - `src/common/meta/*`：MetaModule + middleware + interceptor + exception filter + decorators

#### 6.2 业务错误码体系：复用 eggjs errno（必须）

- **错误码表**（从 egg 迁移）：
  - `src/common/error/user.error.ts`（以及未来的 work/utils…）
  - `src/common/error/error.registry.ts` 作为 registry
- **业务侧抛错（必须）**：
  - 使用 `BizException`
  - 通过 `errorKey` 查表获取 `{ errno, message }`
- **示例（业务侧）**：
  - 用户已存在：`throw new BizException({ errorKey: 'createUserAlreadyExists' })`
  - 登录校验失败（保持 HTTP 401）：`throw new BizException({ errorKey: 'loginValidateFail', httpStatus: 401 })`
- **ValidationPipe 校验失败的约定（必须）**：
  - 全局 ValidationPipe 通过 `exceptionFactory` 直接抛 `BizException(userValidateFail)`
  - 响应 `data` 必须包含：`{ errors: [...] }`

#### 6.3 数据层（Mongo/Redis/JWT）与迁移约定（必须）

- **Mongo**：
  - `@nestjs/mongoose` 集成
  - `MongoModule.forRootAsync` 从 `.env` 读取连接信息
  - 自增 id（对齐 egg）：
    - `mongoose-sequence`
    - 插件注册在 `MongoModule.forFeatureAsync`（使用 Nest 管理的 Connection）
- **User schema**：
  - `password` 默认 `select: false`
  - 响应 DTO 再 `@Exclude()`，形成双保险
- **Redis**：
  - 使用 `RedisService`
  - 短信验证码：
    - key：`phoneVeriCode-${phoneNumber}`
    - TTL：60s
    - 登录校验成功后必须删除 key（避免复用）
- **JWT**：
  - payload 统一 `{ id, username }`
  - `JwtAuthGuard` 失败抛 `BizException(loginValidateFail, httpStatus=401)`

#### 6.4 模块边界（必须）

- `auth` 模块：只保留 JWT 相关与示例接口 `GET /auth/me`
- `user` 模块：承载业务登录/注册/验证码/获取用户信息，路由前缀 `/user`
- `work` 表结构会保留 schema，但本阶段不补业务接口（当前约定）

#### 6.5 测试与联调（必须遵守拆分）

- `.http` 分文件：
  - `packages/craft-backend/test/http/1.test.http`：基础/infra（redis/mongo/meta demo）
  - `packages/craft-backend/test/http/2.user.http`：用户模块（注册/登录/验证码/鉴权）
- e2e：
  - `packages/craft-backend/test/app.e2e-spec.ts` 断言必须以 MetaResponse 为准（code/data/traceId/requestTime/protocol）

---

### 7) `@my-lego/craft`（Vue3 + Vite）约定（简版）

- `@my-lego/shared` 通过 workspace 依赖使用（源码直连）。
- `lint/lint:fix` 由 ESLint 承担，不依赖 Prettier。
- 仅前端内部别名 `@/*` 由 Vite + TS 配置维护（与 root `@my-lego/*` 并行）。

---

### 8) 未来 Nuxt/SSR 等项目扩展（仍会新增，但要对齐现有约定）

- **未来会新增 SSR（Nuxt）/管理系统等包**，项目内容对标课程章节目录，但技术会升级：[慕课网课程章节目录](https://coding.imooc.com/class/chapter/824.html#Anchor)。
- 新增包的“结构级要求”：
  - 位置：`packages/<name>`
  - 必须提供：`build/lint/lint:fix` 脚本
  - TS：继承 `../../tsconfig.base.json`，并在需要时通过框架 preset 覆盖（如 Nuxt preset 覆盖 moduleResolution/bundler 配置）
  - 共享逻辑优先放 `@my-lego/shared`（但注意不要把后端专用逻辑泄露给前端使用）

---

### 9) 规则维护原则（强制）

- **规则必须跟随代码演进**：当实现与规则不一致时，以“当前实现”为准，并立即更新本规则。
- 本规则是 AI 编码时的“默认约束”：新增/修改任何包时，优先遵守此处约定。


