import { userLoginSchema } from '#shared/validators/user'
import { verifyPassword } from '@my-lego/shared'

export default defineEventHandler(async (event) => {
  const result = await runValidate(userLoginSchema, event)

  const { email, password } = result.data

  const user = await UserSchema.findOne({ username: email }).exec()

  // 安全：用户不存在 / 密码错误，给同一句模糊提示，避免泄漏"账号是否存在"
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: '该用户不存在或者密码错误' })
  }

  const verifyPwd = await verifyPassword(password, user.password)
  if (!verifyPwd) {
    throw createError({ statusCode: 404, statusMessage: '该用户不存在或者密码错误' })
  }

  // 只把关键信息放进 token（不要塞整个 user）
  const userData = { username: user.username, _id: user._id }
  const config = useRuntimeConfig(event)
  const token = signJwtToken(userData)
  // const token = jwt.sign(userData, config.jwt.secret, { expiresIn: config.jwt.expiresIn })
  // 种 cookie，过期时间与 JWT 一致
  setCookie(event, config.jwt.cookieName, token, { maxAge: config.jwt.expiresIn })

  // toJSON 触发 transform 删密码
  return user.toJSON()
})
