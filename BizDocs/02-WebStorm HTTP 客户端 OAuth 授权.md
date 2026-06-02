# WebStorm HTTP 客户端 OAuth 授权
_Exported on 2025/12/31 at GMT+8 16:26:30 from Cursor (2.2.43)_

---

**User**

https://www.jetbrains.com/zh-cn/help/idea/2025.3/oauth-2-0-authorization.html#authentication-configuration-parameters 这是webstorm的HTTP 客户端OAuth 2.0 授权指南。我使用的是webstorm。
现在@packages/craft-backend/test/http/3.oauth.http 中写的很简陋且需要手动调用还需要借助浏览器，能否改成像指南中的一样方便？

@.cursor/rules/02-project-oauth-login-flow.md 
@packages/craft-backend/src/module/oauth @packages/craft-backend/test/http/3.oauth.http 

---

**Cursor**

目标是把现在 `3.oauth.http` 里“必须外部浏览器 + 手动复制 code/state”的联调方式，升级成 **WebStorm HTTP Client 一键获取 Token/自动带 Authorization** 的体验（参考 JetBrains 的 OAuth2 配置能力）。  
我先快速读一下当前 OAuth 模块实现、HTTP Client 环境文件、回调模板，确认我们能否“直接用 WebStorm OAuth2”还是需要补一个“面向测试的 token/exchange 端点”。接着我会给你 2-3 个可选方案（含利弊/安全边界/需要改哪些文件）+ 详细伪代码，等你确认后再开始编码。

我已经确认了现状：后端现有 `authorize/callback` 是**面向前端 Popup + postMessage** 的（callback 返回 HTML，不适合 WebStorm 直接拿到 code/token）。下一步我会在 `test/http` 里看看你们现有 `.http` 的 token 写法/断言习惯，然后给你一个“WebStorm OAuth2 一键拿 GitHub token → 自动换取本项目 JWT → 后续请求自动带 JWT”的详细方案与伪代码（会引用 JetBrains OAuth2 指南里的配置方式）。

### 结论（能做到，但需要“补一小段后端能力”）
你现在这套 `authorize → GitHub → callback(返回HTML+postMessage)` 是**给前端 Popup 用**的，WebStorm HTTP Client **没法**从这段 HTML 回调里“自动提取 code/state/token”，所以 `.http` 才不得不依赖外部浏览器手动复制。

要实现你说的“像指南里一样方便”（运行请求→IDE 内置浏览器完成授权→HTTP 请求里直接 `{{$auth.token(...)}}`），正确做法是：

- **让 WebStorm HTTP Client 直接对 GitHub 做 OAuth2**（用它内置的 OAuth2 能力，见 JetBrains 指南：[`OAuth 2.0 授权`](https://www.jetbrains.com/zh-cn/help/idea/2025.3/oauth-2-0-authorization.html#authentication-configuration-parameters)）
- 然后**新增一个后端“exchange”接口**：用 GitHub access token 换取本项目 JWT（`accessToken`），从而后续所有后端接口请求都能自动带 JWT。

> 这样你在 WebStorm 里点一下运行：IDE 帮你搞定 GitHub 授权/缓存 token；再点一下 exchange：自动拿到本项目 JWT；后面所有 `.http` 复用 `Authorization: Bearer {{accessToken}}` 即可。

---

### 推荐方案（A）：WebStorm 用 GitHub **Device Authorization**，后端提供 `exchange`
**为什么推荐 Device Flow**：它不依赖 redirect_uri，也更不容易和你现有 GitHub OAuth App callback 配置冲突；WebStorm 也原生支持（见同一篇指南里的 Grant Type 支持列表）。

#### 你最终会得到的体验（`.http` 视角）
- `Authorization: Bearer {{$auth.token("github_device")}}` 直接拿到 **GitHub access token**
- 调用 `POST /oauth/github/exchange` 自动换到 **本项目 JWT** 并 `client.global.set("accessToken", ...)`
- 后续请求继续复用你们现在的写法：`Authorization: Bearer {{accessToken}}`（和 `2.user.http` 一致）

---

### 备选方案（B）：WebStorm 用 GitHub **Authorization Code**
也能做，但一般需要你在 GitHub OAuth App 里把 WebStorm 所用的 redirect URL 配好（容易和当前“后端 callback URL”发生配置冲突/不一致），所以我不优先推荐。

---

### 详细实施计划（确认后我再开始写代码）
#### 1) 后端新增一个“换票接口”（不影响现有 Popup 流程）
- 新增：`POST /{PREFIX}/{VERSION}/oauth/github/exchange`
- 入参：从请求头读取 `Authorization: Bearer <github_access_token>`
- 逻辑：用 GitHub access token 调 GitHub API 获取用户信息/邮箱 → 复用现有绑定/创建用户逻辑 → 签发本项目 JWT（字段名保持 `accessToken`）→ 返回标准 MetaResponse（与你们 `/user/loginByEmail` 一致）

#### 2) WebStorm HTTP Client 环境文件增加 OAuth2 认证配置
- 修改 `packages/craft-backend/test/http/http-client.env.json`，在 `dev` 环境下新增 `Security.Auth.github_device` 配置（按 JetBrains 指南的结构）
- 新增一个私密文件（例如 `http-client.private.env.json`）放 `github_oauth_client_id/secret`，并把它加入 `.gitignore`，避免泄露

#### 3) 重写/增强 `3.oauth.http`
- 保留你现有 1) authorize 302、2) callback 缺参、3) callback state 过期 这三段（它们是重要契约测试）
- 新增一段 “4) WebStorm 一键 OAuth → exchange → 自动写入 {{accessToken}}”
- 新增一段 “5) 用刚写入的 {{accessToken}} 调任意 JWT 保护接口（比如 `/user/me`）”

