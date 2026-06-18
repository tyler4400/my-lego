import { userSignupSchema } from '#shared/validators/user'
import { hashPassword } from '@my-lego/shared'

export default defineEventHandler(async (event) => {
  // 1) 校验（复用 21-6 的 runValidate；后端其实只需要 email+password，
  //    这里简便起见仍用 signup schema，接口设计上confirmPwd 传不传都行）
  const result = await runValidate(userSignupSchema, event)
  const { email, password } = result.data

  const exist = await UserSchema.findOne({ username: email }).lean()
  if (exist) {
    throw createError({
      statusCode: 409,
      statusMessage: '该邮箱已被注册，请直接登录',
    })
  }

  // 加密密码
  const config = useRuntimeConfig(event)
  const hash = await hashPassword(password, config.bcrypt.saltRounds)

  // 创建用户
  const newUser = await UserSchema.create({ username: email, email, password: hash })
  return newUser
})
