import { IsNotEmpty, IsString, Matches } from 'class-validator'

/**
 * 手机号 + 验证码 登录 DTO
 */
export class LoginByCellphoneDto {
  @IsString({ message: 'phoneNumber 必须是字符串' })
  @IsNotEmpty({ message: 'phoneNumber 不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式错误' })
  phoneNumber!: string

  @IsString({ message: 'verifyCode 必须是字符串' })
  @IsNotEmpty({ message: 'verifyCode 不能为空' })
  @Matches(/^\d{4}$/, { message: '验证码格式错误' })
  verifyCode!: string
}
