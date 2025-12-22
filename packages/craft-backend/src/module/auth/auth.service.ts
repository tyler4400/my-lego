import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { UserPayload } from '@/types/type'

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * 简化版登录逻辑：仅根据 username 签发一个 token。
   * 后续接入 Mongo 后，可以在这里加入密码校验和用户查询逻辑。
   */
  async signin(username: string): Promise<{ access_token: string }> {
    const payload: UserPayload = {
      id: 1, // 临时写死，后续替换为真实用户 id
      username,
    }

    const access_token = await this.jwtService.signAsync(payload)
    return { access_token }
  }
}
