import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

/**
 * 创建作品 DTO
 *
 * 设计说明：
 * - 创建时一定是 Initial 状态，按业务约束「非 Published 不可公开 / 模板」，
 *   因此 isPublic / isTemplate 不允许在创建时设置；
 *   后续切换可见性需走 POST /work/setPublic、POST /work/publishTemplate。
 * - isHot 是运营标记，本期不开放给业务方在创建时设置。
 */
export class CreateDto {
  @IsNotEmpty({ message: 'title 不能为空' })
  @IsString({ message: 'title 必须是字符串' })
  title!: string // 标题

  @IsOptional()
  @IsString({ message: 'desc 必须是字符串' })
  desc?: string // 副标题，描述

  @IsOptional()
  @IsString({ message: 'coverImg 必须是字符串' })
  coverImg?: string

  @IsNotEmpty({ message: 'content 不能为空' })
  @IsObject({ message: 'content 必须是对象' })
  content!: Record<string, any> // 内容数据
}
