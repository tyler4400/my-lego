# GitHub OAuth2 login integration
_Exported on 2025/12/28 at GMT+8 23:33:54 from Cursor (2.2.43)_

---

**User**

目前backend子项目中用户登录的方式有手机，邮箱。现在需要完成oauth2第三方登录，例如GitHub和gitee以及更多。我们本次需求只完成接入GitHub， 完成oauth2登录。

首先，需要确定的是模块组织，如果接入代码都放在用户模块@packages/craft-backend/src/module/user 下，用户模块会特别大。并且后面还可能接入别的第三方登录平台。因此你需要给我方案，我们共同决定最佳实践应该是就放在用户模块还是该什么样子。

其次，我已经在GitHub创建好了GitHub oauth app，但是文档又说GitHub Apps 优先于 OAuth apps https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps 。 我的目的只是想利用oauth app完成第三方登录功能。我不确定该使用GitHub app还是oauth app。使用前者会不会有很多额外的步骤。

最后，假设我们采用oauth app，这是我找到的接入文档https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps 。我还从没接入，我计划是用本项目做练手，学习如何接入。因为，你要手把手，一步步的带我。

如果你有问题，先提出来。没有问题我们就按这个步骤走

---

**Cursor**

我先不写代码，先把现状摸清 + 给出可落地的模块组织与接入方案：我会快速读一下 `craft-backend` 里现有的登录/JWT实现（`auth`/`user` 模块、守卫、token下发方式），再基于你“只做第三方登录”的目标，给出两套模块拆分方案（放 `user` vs 独立 `auth/oauth`），并说明为什么此场景更适合 **GitHub OAuth App** 而不是 **GitHub App**。接着我会只问你 1-2 个关键决策问题，确认后再进入详细步骤/伪代码。

Nice：你们现在的登录完全在 `UserModule`，`AuthModule` 只负责 `JwtModule/JwtStrategy`（不承载登录 controller），并且 token 是通过接口直接返回 `access_token`，不是 cookie。下一步我会再看 `JwtStrategy`、`User` 的 mongoose schema 和错误码定义，来决定 OAuth 登录最小改动点与最佳模块拆分。

我已经把后端现状摸清了：`User` 的 schema 里其实已经预留了 `type: 'oauth'`、`provider`、`oauthID` 字段，而且错误码里也有 `giteeOauthError`，说明你们本来就打算接第三方登录；现在要做 GitHub OAuth 只是把这一块补齐即可。接下来我们需要先统一两件关键决策（返回 token 方式 + 账号绑定策略），确定后我再给你“手把手”的完整接入步骤与伪代码（含回调 URL、state 防 CSRF、Redis state 存储、创建/查找用户、签发 JWT），然后等你确认再开始编码。  

先回答你关于 **GitHub App vs OAuth App**：你的目标只是“第三方登录”，**用 OAuth App 最直接、步骤最少**；GitHub 文档说 GitHub Apps “一般更优先”主要是因为权限更细、令牌更短、更适合自动化与仓库级/组织级集成，但这会引入安装、应用私钥/JWT、installation token 等额外概念与步骤；对“仅登录”来说属于超配。你已经创建了 OAuth App，继续用它完全合理。参考 GitHub 官方对比说明：[GitHub 应用和 OAuth 应用之间的差异](https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps) 。

---

**User**

@.cursor/plans/github_oauth2_登录_12a50bcb.plan.md 这是我在plan模式生成的GitHub接入方案。它只告诉了我怎么做，没有告诉我什么这么做。我之前从没做过第三方接入，我想通过这个练手项目来学习。例如：

为什么要随机生成state？我知道GitHub文档这么要求的，但是为什么呢？ 
还有code_challenge也如同state医院是强烈建议，为什么我们没有使用呢？
为什么要用postmessage， 它解决了什么问题，还有什么方式，最佳实际是什么？

先回答我上面的问题，然后我们再来继续完成接入GitHub。

按照接入方案文档的步骤， 你给我手把手细致入微的完整代码，要做到我只要按照你这个步骤抄写代码，就能完成整个需求。并且需要不仅告诉我怎么做，还要告诉为什么这么做。

如果你还有问题，先提出来，没有问题就按照上面说的来



---

**Cursor**

我先把你问的三个“为什么”讲透：`state` 的安全意义、为什么（以及何时）需要 `code_challenge/PKCE`、以及 `postMessage` 解决的具体问题和替代方案。为了不误导你，我会顺手确认一下 **GitHub OAuth App 是否支持 PKCE 以及官方推荐用法**，再给你对应到我们项目的最佳实践选择。

### 为什么要随机生成 `state`？它解决什么安全问题？
`state` 的本质是：**把“发起登录的人/这一次登录请求”与“回调回来那一次响应”绑定起来**，防止 OAuth 流程被第三方插队或调包。

- **防 CSRF（最核心）**：攻击者可以诱导你在已登录 GitHub 的浏览器里点一个链接，直接命中我们后端的 `/oauth/github/callback?...` 或者走一遍授权流程，把“攻击者自己的 GitHub 授权结果”塞给“受害者的浏览器会话”。  
  - 如果我们不校验 `state`，后端可能会把受害者登录到攻击者账号（典型 **login CSRF / session swapping**）。
  - 有了 `state`：只有“确实由你的站点刚刚发起过 authorize，并在服务端保存过 state”的请求，回调才会被接受。

- **防“回调串线/混淆”（mix-up 类问题）**：当你将来支持多个 provider（GitHub/Gitee/…）或同一浏览器开多个登录弹窗时，`state` 是你区分“这次回调属于哪次发起”的唯一可靠标识。

- **承载“回跳上下文”**：我们方案里把 `frontendOrigin`（以及未来可能的 `returnUrl`）和 `state` 一起放进 Redis，回调时取出，才能做到：
  - postMessage 的 `targetOrigin` 精确白名单（不用 `'*'`）
  - 未来支持“登录后回到原页面”

**最佳实践要点**（你抄代码时会看到这些细节）：
- `state` 必须 **高随机、一次性、短 TTL（如 5-10 分钟）**。
- 回调校验通过后 **立刻删除**（防重放）。

---

### `code_challenge`（PKCE）为什么强烈建议？我们为什么当前方案没用？
PKCE（Proof Key for Code Exchange）主要解决：**“授权码 code 被截获后被别人拿去换 token”** 的风险（authorization code interception）。

- **没有 PKCE 时**：只要有人拿到了 `code`，就有机会去 token 端点兑换 `access_token`（谁先换到谁赢，因为 code 通常只能用一次）。
- **有 PKCE 时**：即使截获了 `code`，攻击者还必须同时拥有 `code_verifier` 才能兑换成功；而 `code_verifier` 只存在于最初发起方（浏览器/后端）手里。

