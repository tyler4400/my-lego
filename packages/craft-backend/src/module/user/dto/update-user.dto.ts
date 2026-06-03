import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'

/**
 * 当前登录用户更新自己资料的 DTO。
 *
 * 安全约束（白名单语义）：
 * - 仅暴露 nickName / picture 两个可编辑字段，其它字段（username/role/email/phoneNumber 等）禁止从此接口修改。
 * - 所有字段都是可选的：本次没传则不更新（partial update），与 work.update 行为对齐。
 *
 * 字段说明：
 * - nickName：长度 2~20；不允许传空字符串（如需"清空昵称"业务上不支持，应传新昵称）。
 * - picture：必须是合法 URL；图片由前端先上传到图床拿到 url 再带过来。
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'nickName 必须是字符串' })
  @IsNotEmpty({ message: 'nickName 不能为空' })
  @MinLength(2, { message: 'nickName 长度不能少于 2 位' })
  @MaxLength(20, { message: 'nickName 长度不能超过 20 位' })
  nickName?: string

  @IsOptional()
  @IsString({ message: 'picture 必须是字符串' })
  @IsUrl({}, { message: 'picture 必须是合法的 URL' })
  picture?: string
}
