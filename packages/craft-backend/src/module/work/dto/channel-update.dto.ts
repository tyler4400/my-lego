import { IsNotEmpty, IsString } from 'class-validator'
import { CreateChannelDto } from '@/module/work/dto/create-Channel.dto'

/**
 * 编辑作品的渠道名称 DTO：
 * - 渠道名称不能重复
 */
export class ChannelUpdateDto extends CreateChannelDto {
  @IsString({ message: 'channelId 必须是字符串' })
  @IsNotEmpty({ message: 'channelId 不能为空' })
  channelId?: string
}