那为什么我们当前方案没上来就用？
- **你现在的流程是“后端作为机密客户端（confidential client）”**：`code -> token` 的交换发生在后端，并且需要 `client_secret`。这已经比“纯前端直连换 token”的安全基线高很多（因为攻击者即使截获 code，也通常还拿不到你的 `client_secret`）。
- **PKCE 仍然可以作为“额外加固”**（不少团队会对机密客户端也上 PKCE），但它会增加实现复杂度：需要生成 `code_verifier`、派生 `code_challenge`、并把 verifier 与 state 一起保存，回调再带上 verifier 去换 token。

我现在不想在“你第一次练手”时把复杂度拉满；**但如果你希望按最新最佳实践一步到位，我们完全可以把 PKCE 加进去**（前提是 GitHub OAuth App 的接口支持并且我们按官方参数拼装——这点我建议在开始写代码前用你选定的 GitHub 官方授权文档再核对一遍）。  
你之前给的对比文档主要讲 GitHub Apps vs OAuth Apps，并不覆盖 PKCE 细节：[GitHub 应用和 OAuth 应用之间的差异](https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps)。

---

### 为什么用 `postMessage`？它解决了什么问题？还有哪些方式？最佳实践是什么？
你现在的交互是“点按钮打开 GitHub 授权页”，这通常是 **popup** 场景。`postMessage` 解决三件事：

- **把登录结果从 popup 安全地传回主窗口**：popup 回调页面运行在你的后端域名下，主窗口是前端域名/路由；同源策略下不能随便互相读写。`window.opener.postMessage` 是浏览器标准的跨窗口通信方式。
- **避免把 token 暴露在 URL**：如果用 `302` 带 token 到前端（query/hash），token 可能进入浏览器历史、代理日志、埋点日志、截图分享等。postMessage 可以让 token 只在 JS 内存中传递。
- **不破坏 SPA 状态**：主窗口不跳转、不刷新，用户授权结束后弹窗自动关闭，体验更接近“原地登录成功”。

常见替代方案（各有取舍）：
1. **redirect + query/hash 带 token**：实现最快，但安全与隐私最差（不推荐）。
2. **BFF 最佳实践：后端在回调里写 httpOnly cookie，然后 302 回前端**：安全性通常最好（token 不落 JS），但你们现有体系是 `Authorization: Bearer`，需要前后端鉴权方式调整。
3. **redirect 回前端只带一次性短码（one-time code），前端再用该短码换 JWT**：避免 token 上 URL，但需要额外一次接口调用与短码存储。
4. **同窗口登录（不 popup）**：回调直接落在前端路由页面，然后前端把 code 发给后端换 JWT（适合纯 SPA + PKCE），但要处理页面刷新与状态恢复。

**结合你们当前“后端签发 JWT + 前端 Bearer”的现状**：popup + postMessage 是一个“实现成本低且安全性不错”的折中；后续你想升级到“cookie/BFF”也很自然。

---

### 我还有 2 个关键确认（确认后我就按你要求给出“可抄写的完整代码 + 为什么这么写”）
1. `FRONTEND_ORIGIN` 你希望配置成什么？（例如 `http://localhost:5173`，以及生产环境域名）
2. PKCE 你想怎么做？
   - a) 先不做 PKCE（先把主流程跑通，后续再加固）
   - b) 这次就加 PKCE（我会按 GitHub 官方授权参数核对后，把 `code_verifier/challenge` 全套带上）

你回复这两点后，我会按你 plan 的步骤，从 **环境变量 → OauthModule → GitHub 换 token → 拉用户/邮箱 → 绑定/创建用户 → 签 JWT → 返回 postMessage HTML → 前端接收示例**，逐段给出你可以直接照抄的完整代码，并在每段代码旁边解释“为什么这么写”。

---

**User**

结合你所说的，我总结的流程如图@docs/04-前后端分离场景的oauth登录步骤.png 所示。

1. 现在还没有生产环境，就按开发环境http://localhost:5173 配置
2. 先不做pkce

继续

---

**Cursor**

收到：`FRONTEND_ORIGIN` 先用 `http://localhost:5173`，PKCE 先不做。接下来我会按你图里的 1→5 流程，给出可以直接照抄的 NestJS 完整代码（含为什么这么写），并确保和你们现有 `MetaResponse/BizException/JWT/Redis/Mongo` 体系兼容。

### 你这张图的流程是对的
它本质是 **“前端开 popup → 后端重定向到 GitHub → GitHub 回调后端 → 后端返回一段 HTML → HTML 用 postMessage 把结果发回前端 → 关闭 popup”**。这正是我们选 `postMessage` 的原因：**不把 token 放 URL**、**不刷新主页面**、**跨窗口安全传数据**。

下面开始“按步骤抄写即可跑通”的实现（先不做 PKCE、`FRONTEND_ORIGIN=http://localhost:5173`）。

---

## 0）准备：GitHub OAuth App 配置
在 GitHub OAuth App 里确认：

- **Authorization callback URL**：`http://localhost:3000/api/oauth/github/callback`
  - `3000` 取决于你后端 `PORT`
  - 你们全局前缀是 `/api`（见 `main.ts` 的 `app.setGlobalPrefix(prefix)`）

---

## 1）配置环境变量（为什么：避免把敏感信息写死在代码里）
在 `packages/craft-backend` 对应的环境文件里加（`ConfigModule` 会读取 `.env.development` 或 `.env`）：

```env
GITHUB_OAUTH_CLIENT_ID=你的ClientID
GITHUB_OAUTH_CLIENT_SECRET=你的ClientSecret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback
FRONTEND_ORIGIN=http://localhost:5173
```

---

## 2）把 env 加进 Joi 校验（为什么：启动时就能发现漏配，而不是运行中报错）
编辑 `packages/craft-backend/src/common/config/config.module.ts`，在 `validationSchema` 里增加 4 个必填项：

```ts
import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().default(3000),

  CORS: Joi.string().valid('true', 'false').default('true'),
  PREFIX: Joi.string().default('/api'),
  VERSION: Joi.string().optional(),

  LOG_ON: Joi.string().valid('true', 'false').default('true'),

  JWT_SECRET: Joi.string().required(),

  TEST_MODULE_ON: Joi.string().valid('true', 'false').default('false'),

  // ===== OAuth (GitHub) =====
  GITHUB_OAUTH_CLIENT_ID: Joi.string().required(),
  GITHUB_OAUTH_CLIENT_SECRET: Joi.string().required(),
  GITHUB_OAUTH_CALLBACK_URL: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().required(),
})

const envFilePath = [`.env.${process.env.NODE_ENV || 'development'}`, '.env']

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      validationSchema,
    }),
  ],
})
export class ConfigModule {}
```

