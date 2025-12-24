import { IsNotEmpty, IsString, Matches } from 'class-validator'

/**
 * 发送短信验证码 DTO
 */
export class SendVerifyCodeDto {
  @IsString({ message: 'phoneNumber 必须是字符串' })
  @IsNotEmpty({ message: 'phoneNumber 不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式错误' })
  phoneNumber!: string
}
