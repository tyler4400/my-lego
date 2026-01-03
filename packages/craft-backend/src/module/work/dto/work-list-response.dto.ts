import { Expose, Type } from 'class-transformer'
import { WorkListItemDto } from '@/module/work/dto/work-list-item.dto'

/**
 * 我的作品列表返回结构：{ list, total }
 */
export class WorkListResponseDto {
  @Expose()
  @Type(() => WorkListItemDto)
  list!: WorkListItemDto[]

  @Expose()
  total!: number
}
