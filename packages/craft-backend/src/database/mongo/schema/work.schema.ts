import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import mongoose from 'mongoose'
import { User } from '@/database/mongo/schema/user.schema'

export type WorkDocument = mongoose.HydratedDocument<Work>

/**
 * 什么是渠道
 * 渠道，就是一个唯一的标识，放在 url 上，让该渠道的 url 和其他的 url 区分开来，好做区分统计。
 * 例如，一个作品发布为 h5 的 url 是 xxx/index.html ，但是这个 h5 要作为广告投放在不同的地方（微信，头条，支付宝等）。
 * 活动结束后，运营人员不仅要看这个 h5 总的统计数据，还要看不同地方的数据，以区分哪里投放效果好。这是运营的基本需求。
 * 解决方案就是渠道。我们创建一个“微信”的渠道，让它对应的 url 是 xxx/index.html?channel=aaa ；
 * 再创建一个“支付宝”的渠道，让它对应的 url 是 xxx/index.html?channel=bbb 。
 * 渠道名是中文的，便于标识记录，渠道号就是一个 url 参数，参数名是 channel ，参数值是 uuid 形式，不可重复。
 * 这样，如果要投放在不同的地方，我们就创建多个渠道，把渠道对应的唯一链接投放过去，这样就可以根据 channel 参数来区分统计了。
 * 功能描述
 * 初次发布时，只有一个“默认”渠道。
 * 可以输入渠道名称，添加新的渠道。渠道名称不能和已有的重复。（渠道号都是 uuid 就直接自动生成了）
 * 可以删除已有的渠道。但如果此时只剩下一个渠道了，则不能继续删除，即至少保留一个渠道。
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
  isTemplate?: boolean

  @Prop({ type: Boolean, default: false })
  isPublic?: boolean // 是否公开到首页， 模版用

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
