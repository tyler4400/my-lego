import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import { z } from 'zod'

/**
 * 通用：读取 request body 并用 Zod schema 校验
 * - 失败：throw 403 createError，data 是 treeifyError 结构
 * - 成功：返回 SafeParseSuccess（含 .data 强类型）
 */
export const runValidate = async <T>(
  schema: ZodType<T>,
  event: H3Event,
) => {
  const result = await readValidatedBody(event, body => schema.safeParse(body))

  if (!result.success) {
    throw createError({
      statusCode: 403,
      message: '验证失败',
      data: z.treeifyError(result.error),
    })
  }

  return result
}