---

## 3）补充错误码（为什么：沿用你们 BizException + MetaResponse 的统一错误体系）
编辑 `packages/craft-backend/src/common/error/user.error.ts`，新增 3 个 errorKey（errno 自己顺延即可）：

```ts
export const userErrorMessages = {
  unknownValidateFail: { errno: 100000, message: '未知错误' },
  userValidateFail: { errno: 101001, message: '输入信息验证失败' },
  createUserAlreadyExists: { errno: 101002, message: '该邮箱已经被注册，请直接登录' },
  loginCheckFailInfo: { errno: 101003, message: '该用户不存在或者密码错误' },
  loginValidateFail: { errno: 101004, message: '登录校验失败' },
  sendVeriCodeFrequentlyFailInfo: { errno: 101005, message: '请勿频繁获取短信验证码' },
  loginVeriCodeIncorrectFailInfo: { errno: 101006, message: '验证码不正确' },
  sendVeriCodeError: { errno: 101007, message: '验证码发送失败' },
  giteeOauthError: { errno: 101008, message: 'gitee 授权出错' },

  // ===== GitHub OAuth =====
  oauthBadRequest: { errno: 101009, message: 'OAuth 回调参数缺失或非法' },
  oauthStateExpired: { errno: 101010, message: 'OAuth 登录已过期，请重试' },
  githubOauthError: { errno: 101011, message: 'GitHub 授权出错' },
} as const
```

---

## 4）新增 OAuth 模块（为什么：避免把第三方登录塞进 UserModule 变得臃肿；未来接 gitee/wechat 只加 provider）
新增目录：`packages/craft-backend/src/module/oauth/`

### 4.1 新增 `types.ts`（为什么：用强类型把 GitHub 响应字段固定下来，避免写错字段名）
```ts
export type GithubUser = {
  id: number
  login: string
  name: string | null
  avatar_url: string
  email: string | null
}

export type GithubEmailItem = {
  email: string
  primary: boolean
  verified: boolean
  visibility: 'public' | 'private' | null
}
```

### 4.2 新增 `oauth-state.service.ts`（为什么：`state` = 防 CSRF + 防回调串线；Redis 一次性消费防重放）
```ts
import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { BizException } from '@/common/error/biz.exception'
import { RedisService } from '@/common/cache/redis.service'

type OAuthStatePayload = {
  frontendOrigin: string
  createdAt: number
}

@Injectable()
export class OauthStateService {
  private readonly STATE_TTL_SECONDS = 10 * 60 // 10分钟，避免用户授权太久导致失败

  constructor(private readonly redisService: RedisService) {}

  private getStateKey(state: string) {
    return `oauth:github:state:${state}`
  }

  async createState(frontendOrigin: string) {
    const state = randomUUID()
    const payload: OAuthStatePayload = { frontendOrigin, createdAt: Date.now() }

    await this.redisService.setObject(this.getStateKey(state), payload, this.STATE_TTL_SECONDS)
    return state
  }

  /**
   * 一次性消费 state：校验通过即删除，防止重放攻击。
   */
  async consumeState(state: string) {
    const key = this.getStateKey(state)
    const payload = await this.redisService.getObject<OAuthStatePayload>(key)

    if (!payload) {
      throw new BizException({ errorKey: 'oauthStateExpired', httpStatus: 400 })
    }

    await this.redisService.del(key)
    return payload
  }
}
```

### 4.3 新增 `github-oauth.service.ts`（为什么：把“拼 authorize URL / 换 token / 拉用户信息 / 账号绑定 / 签 JWT”集中在一个服务里）
```ts
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import { User } from '@/database/mongo/schema/user.schema'
import { BizException } from '@/common/error/biz.exception'
import type { GithubEmailItem, GithubUser } from './types'

type LoginResult = {
  access_token: string
  userInfo: any
}

@Injectable()
export class GithubOauthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly callbackUrl: string
  private readonly frontendOrigin: string

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    // 为什么用 getOrThrow：配置缺失时启动即失败，避免线上运行中才爆雷
    this.clientId = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_ID')
    this.clientSecret = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_SECRET')
    this.callbackUrl = this.configService.getOrThrow<string>('GITHUB_OAUTH_CALLBACK_URL')
    this.frontendOrigin = this.configService.getOrThrow<string>('FRONTEND_ORIGIN')
  }

  getFrontendOrigin() {
    return this.frontendOrigin
  }

  buildAuthorizeUrl(state: string) {
    // 为什么 scope 要带 user:email：GitHub 用户可能隐藏 email，需要 /user/emails 才拿得到，用于“按 email 自动绑定”
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('redirect_uri', this.callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', 'read:user user:email')
    return url.toString()
  }

  async loginByGithub(code: string, state: string): Promise<LoginResult> {
    const githubAccessToken = await this.exchangeCodeForToken(code, state)
    const githubUser = await this.fetchGithubUser(githubAccessToken)
    const email = await this.resolveGithubEmail(githubAccessToken, githubUser)

    const user = await this.findOrCreateOrBindUser({ githubUser, email })
    if (!user?.id) {
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    const access_token = await this.jwtService.signAsync({ _id: user._id, username: user.username })

    return { access_token, userInfo: user }
  }

  private async exchangeCodeForToken(code: string, state: string) {
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
        state,
      }).toString(),
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !data?.access_token) {
      throw new BizException({
        errorKey: 'githubOauthError',
        httpStatus: 400,
        data: { status: resp.status, response: data },
      })
    }

    return String(data.access_token)
  }

  private async fetchGithubUser(accessToken: string): Promise<GithubUser> {
    const resp = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !data?.id) {
      throw new BizException({
        errorKey: 'githubOauthError',
        httpStatus: 400,
        data: { status: resp.status, response: data },
      })
    }

    return data as GithubUser
  }

  private async fetchGithubEmails(accessToken: string): Promise<GithubEmailItem[]> {
    const resp = await fetch('https://api.github.com/user/emails', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !Array.isArray(data)) {
      // 这里不直接失败：有的账号可能拿不到 emails（权限/配置），我们允许走“无 email 创建 oauth 用户”
      return []
    }

    return data as GithubEmailItem[]
  }

  private async resolveGithubEmail(accessToken: string, githubUser: GithubUser) {
    if (githubUser.email) return githubUser.email

    const emails = await this.fetchGithubEmails(accessToken)

    // 为什么选 primary+verified：最大概率是“用户主邮箱且可用”，用于自动绑定最稳
    const primaryVerified = emails.find(e => e.primary && e.verified)?.email
    if (primaryVerified) return primaryVerified

    const anyVerified = emails.find(e => e.verified)?.email
    return anyVerified ?? null
  }

  private async findOrCreateOrBindUser(input: { githubUser: GithubUser, email: string | null }) {
    const githubId = String(input.githubUser.id)

    // 1) 优先按 (provider, oauthID) 查找
    const existedOauthUser = await this.userModel.findOne({ provider: 'github', oauthID: githubId })
    if (existedOauthUser) return existedOauthUser

    // 2) email 自动绑定：如果 GitHub email 存在且本地已存在该 email 用户，则绑定
    if (input.email) {
      const existedEmailUser = await this.userModel.findOne({ email: input.email })
      if (existedEmailUser) {
        await this.userModel.updateOne(
          { _id: existedEmailUser._id },
          {
            $set: {
              type: 'oauth',
              provider: 'github',
              oauthID: githubId,
              // 头像/昵称：一般允许用 GitHub 的补全；如果你不想覆盖，可以改成仅在缺失时写入
              picture: input.githubUser.avatar_url,
              nickName: input.githubUser.name ?? input.githubUser.login,
            },
          },
        )

        const rebound = await this.userModel.findById(existedEmailUser._id)
        if (!rebound) throw new BizException({ errorKey: 'unknownValidateFail' })
        return rebound
      }
    }

    // 3) 创建新用户（username 必须唯一；用 github:${id} 避免和手机号/邮箱冲突）
    const created = await this.userModel.create({
      username: `github:${githubId}`,
      type: 'oauth',
      provider: 'github',
      oauthID: githubId,
      email: input.email ?? undefined,
      nickName: input.githubUser.name ?? input.githubUser.login,
      picture: input.githubUser.avatar_url,
    } as any)

    // 双保险：拿“默认查询字段版本”
    const safeUser = await this.userModel.findById(created._id)
    if (!safeUser) throw new BizException({ errorKey: 'unknownValidateFail' })
    return safeUser
  }
}
```

