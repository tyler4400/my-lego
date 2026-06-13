import { runValidate } from '#server/utils/runValidate'
import { userLoginSchema } from '#shared/validators/user'

export default defineEventHandler(async (event) => {
  const result = await runValidate(userLoginSchema, event)

  // 已验证数据
  const { email } = result.data

  // 21-11 / 21-12 才真正接 MongoDB + bcrypt + JWT，先返回占位数据
  return {
    username: email.split('@')[0],
    placeholder: true,
  }
})
