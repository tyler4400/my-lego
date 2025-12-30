import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { User } from '@/database/mongo/schema/user.schema'

export type WorkDocument = mongoose.HydratedDocument<Work>

/**
 * 旧 egg 项目中 channels 是 Array，这里保留结构（不做强校验，便于兼容历史数据）。
 */
export interface WorkChannel {
  name: string
  id: string
}

export enum WorkStatusEnum {
  Deleted = 0, // 删除
  Initial = 1, // 未发布
  Published = 2, // 已发布
  Declined = 3, // 强制下线
}

/**
 * 与旧 egg 项目保持一致的 Work 结构。
 * - 自增 id 对齐：works_id_counter
 * - timestamps 自动维护 createdAt / updatedAt
 */
@Schema({ timestamps: true })
export class Work {
  /**
   * unique: true 本质上就是创建一个“唯一索引”（unique index），数据库层面仍然是 index，只是带唯一约束。
   * index: true 是普通索引（non-unique）。
   */
  @Prop({ type: String, unique: true })
  uuid!: string // 短链接uuid， h5 的URL中使用，隐藏真正id

  @Prop({ type: String, required: true })
  title!: string // 标题

  @Prop({ type: String, default: '' })
  desc!: string // 副标题，描述

  @Prop({ type: String })
  coverImg?: string

  @Prop({ type: mongoose.Schema.Types.Mixed })
  content?: Record<string, any> // 内容数据

  @Prop({ type: Boolean, default: false })
  isTemplate?: boolean

  @Prop({ type: Boolean, default: false })
  isPublic?: boolean // 是否公开到首页， 模版用

  @Prop({ type: Boolean, default: false })
  isHot?: boolean

  @Prop({ type: String, required: true })
  author!: string // 作者 username

  @Prop({ type: Number, default: 0 })
  copiedCount!: number // 被复制次数

  @Prop({ type: Number, default: WorkStatusEnum.Initial })
  status?: WorkStatusEnum

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user?: mongoose.Types.ObjectId

  @Prop({ type: Date })
  latestPublishAt?: Date

  @Prop({ type: Array })
  channels?: WorkChannel[]

  /**
   * 自增 id（由自增插件维护，插件在 MongoModule.forFeatureAsync 中统一注册）
   */
  @Prop({ type: Number })
  id?: number
}

export const WorkSchema = SchemaFactory.createForClass(Work)
