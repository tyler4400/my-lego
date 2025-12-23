import type { HydratedDocument } from 'mongoose'
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'

export type UserDocument = HydratedDocument<User>

/**
 * 与旧 egg 项目保持一致的 User 结构。
 * - username 是唯一标识（邮箱登录 / 手机登录都会写入这里）
 * - password 存储 hash（默认查询不返回：select:false；需要时显式 select('+password')）
 * - timestamps 自动维护 createdAt / updatedAt
 * - 自增 id 对齐：users_id_counter
 */
export type UserType = 'email' | 'cellphone' | 'oauth'
export type UserProvider = 'gitee'
export type UserRole = 'admin' | 'normal'

@Schema({
  timestamps: true,
})
export class User {
  @Prop({ type: String, unique: true, required: true })
  username!: string

  /**
   * 密码 hash 默认不返回（select: false）。
   * 如果登录校验需要查询密码，请显式包含：
   * - this.userModel.findOne({ username }).select('+password')
   */
  @Prop({ type: String, select: false })
  password?: string

  @Prop({ type: String })
  email?: string

  @Prop({ type: String })
  nickName?: string

  @Prop({ type: String })
  picture?: string

  @Prop({ type: String })
  phoneNumber?: string

  @Prop({ type: String, default: 'email' })
  type!: UserType

  @Prop({ type: String })
  provider?: UserProvider

  @Prop({ type: String })
  oauthID?: string

  @Prop({ type: String, default: 'normal' })
  role?: UserRole

  /**
   * 自增 id（由 mongoose-sequence 插件维护）
   */
  @Prop({ type: Number })
  id?: number
}

export const UserSchema = SchemaFactory.createForClass(User)

// 旧实现：通过 toJSON transform 剔除 password / __v。
// 当前使用 select: false 后，password 默认不会被查询出来；因此这里先注释掉保留参考。
// 如需恢复该逻辑，可取消注释并按 Mongoose 的 transform 类型签名调整参数类型。
/*
type UserJSON = Record<string, unknown> & {
  password?: unknown
  __v?: unknown
}

UserSchema.set('toJSON', {
  transform: (_doc: unknown, ret: UserJSON) => {
    delete ret.password
    delete ret.__v
    return ret
  },
})
*/
// 自增插件（mongoose-sequence）统一在 `MongoModule.forFeatureAsync` 中注册，
// 以确保使用的是 @nestjs/mongoose 管理的 Connection，避免默认 mongoose.connection 未连接导致 buffering 超时。
