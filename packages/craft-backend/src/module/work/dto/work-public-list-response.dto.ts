import { Expose, Type } from 'class-transformer'
import { WorkPublicListItemDto } from '@/module/work/dto/work-public-list-item.dto'

/**
 * 公开模版列表返回结构：{ list, total }
 * - 与 WorkListResponseDto 结构一致，仅 list item 类型不同
 */
export class WorkPublicListResponseDto {
  @Expose()
  @Type(() => WorkPublicListItemDto)
  list!: WorkPublicListItemDto[]

  @Expose()
  total!: number
}
