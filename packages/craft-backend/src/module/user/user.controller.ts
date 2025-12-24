import type { Request } from 'express'
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { MetaRes } from '@/common/meta/meta.decorator'
import { Serialize } from '@/decorator/Serialize.decorator'
import { JwtAuthGuard } from '@/guard/jwt-auth.guard'
import { CreateByEmailDto } from '@/module/user/dto/create-by-email.dto'
import { LoginByCellphoneDto } from '@/module/user/dto/login-by-cellphone.dto'
import { LoginByEmailDto } from '@/module/user/dto/login-by-email.dto'
import { LoginResponseDto } from '@/module/user/dto/login-response.dto'
import { PublicUserDto } from '@/module/user/dto/public-user.dto'
import { SendVerifyCodeDto } from '@/module/user/dto/send-verify-code.dto'
import { UserService } from '@/module/user/user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 邮箱注册（严格邮箱）
   */
  @MetaRes({ message: '注册成功' })
  @Serialize(PublicUserDto)
  @Post('/createByEmail')
  async createByEmail(@Body() dto: CreateByEmailDto) {
    const { username, password } = dto
    return this.userService.createByEmail(username, password)
  }

  /**
   * 邮箱登录（返回 token + userInfo）
   */
  @MetaRes({ message: '登录成功' })
  @Serialize(LoginResponseDto)
  @Post('/loginByEmail')
  async loginByEmail(@Body() dto: LoginByEmailDto) {
    const { username, password } = dto
    return this.userService.loginByEmail(username, password)
  }

  /**
   * 发送短信验证码（直接返回 verifyCode，便于调试）
   */
  @MetaRes({ message: '验证码发送成功' })
  @Post('/sendVerifyCode')
  async sendVerifyCode(@Body() dto: SendVerifyCodeDto) {
    return this.userService.sendVerifyCode(dto.phoneNumber)
  }

  /**
   * 手机号 + 验证码 登录（校验成功后删除验证码 key）
   */
  @MetaRes({ message: '登录成功' })
  @Serialize(LoginResponseDto)
  @Post('/loginByCellphone')
  async loginByCellphone(@Body() dto: LoginByCellphoneDto) {
    return this.userService.loginByCellphone(dto.phoneNumber, dto.verifyCode)
  }

  /**
   * 获取当前用户信息（JWT 保护）
   */
  @MetaRes({ message: '获取用户信息成功' })
  @Serialize(PublicUserDto)
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  async me(@Req() req: Request) {
    // req.user 来自 JwtStrategy.validate() 的返回值
    return this.userService.me(req.user as any)
  }
}