---

### 伪代码（足够细，方便你审核）
#### 后端：`OauthController`
```ts
POST /oauth/github/exchange
  const authorization = req.headers['authorization']
  if (!authorization) throw BizException(oauthBadRequest, 400)

  const githubAccessToken = parseBearerToken(authorization)
  if (!githubAccessToken) throw BizException(oauthBadRequest, 400)

  // 返回结构要对齐 LoginResponseDto：{ accessToken, userInfo }
  return githubOauthService.loginByGithubAccessToken(githubAccessToken)
```

#### 后端：`GithubOauthService`
```ts
public loginByGithubAccessToken(githubAccessToken)
  githubUser = fetchGithubUser(githubAccessToken)
  githubUser.email = resolveGithubEmail(githubAccessToken, githubUser)
  user = findOrCreateOrBindUser(githubUser)
  jwt = authTokenService.signAccessToken(user)
  return { accessToken: jwt, userInfo: user }
```

#### WebStorm：`http-client.env.json`
```json
{
  "dev": {
    "host": "http://localhost",
    "port": "3001",
    "prefix": "api",
    "version": "v1",
    "Security": {
      "Auth": {
        "github_device": {
          "Type": "OAuth2",
          "Grant Type": "Device Authorization",
          "Device Authorization URL": "https://github.com/login/device/code",
          "Token URL": "https://github.com/login/oauth/access_token",
          "Client ID": "{{github_oauth_client_id}}",
          "Client Secret": "{{github_oauth_client_secret}}",
          "Scope": "read:user user:email"
        }
      }
    }
  }
}
```

#### `.http`：一键换取本项目 JWT
```http
### OAuth(GitHub) - WebStorm 一键：GitHub OAuth2 → exchange → 得到本项目 accessToken(JWT)
POST {{host}}:{{port}}/{{prefix}}/{{version}}/oauth/github/exchange
Authorization: Bearer {{$auth.token("github_device")}}

> {%
  client.global.set("accessToken", response.body.data.accessToken);
%}
```

---

### 需要你确认的点（你回我“选 A/选 B + 是否接受新增接口”即可）
- **你希望走推荐的 A（Device Authorization）吗？**（我建议选 A）
- **可以接受后端新增一个 `POST /oauth/github/exchange` 专门用于“工具/HTTP Client 登录换 JWT”吗？**（不会改动现有 Popup 协议）
- **`exchange` 的响应是否按你们现有风格走 `@MetaRes + @Serialize(LoginResponseDto)`（即 `.http` 里用 `response.body.data.accessToken`）？**我建议是。

你确认后，我再开始改代码与 `.http` 文件，并保证注释清晰、不会破坏 `.cursor/rules/02-project-oauth-login-flow.md` 里定义的现有前后端契约。

```typescript
POST /oauth/github/exchange
  const authorization = req.headers['authorization']
  if (!authorization) throw BizException(oauthBadRequest, 400)

  const githubAccessToken = parseBearerToken(authorization)
  if (!githubAccessToken) throw BizException(oauthBadRequest, 400)

  // 返回结构要对齐 LoginResponseDto：{ accessToken, userInfo }
  return githubOauthService.loginByGithubAccessToken(githubAccessToken)
```

```typescript
public loginByGithubAccessToken(githubAccessToken)
  githubUser = fetchGithubUser(githubAccessToken)
  githubUser.email = resolveGithubEmail(githubAccessToken, githubUser)
  user = findOrCreateOrBindUser(githubUser)
  jwt = authTokenService.signAccessToken(user)
  return { accessToken: jwt, userInfo: user }
```

```json
{
  "dev": {
    "host": "http://localhost",
    "port": "3001",
    "prefix": "api",
    "version": "v1",
    "Security": {
      "Auth": {
        "github_device": {
          "Type": "OAuth2",
          "Grant Type": "Device Authorization",
          "Device Authorization URL": "https://github.com/login/device/code",
          "Token URL": "https://github.com/login/oauth/access_token",
          "Client ID": "{{github_oauth_client_id}}",
          "Client Secret": "{{github_oauth_client_secret}}",
          "Scope": "read:user user:email"
        }
      }
    }
  }
}
```

```plaintext
### OAuth(GitHub) - WebStorm 一键：GitHub OAuth2 → exchange → 得到本项目 accessToken(JWT)
POST {{host}}:{{port}}/{{prefix}}/{{version}}/oauth/github/exchange
Authorization: Bearer {{$auth.token("github_device")}}

> {%
  client.global.set("accessToken", response.body.data.accessToken);
%}
```

