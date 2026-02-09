import type { UserPayload } from '@/types/type'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/**
 * AuthTokenService：统一管理 JWT payload 结构与签发逻辑。
 *
 * - 后续扩展字段（role/issuer/audience/expiresIn）也只改这里
 */
@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 从用户对象中提取 JWT payload（当前约定：{ _id, username }）。
   * 注意：这里统一把 _id 转为 string（mongoose ObjectId -> string），便于跨进程/跨语言传输。
   */
  private buildUserPayload(user: { _id: unknown, username: string, role?: UserPayload['role'] }): UserPayload {
    return {
      _id: String(user._id),
      username: user.username,
      role: user.role ?? 'normal',
    }
  }

  /**
   * 统一签发 access token。
   * 后续若要调整 token 的签发策略（比如不同角色不同 expiresIn），在这里改即可。
   */
  async signAccessToken(user: { _id: unknown, username: string, role?: UserPayload['role'] }) {
    const payload = this.buildUserPayload(user)
    return this.jwtService.signAsync(payload)
  }
}
