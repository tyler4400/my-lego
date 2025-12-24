import type { Request } from 'express'
import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '@/guard/jwt-auth.guard'

@Controller('auth')
export class AuthController {
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
