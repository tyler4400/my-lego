import { Expose } from 'class-transformer'
import { WorkStatusEnum } from '@/database/mongo/schema/work.schema'

/**
 * WorkListItemDto：我的作品列表单项 DTO（不包含 user 字段）
 */
export class WorkListItemDto {
  @Expose()
  id!: number

  @Expose()
  author!: string

  @Expose()
  copiedCount!: number

  @Expose()
  coverImg!: string

  @Expose()
  desc!: string

  @Expose()
  title!: string

  @Expose()
  isHot!: boolean

  @Expose()
  status!: WorkStatusEnum

  @Expose()
  isTemplate!: boolean

  /**
   * 是否公开（与 schema.isPublic 对齐，可选，默认 false）
   * - 列表卡片用它展示 "公开" 标签，并用于禁用 / 启用切换按钮
   */
  @Expose()
  isPublic?: boolean

  @Expose()
  latestPublishAt!: Date

  @Expose()
  createdAt!: Date

  @Expose()
  updatedAt!: Date
}

export const projection = [
  'id',
  'author',
  'copiedCount',
  'coverImg',
  'desc',
  'title',
  'isHot',
  'status',
  'createdAt',
  'updatedAt',
  'isTemplate',
  'isPublic',
  'latestPublishAt',
]
