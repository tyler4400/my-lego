import { Expose, Type } from 'class-transformer'
import { PublicUserDto } from '@/module/user/dto/public-user.dto'

/**
 * 登录响应 DTO：
 * - accessToken：JWT token
 * - userInfo：脱敏后的用户信息
 */
export class LoginResponseDto {
  @Expose()
  accessToken!: string

  @Expose()
  @Type(() => PublicUserDto)
  userInfo!: PublicUserDto
}
