import { Expose, Type } from 'class-transformer'
import { WorkStatusEnum } from '@/database/mongo/schema/work.schema'

/**
 * 公开模版列表中的作者公开信息
 * - 字段集与 WorkDetailUserDto 一致，但本期独立一份，避免列表 / 详情共享 DTO 后改动连带
 */
export class WorkPublicListUserDto {
  @Expose()
  username!: string

  @Expose()
  nickName?: string

  @Expose()
  picture?: string
}

/**
 * 公开模版列表单项 DTO
 * - 字段集 = WorkListItemDto + user（作者公开信息）
 * - 列表仅出现「已发布 + 公开 + 模版」作品，因此 isTemplate / isPublic 在响应里恒为 true，
 *   保留字段方便前端复用 WorksView 同款卡片渲染（少一层条件分支）
 */
export class WorkPublicListItemDto {
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

  @Expose()
  isPublic?: boolean

  @Expose()
  latestPublishAt!: Date

  @Expose()
  createdAt!: Date

  @Expose()
  updatedAt!: Date

  /**
   * h5 渲染 uuid：用于卡片"预览"在新窗口打开 H5 页面
   * - 与 WorkDetailDto.uuid 同义；列表也带上，省得点预览还要再拉一次详情
   */
  @Expose()
  uuid!: string

  @Expose()
  @Type(() => WorkPublicListUserDto)
  user?: WorkPublicListUserDto | null
}

/**
 * 公开列表查询用的 mongoose projection 字段集
 * - 比 WorkListItemDto 的 projection 多 'uuid' / 'user'（user 是 ObjectId ref，配合 populate 使用）
 * - 不写 isPublic（恒为 true，无需返回），但 isTemplate 保留供前端一致渲染
 */
export const publicListProjection = [
  'id',
  'uuid',
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
  'user',
]
