import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'
import { WorkIdDto } from '@/module/work/dto/work-id.dto'

/**
 * 编辑作品 DTO：
 * - copiedCount 不允许编辑
 * - 仅允许编辑 coverImg/desc/title/content
 */
export class WorkUpdateDto extends WorkIdDto {
  @IsOptional()
  @IsString({ message: 'title 必须是字符串' })
  @IsNotEmpty({ message: 'title 不能为空' })
  title?: string

  @IsOptional()
  @IsString({ message: 'desc 必须是字符串' })
  desc?: string

  @IsOptional()
  @IsString({ message: 'coverImg 必须是字符串' })
  coverImg?: string

  @IsOptional()
  @IsObject({ message: 'content 必须是对象' })
  content?: Record<string, any>
}
