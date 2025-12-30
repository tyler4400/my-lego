import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

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

  @IsOptional()
  @IsBoolean({ message: 'isTemplate 必须是 boolean' })
  isTemplate?: boolean

  @IsOptional()
  @IsBoolean({ message: 'isPublic 必须是 boolean' })
  isPublic?: boolean // 是否公开到首页， 模版用

  @IsOptional()
  @IsBoolean({ message: 'isHot 必须是 boolean' })
  isHot?: boolean
}
