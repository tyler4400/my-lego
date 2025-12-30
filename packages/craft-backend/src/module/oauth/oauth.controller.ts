import type { Response } from 'express'
import { createSafeJson } from '@my-lego/shared'
import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { BizException } from '@/common/error/biz.exception'
import { SkipMetaRes } from '@/common/meta/meta.decorator'
import { GithubOauthService } from '@/module/oauth/github-oauth.service'
import { OauthStateService } from '@/module/oauth/oauth-state.service'
import { LoginResponseDto } from '@/module/user/dto/login-response.dto'

@Controller('oauth')
export class OauthController {
  constructor(
    private readonly oauthStateService: OauthStateService,
    private readonly githubOauthService: GithubOauthService,
  ) {}

  /**
   * 1) 重定向到 github 第三方登录授权
   * 2) 后端生成 state（防 CSRF/防串线），然后 302 去 GitHub authorize
   * @see https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#1-request-a-users-github-identity
   */
  @Get('github/authorize')
  @SkipMetaRes()
  async authorize(@Res() res: Response) {
    const state = await this.oauthStateService.createState(this.githubOauthService.getFrontendOrigin())
    const authorizeUrl = this.githubOauthService.buildAuthorizeUrl(state)

    res.redirect(authorizeUrl)
  }

  /**
   * 3) GitHub 授权后回调这里
   * 4) 后端校验 state -> 用 code 换 token -> 拿用户信息 -> 绑定/创建用户 -> 签发 JWT
   * 5) 返回一段 HTML，通过 postMessage 把 {access_token,userInfo} 发给前端主窗口
   * @see https://docs.github.com/zh/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#2-users-are-redirected-back-to-your-site-by-github
   */
  @Get('/github/callback')
  @SkipMetaRes()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code || !state) {
      throw new BizException({ errorKey: 'oauthBadRequest', httpStatus: HttpStatus.BAD_REQUEST })
    }

    const statePayload = await this.oauthStateService.consumeState(state)

    const loginRes = await this.githubOauthService.loginByGithub(code, state)

    // 手动执行与 SerializeInterceptor 同款的转换逻辑
    const data = plainToInstance(LoginResponseDto, loginRes, {
      excludeExtraneousValues: true,
      enableImplicitConversion: true,
    })

    const message = { type: 'oauth.github', payload: data }

    // 注意：originJson 是带引号的 JSON 字符串；payloadJson 是 JSON 对象字面量
    const originJson = createSafeJson(statePayload.frontOrigin)
    const payloadJson = createSafeJson(message)

    res.render('oauth-login-success', { originJson, payloadJson })
  }
}
