import type { Request } from 'express'
import { Controller, Get, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '@/guard/jwt-auth.guard'
import { TestEnabledGuard } from '@/module/test/guards/test-enabled.guard'

/**
 * TestAuthController：JWT 保护的联调示例接口。
 *
 * 注意：
 * - 该接口仅用于测试/联调（/test/auth/me）
 * - 是否可用由 TestEnabledGuard 控制（禁用时返回 404）
 */
@Controller('test/auth')
export class TestAuthController {
  @Get('me')
  @UseGuards(TestEnabledGuard, JwtAuthGuard)
  getMe(@Req() req: Request) {
    return req.user
  }
}

