import { isArray, isString } from '@my-lego/shared'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BizException } from '@/common/error/biz.exception'
import { User, UserDocument } from '@/database/mongo/schema/user.schema'
import { GithubEmailItem, GithubUser } from '@/module/oauth/types'

@Injectable()
export class GithubOauthService {
  private readonly clientId: string
  private readonly clientSecret: string
  // private readonly callbackUrl: string | undefined
  private readonly frontendOrigin: string

  private readonly logger = new Logger(GithubOauthService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    // 为什么用 getOrThrow：配置缺失时启动即失败，避免线上运行中才爆雷
    this.clientId = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_ID')
    this.clientSecret = this.configService.getOrThrow<string>('GITHUB_OAUTH_CLIENT_SECRET')
    // this.callbackUrl = this.configService.get<string>('GITHUB_OAUTH_CALLBACK_URL')
    this.frontendOrigin = this.configService.getOrThrow<string>('FRONTEND_ORIGIN')
  }

  getFrontendOrigin() {
    return this.frontendOrigin
  }

  /**
   * GitHub 授权 OAuth 应用 的URL
   * @param state 不可猜测的随机字符串。 它用于防止跨站请求伪造攻击。见官网文档
   * @see https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow
   */
  buildAuthorizeUrl(state: string) {
    // 为什么 scope 要带 user:email：GitHub 用户可能隐藏 email，需要 /user/emails 才拿得到，用于“按 email 自动绑定”
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', this.clientId)

    // redirect_uri可以不需要。默认就使用GitHub OAuth Apps中配置
    //  @see https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#loopback-redirect-urls
    // url.searchParams.set('redirect_uri', this.callbackUrl)

    url.searchParams.set('state', state)
    url.searchParams.set('scope', 'read:user user:email')

    return url.toString()
  }

  async loginByGithub(code: string, state: string) {
    const githubAccessToken = await this.exchangeCodeForToken(code, state)

    const githubUser = await this.fetchGithubUser(githubAccessToken)

    // 上一步拿到的用户信息可能不含email，有的账号可能拿不到 emails（权限/配置）。如果没有再走一遍获取用户email
    githubUser.email = await this.resolveGithubEmail(githubAccessToken, githubUser)

    const user = await this.findOrCreateOrBindUser(githubUser)

    const accessToken = await this.jwtService.signAsync({ id: user.id, username: user.username })
    return {
      accessToken,
      githubUser,
    }
  }

  /**
   * Exchanges the authorization code and state for an access token.
   * @see https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
   * @param {string} code - The authorization code received from the OAuth provider.
   * @param {string} state - The state parameter used to prevent CSRF attacks.
   * @return {Promise<string>} A promise that resolves to the access token upon successful exchange,
   * or rejects with a BizException if the request fails.
   */
  private async exchangeCodeForToken(code: string, state: string) {
    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        // 数据被编码为类似于URL查询字符串的键值对格式：key1=value1&key2=value2 特殊字符会被URL编码（如空格变成+或%20）
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        // redirect_uri: this.callbackUrl,
        code,
        state,
      }).toString(),
    })
    const data = await res.json().catch(e => this.logger.error(e)) as { access_token: string }
    if (!res.ok || !isString(data.access_token)) {
      this.logger.error({ res, ok: res.ok, status: res.status, request: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        state,
      } })

      throw new BizException({
        errorKey: 'githubOauthError',
        httpStatus: HttpStatus.BAD_REQUEST,
        data: {
          status: res.status,
          response: res,
        },
      })
    }

    return data.access_token
  }

  /**
   * 使用提供的访问令牌获取 GitHub 用户信息。
   * @see https://docs.github.com/zh/rest/users/users?apiVersion=2022-11-28#get-the-authenticated-user
   * @param {string} accessToken - 用于认证 GitHub API 请求的访问令牌。
   * @return {Promise<GithubUser>} 一个包含用户数据的响应对象的 Promise。
   */
  private async fetchGithubUser(accessToken: string) {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    })
    const data = await res.json().catch(e => this.logger.error(e)) as GithubUser
    if (!res.ok || !data.id) {
      this.logger.error({ res, ok: res.ok, status: res.status, data })
      throw new BizException({ errorKey: 'githubOauthError', httpStatus: HttpStatus.BAD_REQUEST, data })
    }
    return data
  }

  /**
   * @see https://docs.github.com/zh/rest/users/emails?apiVersion=2022-11-28#list-email-addresses-for-the-authenticated-user
   * @param accessToken
   */
  private async fetchGithubEmails(accessToken: string) {
    const res = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    })
    const data = await res.json().catch(e => this.logger.error(e)) as GithubEmailItem[]
    if (!res.ok || !isArray(data)) {
      // 这里不直接失败：有的账号可能拿不到 emails（权限/配置），我们允许走“无 email 创建 oauth 用户”
      return []
    }
    return data
  }

  /**
   * Resolves the email address for a GitHub user. 有的账号可能拿不到 emails（权限/配置）
   *
   * @param {string} accessToken - The access token to authenticate with GitHub.
   * @param {GithubUser} githubUser - The GitHub user object for which to resolve the email.
   * @return {Promise<string | null>} - A promise that resolves to the resolved email address or null if no email is found.
   */
  private async resolveGithubEmail(accessToken: string, githubUser: GithubUser) {
    if (githubUser.email) return githubUser.email

    const emails = await this.fetchGithubEmails(accessToken)
    const primaryVerifiedEmail = emails.find(email => email.primary && email.verified)?.email
    if (primaryVerifiedEmail) return primaryVerifiedEmail

    const anyVerifiedEmail = emails.find(email => email.verified)?.email
    return anyVerifiedEmail || null
  }

  private async findOrCreateOrBindUser(githubUser: GithubUser) {
    const githubUserName = `github:${githubUser.id}`

    // 1) 优先按 (username) 查找 // 注意⚠️，查找已存在用户不能根据provider和oauthID，因为用户还可能再次绑定了其它平台，这两个是会变的
    const existOauthUser = await this.userModel.findOne({ username: githubUserName })
    if (existOauthUser) return existOauthUser

    // 2) email 自动绑定：如果 GitHub email 存在且本地已存在该 email 用户，则绑定
    if (githubUser.email) {
      const existedEmailUser = await this.userModel.findOne({ email: githubUser.email })
      if (existedEmailUser) {
        await this.userModel.updateOne({
          _id: existedEmailUser._id,
        }, {
          $set: {
            // 不想覆盖，可以改成仅在缺失时写入
            type: existedEmailUser.type || 'oauth',
            provider: existedEmailUser.provider || 'github',
            oauthID: existedEmailUser.oauthID || githubUser.id,
            picture: existedEmailUser.picture || githubUser.avatar_url,
            nickName: existedEmailUser.nickName || githubUser.name || githubUser.login,
          },
        })

        const rebound = await this.userModel.findById(existedEmailUser._id)
        if (!rebound) throw new BizException({ errorKey: 'unknownValidateFail' })
        return rebound
      }
    }

    // 3) 创建新用户（username 必须唯一；用 github:${id} 避免和手机号/邮箱冲突）
    const createdUser = await this.userModel.create({
      username: githubUserName,
      type: 'oauth',
      provider: 'github',
      oauthID: githubUser.id,
      nickName: githubUser.login,
      picture: githubUser.avatar_url,
      email: githubUser.email,
    })

    // 双保险：拿“默认查询字段版本”
    const safeUser = await this.userModel.findById(createdUser._id)
    if (!safeUser) throw new BizException({ errorKey: 'unknownValidateFail' })
    return safeUser
  }
}
