## Rule: OAuth（GitHub）联合登录流程（Popup + postMessage）（2025-12）

> 目的：让大模型**快速理解当前项目已落地的 GitHub OAuth2 联合登录实现**（以代码事实为准），并在后续改动时不破坏协议、安全约束与现有工程约定。  
> 覆盖范围：`packages/craft-backend/src/module/oauth/*` + `packages/craft/src/views/HomeView.vue` + `packages/craft-backend/views/oauth-login-success.hbs` + `.http` 联调文件。

---

### 1) 真实路由与前缀/版本规则（必须与代码一致）

后端（`@my-lego/craft-backend`）在 `src/main.ts` 中启用了：

- **全局前缀**：来自 env `PREFIX`，默认 `/api`
- **URI 版本**：来自 env `VERSION`（示例联调环境通常为 `v1`）

因此 OAuth 端点的真实路径是：

- `GET /{PREFIX}/{VERSION}/oauth/github/authorize`
- `GET /{PREFIX}/{VERSION}/oauth/github/callback?code=...&state=...`

> 注意：你在 `packages/craft-backend/test/http/http-client.env.json` 中的默认联调环境为：  
> `{{host}}:{{port}}/{{prefix}}/{{version}}`（例如 `http://localhost:3001/api/v1`）。

---

### 2) 核心时序：Popup 打开 → GitHub 授权 → 后端回调 → postMessage 回传

**前端发起（Vue）**：

- 入口：`packages/craft/src/views/HomeView.vue`
- 行为：点击按钮 → `window.open(AUTHORIZE_URL, '_blank')`
- 监听：`window.addEventListener('message', handleMessage)`
- 校验：`event.origin` 必须等于 `BACKEND_ORIGIN`

**后端 authorize（NestJS）**：

- 入口：`packages/craft-backend/src/module/oauth/oauth.controller.ts`
- 路由：`GET /oauth/github/authorize`
- 关键点：
  - 生成 `state`（不可猜测随机值）
  - `state` 写入 Redis（含 TTL），用于防 CSRF / 防回调串线 / 防重放
  - `302 redirect` 到 `https://github.com/login/oauth/authorize?...`

**GitHub 回调后端 callback（NestJS）**：

- 路由：`GET /oauth/github/callback`
- 参数：`code`、`state`
- 关键点：
  - 缺参：抛 `BizException(oauthBadRequest, httpStatus=400)`
  - `consumeState(state)`：从 Redis 读取并**删除**（一次性消费，防重放）
  - `code -> access_token`：请求 `https://github.com/login/oauth/access_token`
  - 获取用户：
    - `GET https://api.github.com/user`
    - 若 `email` 为空：`GET https://api.github.com/user/emails` 取 `primary && verified` 优先
  - 绑定/创建用户（Mongo）+ 签发 JWT（本项目使用 `accessToken` 字段名）
  - 返回 HTML（模板渲染）：`res.render('oauth-login-success', ...)`

**回调页面（HBS）把结果发回 opener**：

- 入口：`packages/craft-backend/views/oauth-login-success.hbs`
- 关键点：
  - `window.opener.postMessage(message, targetOrigin)`
  - 延迟关闭 popup（当前为 3 秒后 `window.close()`）

---

### 3) 必须遵守的协议（Contract）

#### 3.1 postMessage 消息结构（前后端必须一致）

后端发送：

- `type`: `'oauth.github'`
- `payload`: 来自 `GithubOauthService.loginByGithub()` 的返回值

当前 payload 结构（代码事实）：

- `payload.accessToken`: string（JWT）
- `payload.userInfo`: 用户信息对象（Mongo `user.toJSON()`）

前端接收（`HomeView.vue`）当前按以下字段读取：

- `data.type === 'oauth.github'`
- `data.payload.accessToken`
- `data.payload.userInfo`

> 重要：不要把字段名从 `accessToken` 改成 `access_token`，否则会破坏前端现有实现。

#### 3.2 targetOrigin 的来源（当前实现是“固定 origin”）

