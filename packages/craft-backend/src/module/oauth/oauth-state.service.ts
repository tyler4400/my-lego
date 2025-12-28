import { randomUUID } from 'node:crypto'
import { HttpStatus, Injectable } from '@nestjs/common'
import { RedisService } from '@/common/cache/redis.service'
import { BizException } from '@/common/error/biz.exception'

/**
 *  State用来做 防 CSRF + 防回调串线
 *  最小实现可以不要任何内容，只要Redis中存在，能对上即可
 *  现在的frontOrigin主要为将来的扩展做预留，例如值可以使用前端传参的returnUrl：登录成功回到原页面（而不是固定首页）
 */
export interface OAuthStatePayload {
  frontOrigin: string // 授权成功时，前端页面postMessage()时的targetOrigin
  createAt: number
}

@Injectable()
export class OauthStateService {
  private readonly STATE_TTL_SECONDS = 10 * 60

  constructor(private readonly redisService: RedisService) {}

  private getStateKey(state: string) {
    return `oauth.state.${state}`
  }

  async createState(frontOrigin: string) {
    const state = randomUUID() // 6a093b64-30a0-4493-a896-23bdd197ca50
    const payload: OAuthStatePayload = { frontOrigin, createAt: Date.now() }
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
      throw new BizException({ errorKey: 'oauthStateExpired', httpStatus: HttpStatus.BAD_REQUEST })
    }

    await this.redisService.del(key)
    return payload
  }
}