### 4.4 新增 `oauth.controller.ts`（为什么：controller 只做“路由+协议层”，业务编排放 service）
```ts
import type { Response } from 'express'
import { Controller, Get, Query, Res } from '@nestjs/common'
import { SkipMetaRes } from '@/common/meta/meta.decorator'
import { BizException } from '@/common/error/biz.exception'
import { OauthStateService } from './oauth-state.service'
import { GithubOauthService } from './github-oauth.service'

const escapeJsonForInlineScript = (value: unknown) => {
  // 为什么要做这个：JSON.stringify 不会处理 </script> 这类组合，理论上可能打断脚本标签
  // 这里把 < 转义成 \\u003c，阻断注入
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

const buildPopupPostMessageHtml = (origin: string, payload: unknown) => {
  const safeOrigin = escapeJsonForInlineScript(origin)
  const safePayload = escapeJsonForInlineScript(payload)

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OAuth 登录中...</title>
</head>
<body>
  <script>
    (function () {
      try {
        var targetOrigin = ${safeOrigin};
        var message = ${safePayload};

        if (!window.opener) {
          document.body.innerText = '无法找到 opener 窗口，请关闭后重试。';
          return;
        }

        window.opener.postMessage(message, targetOrigin);
        window.close();
      } catch (e) {
        document.body.innerText = '登录回传失败，请关闭后重试。';
      }
    })();
  </script>
</body>
</html>`
}

@Controller('oauth/github')
export class OauthController {
  constructor(
    private readonly oauthStateService: OauthStateService,
    private readonly githubOauthService: GithubOauthService,
  ) {}

  /**
   * 1) 前端打开 popup 命中这里
   * 2) 后端生成 state（防 CSRF/防串线），然后 302 去 GitHub authorize
   */
  @SkipMetaRes()
  @Get('authorize')
  async authorize(@Res() res: Response) {
    const state = await this.oauthStateService.createState(this.githubOauthService.getFrontendOrigin())
    const authorizeUrl = this.githubOauthService.buildAuthorizeUrl(state)

    res.redirect(authorizeUrl)
  }

  /**
   * 3) GitHub 授权后回调这里
   * 4) 后端校验 state -> 用 code 换 token -> 拿用户信息 -> 绑定/创建用户 -> 签发 JWT
   * 5) 返回一段 HTML，通过 postMessage 把 {access_token,userInfo} 发给前端主窗口
   */
  @SkipMetaRes()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BizException({ errorKey: 'oauthBadRequest', httpStatus: 400 })
    }

    // 为什么要 consume：state 必须一次性使用，防止重放
    const statePayload = await this.oauthStateService.consumeState(state)

    const loginResult = await this.githubOauthService.loginByGithub(code, state)

    const message = { type: 'oauth:github', payload: loginResult }
    const html = buildPopupPostMessageHtml(statePayload.frontendOrigin, message)

    res.status(200).type('text/html').send(html)
  }
}
```

### 4.5 新增 `oauth.module.ts`
```ts
import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { OauthController } from './oauth.controller'
import { OauthStateService } from './oauth-state.service'
import { GithubOauthService } from './github-oauth.service'

@Module({
  imports: [
    // 为什么要引 MongoModule：需要注入 UserModel 做查找/绑定/创建
    MongoModule,
    // 为什么要引 AuthModule：拿 JwtService 签发 token（AuthModule exports JwtModule）
    AuthModule,
  ],
  controllers: [OauthController],
  providers: [OauthStateService, GithubOauthService],
})
export class OauthModule {}
```

---

## 5）在 AppModule 注册 OauthModule（为什么：Nest 的模块必须被引入才会生效）
编辑 `packages/craft-backend/src/app.module.ts`：`imports` 里加上 `OauthModule`。

```ts
import { Module } from '@nestjs/common'
import { RedisModule } from '@/common/cache/redis.module'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { MetaModule } from '@/common/meta/meta.module'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { TestModule } from '@/module/test/test.module'
import { UserModule } from '@/module/user/user.module'
import { OauthModule } from '@/module/oauth/oauth.module'

