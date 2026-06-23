import { defineMongooseModel } from '#nuxt/mongoose'

export const UserSchema = defineMongooseModel<UserDataProps>({
  name: 'User',
  schema: {
    username: { type: String, unique: true, required: true },
    password: { type: String },
    nickName: { type: String },
    picture: { type: String },
    email: { type: String },
    phoneNumber: { type: String },
    type: { type: String, default: 'email' },
    role: { type: String, default: 'normal' },
    disabled: { type: Boolean, default: false }, // 和课程不一样，本次不会用到
  },
  options: {
    timestamps: true,
    collection: 'users',
    toJSON: {
      // 返回给前端时删掉敏感字段
      transform(_doc, ret: Record<string, any>) {
        delete ret.password
        delete ret.__v
      },
    },
  },
})
