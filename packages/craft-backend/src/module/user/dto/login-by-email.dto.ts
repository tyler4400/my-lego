import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

/**
 * 邮箱登录 DTO（严格邮箱）
 */
export class LoginByEmailDto {
  @IsEmail({}, { message: 'username 必须是合法的邮箱格式' })
  @IsNotEmpty({ message: 'username 不能为空' })
  username!: string

  @IsString({ message: 'password 必须是字符串' })
  @IsNotEmpty({ message: 'password 不能为空' })
  @MinLength(8, { message: 'password 长度不能少于 8 位' })
  password!: string
}