@Module({
  imports: [
    ConfigModule,
    MetaModule,
    LoggerModule,
    MongoModule,
    AuthModule,
    UserModule,
    OauthModule,
    RedisModule,
    TestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

---

## 6）前端接收 postMessage（为什么：同源策略下跨窗口安全通信；并且避免 token 出现在 URL）
你前端只要做两件事：`window.open` 打开后端 authorize、`message` 事件里校验来源并拿结果。

```ts
const BACKEND_ORIGIN = 'http://localhost:3000'
const AUTHORIZE_URL = `${BACKEND_ORIGIN}/api/oauth/github/authorize`

export const openGithubLoginPopup = () => {
  const popup = window.open(
    AUTHORIZE_URL,
    'github-oauth',
    'width=600,height=720,resizable=yes,scrollbars=yes',
  )

  const handleMessage = (event: MessageEvent) => {
    // 为什么要校验 origin：防止任意页面给你 postMessage 注入假 token
    if (event.origin !== BACKEND_ORIGIN) return

    const data = event.data as any
    if (!data || data.type !== 'oauth:github') return

    const { access_token, userInfo } = data.payload ?? {}
    if (!access_token) return

    // 按你们现有习惯存储 token（例如 localStorage）
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo ?? null))

    window.removeEventListener('message', handleMessage)
    popup?.close()
  }

  window.addEventListener('message', handleMessage)
}
```

---

## 7）手动验证（你照做就能看到“全链路跑通”）
- 启动后端（确保 Redis/Mongo 正常）
- 前端点击按钮执行 `openGithubLoginPopup()`
- popup 跳 GitHub → 点同意 → 回调后 popup 自动关闭
- 主窗口收到 `{ access_token, userInfo }`
- 用这个 token 调你们现有的：`GET /api/user/me`（Header：`Authorization: Bearer <token>`）

---

### 你现在可以开始抄写了
你目前在 ask mode，我不能直接帮你把这些文件写进仓库；你可以先按上面步骤复制粘贴。  
如果你希望我直接在代码库里创建文件/修改文件并帮你一起联调（更省时间），你切到 **Agent mode** 我就能直接落地实现。

```dotenv
GITHUB_OAUTH_CLIENT_ID=你的ClientID
GITHUB_OAUTH_CLIENT_SECRET=你的ClientSecret
GITHUB_OAUTH_CALLBACK_URL=http://localhost:3000/api/oauth/github/callback
FRONTEND_ORIGIN=http://localhost:5173
```

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().default(3000),

  CORS: Joi.string().valid('true', 'false').default('true'),
  PREFIX: Joi.string().default('/api'),
  VERSION: Joi.string().optional(),

  LOG_ON: Joi.string().valid('true', 'false').default('true'),

  JWT_SECRET: Joi.string().required(),

  TEST_MODULE_ON: Joi.string().valid('true', 'false').default('false'),

  // ===== OAuth (GitHub) =====
  GITHUB_OAUTH_CLIENT_ID: Joi.string().required(),
  GITHUB_OAUTH_CLIENT_SECRET: Joi.string().required(),
  GITHUB_OAUTH_CALLBACK_URL: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().required(),
})

const envFilePath = [`.env.${process.env.NODE_ENV || 'development'}`, '.env']

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath,
      isGlobal: true,
      validationSchema,
    }),
  ],
})
export class ConfigModule {}
```

```typescript
export const userErrorMessages = {
  unknownValidateFail: { errno: 100000, message: '未知错误' },
  userValidateFail: { errno: 101001, message: '输入信息验证失败' },
  createUserAlreadyExists: { errno: 101002, message: '该邮箱已经被注册，请直接登录' },
  loginCheckFailInfo: { errno: 101003, message: '该用户不存在或者密码错误' },
  loginValidateFail: { errno: 101004, message: '登录校验失败' },
  sendVeriCodeFrequentlyFailInfo: { errno: 101005, message: '请勿频繁获取短信验证码' },
  loginVeriCodeIncorrectFailInfo: { errno: 101006, message: '验证码不正确' },
  sendVeriCodeError: { errno: 101007, message: '验证码发送失败' },
  giteeOauthError: { errno: 101008, message: 'gitee 授权出错' },

  // ===== GitHub OAuth =====
  oauthBadRequest: { errno: 101009, message: 'OAuth 回调参数缺失或非法' },
  oauthStateExpired: { errno: 101010, message: 'OAuth 登录已过期，请重试' },
  githubOauthError: { errno: 101011, message: 'GitHub 授权出错' },
} as const
```

```typescript
export type GithubUser = {
  id: number
  login: string
  name: string | null
  avatar_url: string
  email: string | null
}

export type GithubEmailItem = {
  email: string
  primary: boolean
  verified: boolean
  visibility: 'public' | 'private' | null
}
```

```typescript
import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { BizException } from '@/common/error/biz.exception'
import { RedisService } from '@/common/cache/redis.service'

type OAuthStatePayload = {
  frontendOrigin: string
  createdAt: number
}

@Injectable()
export class OauthStateService {
  private readonly STATE_TTL_SECONDS = 10 * 60 // 10分钟，避免用户授权太久导致失败

  constructor(private readonly redisService: RedisService) {}

  private getStateKey(state: string) {
    return `oauth:github:state:${state}`
  }

  async createState(frontendOrigin: string) {
    const state = randomUUID()
    const payload: OAuthStatePayload = { frontendOrigin, createdAt: Date.now() }

    await this.redisService.setObject(this.getStateKey(state), payload, this.STATE_TTL_SECONDS)
    return state
  }

