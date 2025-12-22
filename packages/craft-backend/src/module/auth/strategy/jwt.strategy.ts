import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { UserPayload } from '@/types/type'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(protected readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Bearer token 读取
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    })
  }

  /**
   * validate 的返回值会被挂载到 request.user 上。
   * 这里暂时只返回 payload，后续可以在此处接入 Mongo 查询更多用户信息。
   */
  validate(payload: UserPayload) {
    return {
      id: payload.id,
      username: payload.username,
    }
  }
}
