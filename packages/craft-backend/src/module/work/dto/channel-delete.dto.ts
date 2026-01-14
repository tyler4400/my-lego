import { IsNotEmpty, IsString } from 'class-validator'
import { WorkIdDto } from '@/module/work/dto/work-id.dto'

export class ChannelDeleteDto extends WorkIdDto {
  @IsString({ message: 'channelId 必须是字符串' })
  @IsNotEmpty({ message: 'channelId 不能为空' })
  channelId?: string
}
