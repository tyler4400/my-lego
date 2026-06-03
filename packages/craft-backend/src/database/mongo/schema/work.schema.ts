import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { User } from '@/database/mongo/schema/user.schema'

export type WorkDocument = mongoose.HydratedDocument<Work>

/**
 * 什么是渠道
 * 渠道是一个唯一的标识，放在 url 上，让该渠道的 url 和其他的 url 区分开来，便于做分渠道统计。
 * 例如，一个作品发布为 h5 的 url 是 xxx/index.html ，但这个 h5 要作为广告投放在不同地方（微信/头条/支付宝等）。
 * 活动结束后，运营不仅要看这个 h5 的总数据，还要看每个投放位置的数据，以判断哪里效果好——这是运营的基本需求。
 * 解决方式：每个投放位置创建一个渠道，
 *   "微信"渠道对应 xxx/index.html?channel=aaa
 *   "支付宝"渠道对应 xxx/index.html?channel=bbb
 * 渠道名（name）：中文，便于运营识别，可重命名。
 * 渠道号（id）：uuid（nanoid(6)）形式，作为 url 的 ?channel= 参数值，**永远稳定**、不可重复、不可修改。
 *
 * 业务规则
 * - 渠道名称不能和同一作品下已有渠道重复。
 * - 渠道可以增、可以删、可以改名（id 永远不变）。
 * - **作品可以没有渠道**（channels 为空数组）；统计层面将无 channel 参数的访问归入"默认"桶。
 *   因此，前端不再强制"初次发布默认创建一个默认渠道"，但 UX 上仍鼓励作者至少保留一个。
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

export const allWorkStatus = [
  WorkStatusEnum.Initial,
  WorkStatusEnum.Published,
  WorkStatusEnum.Deleted,
  WorkStatusEnum.Declined,
]

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
  isTemplate?: boolean // 是否是模版，会在首页模版区域显示。模版必定可以是私有模版

  @Prop({ type: Boolean, default: false })
  isPublic?: boolean // 是否公开 // 公开的可以被别人看到和复制

  @Prop({ type: Boolean, default: false })
  isHot?: boolean

  @Prop({ type: String, required: true })
  author!: string // 作者 username // 可能会是脏数据， 是user字段连接到user表的

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
