import type { UserPayload } from '@/types/type'

declare global {
  namespace Express {

    /**
     * Passport 会把 request.user 声明为 Express.User。
     * 这里把 Express.User 扩展成我们的 JWT payload 结构，
     * 这样 req.user 就具备 id/username，可直接传给 UserService.me(payload: UserPayload)。
     */
    interface User extends UserPayload {}

    interface Request {
      /**
       * 由 MetaContextMiddleware 注入，用于 MetaResponse 包装。
       */
      metaContext?: {
        traceId: string
        requestTime: number
        version: string
        protocol: 'default'
        ip?: string
      }
      /**
       * 由 MetaFlagGuard 注入，用于在 ExceptionFilter 中识别 SkipMetaRes。
       */
      __skipMetaRes?: boolean
      /**
       * 由 jwt.strategy 注入， 用于JWT用户token
       */
      user?: User
    }
  }
}

export {}
