import type { WorkChannel } from '@/database/mongo/schema/work.schema'
import { Expose, Transform, Type } from 'class-transformer'

export class WorkDetailUserDto {
  @Expose()
  username!: string

  @Expose()
  nickName?: string

  @Expose()
  picture?: string
}

/**
 * WorkDetailDto：作品详情 DTO
 * - user：仅包含 username/nickName/picture
 */
export class WorkDetailDto {
  @Expose()
  id!: number

  @Expose()
  uuid!: string

  @Expose()
  title!: string

  @Expose()
  desc!: string

  @Expose()
  coverImg?: string

  /**
   * 在 class-transformer 里，当 excludeExtraneousValues: true 遇到像 content: Record<string, any> 这种非 DTO class 的“嵌套对象”时，
   * 往往会把它当成 Object 去转换；而 Object 没有任何 @Expose() 元数据，于是内部键会被视为“extraneous”而剔除，最终就变成 {}。
   * 所以：DTO 的 @Expose() 写了也不够，需要显式告诉 class-transformer：content 不要深度按 class 规则过滤，直接原样透传。
   */
  @Expose()
  @Transform((data) => {
    return data.obj.content
  })
  content?: Record<string, any>

  @Expose()
  status!: number

  @Expose()
  @Transform((data) => {
    return data.obj.channels
  })
  channels?: WorkChannel[]

  @Expose()
  author!: string

  @Expose()
  copiedCount!: number

  @Expose()
  isTemplate?: boolean

  @Expose()
  isPublic?: boolean

  @Expose()
  isHot?: boolean

  @Expose()
  latestPublishAt?: Date

  @Expose()
  createdAt?: Date

  @Expose()
  updatedAt?: Date

  @Expose()
  @Type(() => WorkDetailUserDto)
  user?: WorkDetailUserDto | null
}
