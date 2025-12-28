---
name: GitHub OAuth2 登录
overview: 在 NestJS 后端新增独立 OAuth 模块接入 GitHub OAuth App，完成授权跳转、回调换 token、获取用户信息、按 email 自动绑定或创建用户，并沿用现有 JWT 签发与 LoginResponse 返回结构，通过 popup+postMessage 方式把登录结果交给前端。
todos:
  - id: decide-module-layout
    content: 采用独立 OauthModule（非 UserModule），并规划 providers/github 的目录结构，确保后续可扩展 gitee/wechat
    status: pending
  - id: env-and-config
    content: 补齐 GitHub OAuth 所需环境变量与 ConfigModule(Joi) 校验项：client_id/secret/callback/frontend_origin
    status: pending
    dependencies:
      - decide-module-layout
  - id: oauth-state-storage
    content: 实现 OAuth state 的生成/Redis 存储/TTL/一次性消费（用于 CSRF 防护与回调上下文）
    status: pending
    dependencies:
      - env-and-config
  - id: github-provider-impl
    content: 实现 GitHub OAuth：authorize URL 拼装、回调换 token、拉取 user 与 emails、提取 email
    status: pending
    dependencies:
      - oauth-state-storage
  - id: user-linking-and-jwt
    content: 实现账号查找/自动绑定/创建策略，并使用 JwtService 签发与现有 LoginResponse 对齐的数据结构
    status: pending
    dependencies:
      - github-provider-impl
  - id: popup-html-response
    content: 实现 callback 返回 HTML + postMessage（使用 @SkipMetaRes 规避 MetaResponse 包装），并固化 targetOrigin 白名单
    status: pending
    dependencies:
      - user-linking-and-jwt
  - id: docs-and-usage
    content: 补充一份 README/文档：GitHub OAuth App 配置、回调 URL、scope、前端 postMessage 接收示例、常见错误排查
    status: pending
    dependencies:
      - popup-html-response
---

# GitHub OAuth2 登录接入方案（仅实现 GitHub）

## 目标与约束

- **目标**：在 `@my-lego/craft-backend` 完成 GitHub OAuth2 第三方登录（Authorization Code flow），登录成功后产出与你们现有一致的 `{ access_token, userInfo }`。
- **交付方式（已确认）**：**popup + `window.opener.postMessage`**（不把 token 暴露在 URL）。
- **账号策略（已确认）**：
- 优先按 `(provider='github', oauthID=githubId)` 查找用户
- 若不存在且**能拿到 GitHub email**，并且该 email 已存在本地邮箱用户，则**自动绑定**（把 `provider/oauthID/type` 写入该用户）
- 否则创建新用户
- **不做**：GitHub Apps、仓库权限管理、后续 GitHub API 能力（仅登录）。

## 为什么用 OAuth App（而不是 GitHub App）

- 你的需求是“第三方登录”。用 **OAuth App** 只需要标准的 OAuth 授权码流程：`authorize -> callback(code) -> exchange token -> get user -> issue our JWT`。
- GitHub 文档说 GitHub Apps 一般更优先，主要面向“更细粒度权限/安装/自动化/更安全 token”等场景；但这会引入安装、私钥/JWT、installation token 等额外步骤，对“只登录”属于超配。
- 参考：GitHub 官方对比说明：[GitHub 应用和 OAuth 应用之间的差异](https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)。

## 模块组织：不放在 UserModule，新增独立 OAuth 模块（推荐）

### 现状

- `UserModule` 已经承载邮箱/手机登录逻辑（`/user/loginByEmail`, `/user/loginByCellphone`）。
- `AuthModule` 目前仅负责 `JwtModule/JwtStrategy`（签发与校验），不承载登录 Controller。
- `User` schema 已包含 `type/provider/oauthID` 字段（可直接用于 OAuth 登录落库）。

### 推荐结构（便于未来扩展 gitee/wechat 等）

新增目录：`packages/craft-backend/src/module/oauth/`

- `oauth.module.ts`
- `oauth.controller.ts`（路由 `GET /oauth/github/authorize`、`GET /oauth/github/callback`）
- `providers/github/github-oauth.service.ts`
- `state/oauth-state.service.ts`（state 存 Redis，TTL）
- `types.ts`（provider profile 类型）

这样：

- `UserModule` 继续专注“用户系统与本地登录”
- `OauthModule` 专注“第三方登录编排”
- 后续新增平台只需加 `providers/<provider>`，不会把 `user` 模块撑大

## 端点设计（结合全局 PREFIX=/api）

