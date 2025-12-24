import { Expose, Type } from 'class-transformer'
import { PublicUserDto } from '@/module/user/dto/public-user.dto'

/**
 * 登录响应 DTO：
 * - access_token：JWT token
 * - userInfo：脱敏后的用户信息
 */
export class LoginResponseDto {
  @Expose()
  access_token!: string

  @Expose()
  @Type(() => PublicUserDto)
  userInfo!: PublicUserDto
}