  /**
   * 一次性消费 state：校验通过即删除，防止重放攻击。
   */
  async consumeState(state: string) {
    const key = this.getStateKey(state)
    const payload = await this.redisService.getObject<OAuthStatePayload>(key)

    if (!payload) {
      throw new BizException({ errorKey: 'oauthStateExpired', httpStatus: 400 })
    }

    await this.redisService.del(key)
    return payload
  }
}
```

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import type { Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import { User } from '@/database/mongo/schema/user.schema'
import { BizException } from '@/common/error/biz.exception'
import type { GithubEmailItem, GithubUser } from './types'

type LoginResult = {
  access_token: string
  userInfo: any
}

@Injectable()
export class GithubOauthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly callbackUrl: string
  private readonly frontendOrigin: string

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    // 为什么用 getOrThrow：配置缺失时启动即失败，避免线上运行中才爆雷
    this.clientId = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_ID')
    this.clientSecret = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_SECRET')
    this.callbackUrl = this.configService.getOrThrow<string>('GITHUB_OAUTH_CALLBACK_URL')
    this.frontendOrigin = this.configService.getOrThrow<string>('FRONTEND_ORIGIN')
  }

  getFrontendOrigin() {
    return this.frontendOrigin
  }

  buildAuthorizeUrl(state: string) {
    // 为什么 scope 要带 user:email：GitHub 用户可能隐藏 email，需要 /user/emails 才拿得到，用于“按 email 自动绑定”
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('redirect_uri', this.callbackUrl)
    url.searchParams.set('state', state)
    url.searchParams.set('scope', 'read:user user:email')
    return url.toString()
  }

  async loginByGithub(code: string, state: string): Promise<LoginResult> {
    const githubAccessToken = await this.exchangeCodeForToken(code, state)
    const githubUser = await this.fetchGithubUser(githubAccessToken)
    const email = await this.resolveGithubEmail(githubAccessToken, githubUser)

    const user = await this.findOrCreateOrBindUser({ githubUser, email })
    if (!user?.id) {
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    const access_token = await this.jwtService.signAsync({ _id: user._id, username: user.username })

    return { access_token, userInfo: user }
  }

  private async exchangeCodeForToken(code: string, state: string) {
    const resp = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
        state,
      }).toString(),
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !data?.access_token) {
      throw new BizException({
        errorKey: 'githubOauthError',
        httpStatus: 400,
        data: { status: resp.status, response: data },
      })
    }

    return String(data.access_token)
  }

  private async fetchGithubUser(accessToken: string): Promise<GithubUser> {
    const resp = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !data?.id) {
      throw new BizException({
        errorKey: 'githubOauthError',
        httpStatus: 400,
        data: { status: resp.status, response: data },
      })
    }

    return data as GithubUser
  }

  private async fetchGithubEmails(accessToken: string): Promise<GithubEmailItem[]> {
    const resp = await fetch('https://api.github.com/user/emails', {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
      },
    })

    const data = await resp.json().catch(() => null) as any
    if (!resp.ok || !Array.isArray(data)) {
      // 这里不直接失败：有的账号可能拿不到 emails（权限/配置），我们允许走“无 email 创建 oauth 用户”
      return []
    }

    return data as GithubEmailItem[]
  }

  private async resolveGithubEmail(accessToken: string, githubUser: GithubUser) {
    if (githubUser.email) return githubUser.email

    const emails = await this.fetchGithubEmails(accessToken)

    // 为什么选 primary+verified：最大概率是“用户主邮箱且可用”，用于自动绑定最稳
    const primaryVerified = emails.find(e => e.primary && e.verified)?.email
    if (primaryVerified) return primaryVerified

    const anyVerified = emails.find(e => e.verified)?.email
    return anyVerified ?? null
  }

  private async findOrCreateOrBindUser(input: { githubUser: GithubUser, email: string | null }) {
    const githubId = String(input.githubUser.id)

    // 1) 优先按 (provider, oauthID) 查找
    const existedOauthUser = await this.userModel.findOne({ provider: 'github', oauthID: githubId })
    if (existedOauthUser) return existedOauthUser

    // 2) email 自动绑定：如果 GitHub email 存在且本地已存在该 email 用户，则绑定
    if (input.email) {
      const existedEmailUser = await this.userModel.findOne({ email: input.email })
      if (existedEmailUser) {
        await this.userModel.updateOne(
          { _id: existedEmailUser._id },
          {
            $set: {
              type: 'oauth',
              provider: 'github',
              oauthID: githubId,
              // 头像/昵称：一般允许用 GitHub 的补全；如果你不想覆盖，可以改成仅在缺失时写入
              picture: input.githubUser.avatar_url,
              nickName: input.githubUser.name ?? input.githubUser.login,
            },
          },
        )

        const rebound = await this.userModel.findById(existedEmailUser._id)
        if (!rebound) throw new BizException({ errorKey: 'unknownValidateFail' })
        return rebound
      }
    }

    // 3) 创建新用户（username 必须唯一；用 github:${id} 避免和手机号/邮箱冲突）
    const created = await this.userModel.create({
      username: `github:${githubId}`,
      type: 'oauth',
      provider: 'github',
      oauthID: githubId,
      email: input.email ?? undefined,
      nickName: input.githubUser.name ?? input.githubUser.login,
      picture: input.githubUser.avatar_url,
    } as any)

    // 双保险：拿“默认查询字段版本”
    const safeUser = await this.userModel.findById(created._id)
    if (!safeUser) throw new BizException({ errorKey: 'unknownValidateFail' })
    return safeUser
  }
}
```

```typescript
import type { Response } from 'express'
import { Controller, Get, Query, Res } from '@nestjs/common'
import { SkipMetaRes } from '@/common/meta/meta.decorator'
import { BizException } from '@/common/error/biz.exception'
import { OauthStateService } from './oauth-state.service'
import { GithubOauthService } from './github-oauth.service'

const escapeJsonForInlineScript = (value: unknown) => {
  // 为什么要做这个：JSON.stringify 不会处理 </script> 这类组合，理论上可能打断脚本标签
  // 这里把 < 转义成 \\u003c，阻断注入
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

const buildPopupPostMessageHtml = (origin: string, payload: unknown) => {
  const safeOrigin = escapeJsonForInlineScript(origin)
  const safePayload = escapeJsonForInlineScript(payload)

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>OAuth 登录中...</title>
</head>
<body>
  <script>
    (function () {
      try {
        var targetOrigin = ${safeOrigin};
        var message = ${safePayload};

        if (!window.opener) {
          document.body.innerText = '无法找到 opener 窗口，请关闭后重试。';
          return;
        }

        window.opener.postMessage(message, targetOrigin);
        window.close();
      } catch (e) {
        document.body.innerText = '登录回传失败，请关闭后重试。';
      }
    })();
  </script>
</body>
</html>`
}

@Controller('oauth/github')
export class OauthController {
  constructor(
    private readonly oauthStateService: OauthStateService,
    private readonly githubOauthService: GithubOauthService,
  ) {}

  /**
   * 1) 前端打开 popup 命中这里
   * 2) 后端生成 state（防 CSRF/防串线），然后 302 去 GitHub authorize
   */
  @SkipMetaRes()
  @Get('authorize')
  async authorize(@Res() res: Response) {
    const state = await this.oauthStateService.createState(this.githubOauthService.getFrontendOrigin())
    const authorizeUrl = this.githubOauthService.buildAuthorizeUrl(state)

    res.redirect(authorizeUrl)
  }

  /**
   * 3) GitHub 授权后回调这里
   * 4) 后端校验 state -> 用 code 换 token -> 拿用户信息 -> 绑定/创建用户 -> 签发 JWT
   * 5) 返回一段 HTML，通过 postMessage 把 {access_token,userInfo} 发给前端主窗口
   */
  @SkipMetaRes()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BizException({ errorKey: 'oauthBadRequest', httpStatus: 400 })
    }

    // 为什么要 consume：state 必须一次性使用，防止重放
    const statePayload = await this.oauthStateService.consumeState(state)

    const loginResult = await this.githubOauthService.loginByGithub(code, state)

    const message = { type: 'oauth:github', payload: loginResult }
    const html = buildPopupPostMessageHtml(statePayload.frontendOrigin, message)

    res.status(200).type('text/html').send(html)
  }
}
```

```typescript
import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { OauthController } from './oauth.controller'
import { OauthStateService } from './oauth-state.service'
import { GithubOauthService } from './github-oauth.service'

