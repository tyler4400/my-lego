// server/utils/authHandler.ts
import type { EventHandler } from 'h3'

// 高阶函数：包装一个 handler，在请求前后加处理
export const defineAuthResponseHandler = (handler: EventHandler) => {
  return defineEventHandler(async (event) => {
    // ===== before the route handler：原始 handler 之前 =====

    const config = useRuntimeConfig(event)
    const token = getCookie(event, config.jwt.cookieName)

    if (!token) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    try {
      // 解密，拿回签发时存的 { username, _id }
      const userData = verifyJwtToken(token)
      console.log('defineAuthResponseHandler/userData: ', userData)
      // 挂到 event.context，供后续 handler 使用
      event.context.user = userData // 可能需要声明类型
    }
    catch {
      // token 伪造或过期：清 cookie + 报错
      deleteCookie(event, 'token')
      throw createError({ statusCode: 401, statusMessage: 'Token 已过期' })
    }

    // ===== 执行原始 handler =====
    const response = await handler(event)

    // ===== after the route handler：原始 handler 之后 =====
    // 想在响应后做的处理写在这里（如统一包裹、日志）
    // return { ...response }
    return response
  })
}
