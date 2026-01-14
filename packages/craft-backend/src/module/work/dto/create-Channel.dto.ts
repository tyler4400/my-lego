import { IsNotEmpty, IsString } from 'class-validator'
import { WorkIdDto } from '@/module/work/dto/work-id.dto'

export class CreateChannelDto extends WorkIdDto {
  @IsNotEmpty({ message: 'name 不能为空' })
  @IsString({ message: 'name 必须是字符串' })
  name!: string // 渠道名称
}