@Module({
  imports: [
    // 为什么要引 MongoModule：需要注入 UserModel 做查找/绑定/创建
    MongoModule,
    // 为什么要引 AuthModule：拿 JwtService 签发 token（AuthModule exports JwtModule）
    AuthModule,
  ],
  controllers: [OauthController],
  providers: [OauthStateService, GithubOauthService],
})
export class OauthModule {}
```

```typescript
import { Module } from '@nestjs/common'
import { RedisModule } from '@/common/cache/redis.module'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { MetaModule } from '@/common/meta/meta.module'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { TestModule } from '@/module/test/test.module'
import { UserModule } from '@/module/user/user.module'
import { OauthModule } from '@/module/oauth/oauth.module'

@Module({
  imports: [
    ConfigModule,
    MetaModule,
    LoggerModule,
    MongoModule,
    AuthModule,
    UserModule,
    OauthModule,
    RedisModule,
    TestModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

```typescript
const BACKEND_ORIGIN = 'http://localhost:3000'
const AUTHORIZE_URL = `${BACKEND_ORIGIN}/api/oauth/github/authorize`

export const openGithubLoginPopup = () => {
  const popup = window.open(
    AUTHORIZE_URL,
    'github-oauth',
    'width=600,height=720,resizable=yes,scrollbars=yes',
  )

  const handleMessage = (event: MessageEvent) => {
    // 为什么要校验 origin：防止任意页面给你 postMessage 注入假 token
    if (event.origin !== BACKEND_ORIGIN) return

    const data = event.data as any
    if (!data || data.type !== 'oauth:github') return

    const { access_token, userInfo } = data.payload ?? {}
    if (!access_token) return

    // 按你们现有习惯存储 token（例如 localStorage）
    localStorage.setItem('access_token', access_token)
    localStorage.setItem('userInfo', JSON.stringify(userInfo ?? null))

    window.removeEventListener('message', handleMessage)
    popup?.close()
  }

  window.addEventListener('message', handleMessage)
}
```

---

**User**

上面OauthStateService中，为什么要设计createState的payload包含frontendOrigin，我的理解是Redis中只需要存在我们随机设置的key值就可以吧，你这样设计是基于什么考虑，好在哪里

---

**Cursor**

你的理解没错：**最小实现**里 Redis 里只要“能校验 state 存在且未过期”就够了——也就是只存一个随机 key（value 随便）也能防 CSRF。

我把 `frontendOrigin` 放进 `state` payload，主要是基于下面这些“更接近真实项目”的考虑（不是必须，但有明显好处）：

### 1）把“回调的上下文”跟这次登录请求绑定（避免写死/避免串线）
回调页要执行：

```js
window.opener.postMessage(message, targetOrigin)
```

这里的 `targetOrigin` **必须是精确值**（最佳实践，不要用 `'*'`），否则：
- 用 `'*'`：可能把 token 发给恶意站点（如果 opener 被替换/打开方式异常）
- 写死一个 origin：将来你有多前端域名（本地 5173、preview、生产、或多租户），就会不灵活

把 `frontendOrigin` 绑定到 `state`，意味着：**这次登录是从哪个前端发起的，就把结果发回哪个前端**，不会出现“打开 A 前端，却把 token postMessage 给 B 前端”的串线问题。

> 即使你当前只有 `http://localhost:5173`，提前按这种方式做，后面扩展不会返工。

### 2）支持“一个后端服务多个前端”（多环境/多站点/多租户）
真实场景里经常出现：
- 同一个后端服务同时给 `localhost:5173`、`localhost:5174`、preview 域名、生产域名提供服务
- 甚至同一套后端支持多个业务前端（不同域名）

此时 `frontendOrigin` **不能只靠后端配置写死**，否则会导致只能服务其中一个。把它放进 state payload，就能做到“按发起方路由回去”。

### 3）为将来的扩展预留：returnUrl / mode / 设备信息
`state` 的 payload 很适合承载这些“跟一次登录事务强绑定”的数据，例如：
- `returnUrl`：登录成功回到原页面（而不是固定首页）
- `mode`：popup / redirect 两种交付方式并存
- `provider`：未来统一 `/oauth/:provider/callback` 时用来分流
- `pkceVerifier`：你以后上 PKCE 时，`code_verifier` 就该和 state 一起存（否则回调时拿不到）

所以我把 payload 设计成对象，是为了让它未来自然扩展，而不是把 Redis 只当“存在性标记”。

### 4）安全性层面的小加分：减少“隐式信任配置”的范围
如果你把 `FRONTEND_ORIGIN` 写死在服务端配置里，那么**任何一次 state 校验通过的回调**都会把 token 发给那个固定 origin。  
把 origin 存在 state 里（并且是服务端生成/保存的，不是用户传的），等于把“允许接收 token 的目标”缩小到这次事务本身，更符合“最小权限”的思路。

---

## 结论
- **你说的没错**：只存 key 也能防 CSRF，能跑通。
- **我这样做的好处**：让 state 不只是“验存在”，还是“一次登录事务的上下文容器”，对多前端、多环境、未来加 returnUrl/PKCE/多 provider 都更稳、更少返工。

如果你想保持最简，我也支持：把 payload 改成 `1` 或时间戳即可；但我会建议至少保留“对象结构”，因为你马上就会遇到“回传到哪个前端”的问题。

```javascript
window.opener.postMessage(message, targetOrigin)
```

你的理解是对的：**最小实现**里 Redis 只要能证明“这个 `state` 是我们自己刚刚生成过的且未过期”，存个空值/`1` 也能完成 **CSRF 防护**。

我把 `frontendOrigin` 放进 `state` 的 payload，主要是为了把 `state` 从“仅验存在”升级成“**一次 OAuth 登录事务的上下文容器**”，好处在于：

### 1）`postMessage` 必须用精确 `targetOrigin`（避免用 `'*'`）
回调页要执行 `window.opener.postMessage(message, targetOrigin)`。最佳实践是 **targetOrigin 必须精确**，否则有泄露风险。  
把 `frontendOrigin` 跟 `state` 绑定，就能做到：**这次从哪个前端发起，就只回传给哪个前端**，不需要 `'*'`，也不需要写死单一域名。

### 2）为多环境/多前端域名做准备（减少返工）
即使你现在只有 `http://localhost:5173`，后面很常见会出现：
- preview 域名、生产域名
- 多个本地端口（5173/5174）
- 多站点/多租户前端  
把 `frontendOrigin` 放进 `state`，后端就能按“发起方”回传，不会串线。

### 3）给未来扩展留位置（returnUrl / PKCE / provider 等）
你之后可能想加：
- `returnUrl`：登录成功回到原页面
- `mode`：popup/redirect
- `pkceVerifier`：上 PKCE 时必须保存 `code_verifier`（回调换 token 要用）
- `provider`：统一回调入口时分流  
这些都天然适合挂在 `state` payload 上。

### 4）更符合“最小权限”的思路
如果 `FRONTEND_ORIGIN` 只写死在配置里，那么所有通过 `state` 校验的回调都会把 token 发给那个固定 origin；把 origin 绑定到这次事务，会更“收敛”。

**结论**：  
- 只存 key：够用、最简单。  
- 存 payload（含 `frontendOrigin`）：更贴近真实项目、扩展性更好、能更安全地使用 `postMessage`。

---

**User**

但是我看到目前的实现中，payload中的FrontendOrigin是来自getFrontendOrigin方法，再往上发现是读取env配置。那么后续要做到【这次登录是从哪个前端发起的，就把结果发回哪个前端】，是不是就要改成前端调用GET /api/oauth/github/authorize接口的时候，传递frontOrigin？ 

因为目前你好像做不到这次登录是从哪个前端发起的，就把结果发回哪个前端。

---

**Cursor**

你说得对：**按我当前给的代码，确实做不到“从哪个前端发起就回传给哪个前端”**——因为 `frontendOrigin` 目前是从后端 env（`FRONTEND_ORIGIN`）读的，所以它永远是固定值。此时把 `frontendOrigin` 放进 state payload 的价值更多是“为将来扩展预留结构”，而不是“现在就动态”。

### 为什么不能靠请求头自动判断“发起的前端是谁”？
前端用 `window.open('http://backend/api/oauth/github/authorize')` 属于**顶层导航**，浏览器通常不会像 XHR/fetch 那样稳定带 `Origin` 头；`Referer` 也可能被策略裁剪/关闭，所以**后端很难可靠推断 opener 的 origin**。

---

## 要实现“谁发起就回传给谁”，确实需要前端显式传递，但必须做白名单校验
最推荐的做法不是直接传 `frontendOrigin`（容易被伪造），而是传 **returnUrl**（登录成功要回到的页面），后端从中解析 origin，并且**只允许在白名单内**。

### 方案（推荐）：`/authorize?returnUrl=...`
- **前端**：打开 popup 时带上 returnUrl
- **后端**：
  - `const origin = new URL(returnUrl).origin`
  - 校验 origin ∈ allowlist（例如 `FRONTEND_ORIGINS=http://localhost:5173,https://preview.xxx.com`）
  - 存到 `state` payload：`{ frontendOrigin: origin, returnUrl }`

这样既实现“动态回传”，又避免信任客户端随便传一个 origin。

---

## 需要改哪里（你可照抄的最小改动示例）
下面是“仅展示关键改动”的代码片段（你在 ask mode，需要自己复制到对应文件里）。

### 1）env：把单个 `FRONTEND_ORIGIN` 升级为白名单
```env
FRONTEND_ORIGINS=http://localhost:5173
```

### 2）Config 校验增加 `FRONTEND_ORIGINS`
```ts
// ... existing schema ...
FRONTEND_ORIGINS: Joi.string().required(),
```

### 3）`authorize` 接收 returnUrl，并写入 state payload
```ts
// oauth.controller.ts 的 authorize
@SkipMetaRes()
@Get('authorize')
async authorize(
  @Query('returnUrl') returnUrl: string | undefined,
  @Res() res: Response,
) {
  // 为什么要传 returnUrl：顶层导航很难可靠拿到 opener origin，只能显式带参数
  const resolvedReturnUrl = returnUrl ?? 'http://localhost:5173' // 你也可以默认到首页
  let frontendOrigin = ''

  try {
    frontendOrigin = new URL(resolvedReturnUrl).origin
  } catch {
    throw new BizException({ errorKey: 'oauthBadRequest', httpStatus: 400 })
  }

  // 这里应该校验 allowlist（示例略），不在白名单就拒绝
  const state = await this.oauthStateService.createState({
    frontendOrigin,
    returnUrl: resolvedReturnUrl,
  })

  const authorizeUrl = this.githubOauthService.buildAuthorizeUrl(state)
  res.redirect(authorizeUrl)
}
```

并把 `OauthStateService.createState` 的签名改成接收对象：

```ts
type OAuthStatePayload = {
  frontendOrigin: string
  returnUrl: string
  createdAt: number
}

async createState(input: { frontendOrigin: string, returnUrl: string }) {
  const state = randomUUID()
  const payload: OAuthStatePayload = {
    frontendOrigin: input.frontendOrigin,
    returnUrl: input.returnUrl,
    createdAt: Date.now(),
  }
  await this.redisService.setObject(this.getStateKey(state), payload, this.STATE_TTL_SECONDS)
  return state
}
```

> allowlist 校验我这里先没展开写（避免你一次抄太多），但核心原则是：**绝不能把客户端传来的 origin 不校验就用于 postMessage 的 targetOrigin**。

---

## 结合你当前阶段怎么选？
- **现在只有开发环境 `http://localhost:5173`**：继续用 env 固定 `FRONTEND_ORIGIN` 完全 OK，简单、风险低。
- **当你准备支持多环境/多前端域名**：就按上面“returnUrl + allowlist”改造，这才真正实现“谁发起回传给谁”。

如果你确认要“这次就把多 origin 机制也做上”，我可以把 allowlist 校验、错误码、以及前端 `window.open` 的完整传参方式也给你一整套可抄写版本。

```dotenv
FRONTEND_ORIGINS=http://localhost:5173
```

```typescript
// ... existing schema ...
FRONTEND_ORIGINS: Joi.string().required(),
```

```typescript
// oauth.controller.ts 的 authorize
@SkipMetaRes()
@Get('authorize')
async authorize(
  @Query('returnUrl') returnUrl: string | undefined,
  @Res() res: Response,
) {
  // 为什么要传 returnUrl：顶层导航很难可靠拿到 opener origin，只能显式带参数
  const resolvedReturnUrl = returnUrl ?? 'http://localhost:5173' // 你也可以默认到首页
  let frontendOrigin = ''

  try {
    frontendOrigin = new URL(resolvedReturnUrl).origin
  } catch {
    throw new BizException({ errorKey: 'oauthBadRequest', httpStatus: 400 })
  }

  // 这里应该校验 allowlist（示例略），不在白名单就拒绝
  const state = await this.oauthStateService.createState({
    frontendOrigin,
    returnUrl: resolvedReturnUrl,
  })

  const authorizeUrl = this.githubOauthService.buildAuthorizeUrl(state)
  res.redirect(authorizeUrl)
}
```

```typescript
type OAuthStatePayload = {
  frontendOrigin: string
  returnUrl: string
  createdAt: number
}

async createState(input: { frontendOrigin: string, returnUrl: string }) {
  const state = randomUUID()
  const payload: OAuthStatePayload = {
    frontendOrigin: input.frontendOrigin,
    returnUrl: input.returnUrl,
    createdAt: Date.now(),
  }
  await this.redisService.setObject(this.getStateKey(state), payload, this.STATE_TTL_SECONDS)
  return state
}
```

