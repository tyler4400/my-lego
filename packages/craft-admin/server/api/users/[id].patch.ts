import { z } from 'zod'

const SetRoleSchema = z.object({
  role: z.enum(['admin', 'normal']),
})

/**
 * 设置 指定用户的角色
 */
export default defineAuthResponseHandler(async (event) => {
  const id = getRouterParam(event, 'id') // 路径参数 :id

  const result = await runValidate(SetRoleSchema, event)

  const { role } = result.data

  // findByIdAndUpdate + { new: true } 返回更新后的最新文档
  const newUser = await UserSchema.findByIdAndUpdate(id, { role }, { new: true })

  if (!newUser) {
    throw createError({ statusCode: 404, statusMessage: '该用户不存在!' })
  }
  return newUser?.toJSON()
})
