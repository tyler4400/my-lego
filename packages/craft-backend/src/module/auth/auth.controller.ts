import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { JwtAuthGuard } from '@/guard/jwt-auth.guard'
import { AuthService } from './auth.service'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 简化版登录：
   * 仅接受 username，返回 access_token。
   * 生产环境请务必接入密码 + DB 校验。
   */
  @Post('signin')
  async signin(@Body('username') username: string) {
    const result = await this.authService.signin(username)
    return result
  }

  /**
   * 受 JWT 保护的示例接口：
   * header: Authorization: Bearer <token>
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user
  }
}
