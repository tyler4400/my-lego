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

/**
 * 与旧 egg 项目保持一致的 Work 结构。
 * - 自增 id 对齐：works_id_counter
 * - timestamps 自动维护 createdAt / updatedAt
 */
@Schema({ timestamps: true })
export class Work {
  @Prop({ type: String, unique: true })
  uuid!: string

  @Prop({ type: String, required: true })
  title!: string

  @Prop({ type: String, default: '' })
  desc!: string

  @Prop({ type: String })
  coverImg?: string

  @Prop({ type: mongoose.Schema.Types.Mixed })
  content?: Record<string, any>

  @Prop({ type: Boolean })
  isTemplate?: boolean

  @Prop({ type: Boolean })
  isPublic?: boolean

  @Prop({ type: Boolean })
  isHot?: boolean

  @Prop({ type: String, required: true })
  author!: string

  @Prop({ type: Number, default: 0 })
  copiedCount!: number

  @Prop({ type: Number, default: 1 })
  status?: 0 | 1 | 2

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