- Redis payload 字段：`frontOrigin`
- 来源：`GithubOauthService.getFrontendOrigin()`（读取 env `FRONTEND_ORIGIN`）
- 用途：callback 渲染 HTML 时作为 `postMessage(message, targetOrigin)` 的 `targetOrigin`

该设计的意义：

- **必须使用精确 `targetOrigin`**（避免 `'*'` 引入 token 泄漏风险）
- 当前实现为单前端域名/单环境服务（固定回传）
- 若未来要支持多前端域名：建议升级为 `returnUrl/origin + allowlist`（但这不属于当前实现）

---

### 4) 安全与工程约束（必须）

#### 4.1 为什么 `state` 必须存在且一次性消费

对应实现：`packages/craft-backend/src/module/oauth/oauth-state.service.ts`

- **防 CSRF（login CSRF / session swapping）**：防止攻击者把自己的授权结果塞给受害者
- **防回调串线（mix-up）**：多弹窗/多 provider 场景下区分“哪一次发起”
- **防重放**：回调成功后删除 Redis key（一次性消费）
- **TTL**：`STATE_TTL_SECONDS = 10 * 60`，避免长时间授权导致旧 state 被复用

Redis key 约定（代码事实）：

- key：`oauth.state.${state}`
- value：`{ frontOrigin: string, createAt: number }`

#### 4.2 `@SkipMetaRes()` 的含义（很容易踩坑）

OAuth 两个 endpoint 都使用了 `@SkipMetaRes()`：

- `authorize`：返回 302 redirect（不适合 MetaResponse 包装）
- `callback`：返回 HTML（模板渲染，不适合 MetaResponse 包装）

并且这会影响异常输出：

- 全局 `MetaExceptionFilter` 在 `req.__skipMetaRes === true` 时，会尽量返回 **Nest 默认错误格式**
- `BizException` 在该场景下很可能返回**纯字符串 message**（如 `'OAuth 登录已过期，请重试'`），而不是 `{ code, data, message }`

> 结论：写 `.http` 测试时，**不要用 `response.body.code` 去断言 OAuth 的错误响应**，应该断言 `status` 与 `response.body` 字符串内容。

#### 4.3 模板注入安全（HBS + `<script>`）

callback 使用：

- `createSafeJson()`（来自 `@my-lego/shared`）生成可注入 `<script>` 的 JSON
- HBS 使用三花括号 `{{{ ... }}}` 原样输出 JS 字面量

约束：

- **不要直接拼接未经处理的字符串进入 `<script>`**（会引入 XSS/脚本提前闭合风险）
- 若要改动回调页注入方式，必须继续使用“安全 JSON”机制（例如保留 `createSafeJson` 或等价实现）

---

### 5) GitHub OAuth App 配置要点（与当前实现匹配）

对应实现：`packages/craft-backend/src/module/oauth/github-oauth.service.ts`

- `buildAuthorizeUrl(state)` 会带：
  - `client_id`
  - `state`
  - `scope=read:user user:email`
- **没有显式传 `redirect_uri`**（注释说明：默认使用 GitHub OAuth App 后台配置的 callback URL）

因此你必须在 GitHub OAuth App 中配置：

- Authorization callback URL：`http://localhost:{PORT}/{PREFIX}/{VERSION}/oauth/github/callback`

---

### 6) 关键文件索引（大模型改动入口）

- 后端 OAuth 模块：
  - `packages/craft-backend/src/module/oauth/oauth.controller.ts`
  - `packages/craft-backend/src/module/oauth/github-oauth.service.ts`
  - `packages/craft-backend/src/module/oauth/oauth-state.service.ts`
  - `packages/craft-backend/src/module/oauth/types.ts`
- 后端回调页面：
  - `packages/craft-backend/views/oauth-login-success.hbs`
- 前端接收与 UI：
  - `packages/craft/src/views/HomeView.vue`
  - `packages/craft/src/stores/userInfo.ts`
- 联调脚本：
  - `packages/craft-backend/test/http/http-client.env.json`
  - `packages/craft-backend/test/http/3.oauth.http`