- `GET /api/oauth/github/authorize`
- 生成随机 `state`
- 写入 Redis：`state -> { createdAt, mode:'popup', frontendOrigin }`（TTL 5~10 分钟）
- 302 重定向到 GitHub authorize URL
- **使用** `@SkipMetaRes()`，避免 MetaResponse 包装干扰重定向
- `GET /api/oauth/github/callback?code=...&state=...`
- 校验 `state`（Redis 存在且未过期）
- 用 `code` 换取 `access_token`
- 获取 GitHub 用户信息（必要时再查 emails）
- 查找/创建/绑定本地用户
- 签发你们现有 JWT：payload `{ id, username }`
- 返回一段极简 HTML：
    - `window.opener.postMessage({ type:'oauth:github', payload:{ access_token, userInfo } }, frontendOrigin)`
    - `window.close()`
- **使用** `@SkipMetaRes()`，返回原始 HTML（不走 MetaResponse）

## GitHub OAuth 具体流程（手把手步骤）

### A. GitHub OAuth App 设置

- **Authorization callback URL**：设置为后端回调，例如：`http://localhost:<PORT>/api/oauth/github/callback`
- 记录 `Client ID`、`Client Secret`

### B. 后端环境变量（新增）

在 `packages/craft-backend` 的 `.env.*` 中新增（并同步到 `ConfigModule` 的 Joi 校验）：

- `GITHUB_OAUTH_CLIENT_ID`（必填）
- `GITHUB_OAUTH_CLIENT_SECRET`（必填）
- `GITHUB_OAUTH_CALLBACK_URL`（必填，与你在 GitHub App 填的一致）
- `FRONTEND_ORIGIN`（必填，postMessage 的 targetOrigin，例如 `http://localhost:5173`）

### C. scope 选择（为了“按 email 自动绑定”）

- authorize 时请求 `scope=user:email`，以便在 GitHub 用户隐藏 email 时仍可通过 `GET /user/emails` 获取主 email。

## 关键实现伪代码（核心逻辑）

### 1) authorize

```ts
handleAuthorize(req):
  frontendOrigin = ENV.FRONTEND_ORIGIN
  state = randomUUID()
  redis.set(`oauth:github:state:${state}`, JSON.stringify({ frontendOrigin }), TTL=600)

  authorizeUrl = new URL('https://github.com/login/oauth/authorize')
  authorizeUrl.searchParams.set('client_id', ENV.GITHUB_OAUTH_CLIENT_ID)
  authorizeUrl.searchParams.set('redirect_uri', ENV.GITHUB_OAUTH_CALLBACK_URL)
  authorizeUrl.searchParams.set('state', state)
  authorizeUrl.searchParams.set('scope', 'read:user user:email')

  res.redirect(authorizeUrl.toString())
```



### 2) callback

```ts
handleCallback(req, res):
  if (!req.query.code || !req.query.state) throw BizException(oauthBadRequest)

  stateData = redis.get(`oauth:github:state:${state}`)
  if (!stateData) throw BizException(oauthStateExpired)
  redis.del(key) // 一次性

  ghToken = exchangeCodeForToken(code)
  ghUser = fetch('https://api.github.com/user', Authorization: `Bearer ${ghToken}`)

  // email
  email = ghUser.email
  if (!email):
    emails = fetch('https://api.github.com/user/emails', scope user:email)
    email = pickPrimaryVerifiedEmail(emails)

  // find/create/bind
  user = findByProviderOauthID('github', ghUser.id)
  if (!user && email):
    user = findByEmail(email)
    if (user):
      user.provider='github'; user.oauthID=String(ghUser.id); user.type='oauth'; update avatar/nickName
  if (!user):
    user = create({
      username: `github:${ghUser.id}`,
      type:'oauth', provider:'github', oauthID:String(ghUser.id),
      email, nickName: ghUser.name ?? ghUser.login,
      picture: ghUser.avatar_url,
    })

  jwt = jwtService.sign({ id: user.id, username: user.username })

  html = buildPopupPostMessageHtml(frontendOrigin, { access_token: jwt, userInfo: user })
  res.status(200).type('text/html').send(html)
```



## 错误处理与安全点

- **CSRF 防护**：必须使用 `state`；并且 state 必须存在 Redis，且一次性消费。
- **postMessage 安全**：`targetOrigin` 必须是白名单（本方案用 `FRONTEND_ORIGIN`），HTML 内不允许使用 `'*'`。
- **不把 token 放 URL**：采用 popup + postMessage。
- **错误码**：在 `packages/craft-backend/src/common/error/user.error.ts` 增加 GitHub OAuth 相关 `errorKey`（例如 `githubOauthError/oauthStateExpired/oauthBadRequest`）。

## 需要改动/新增的关键文件

- 新增：`packages/craft-backend/src/module/oauth/**`
- 修改：`packages/craft-backend/src/app.module.ts`（注册 `OauthModule`）
- 修改：`packages/craft-backend/src/common/config/config.module.ts`（新增 env 校验项）
- 修改：`packages/craft-backend/src/common/error/user.error.ts`（新增错误码）

## 手动验证步骤（完成后）

- 后端启动后，前端点击“GitHub 登录”按钮：打开 popup 到 `/api/oauth/github/authorize`
- GitHub 授权完成后，popup 自动关闭，主窗口收到 postMessage
