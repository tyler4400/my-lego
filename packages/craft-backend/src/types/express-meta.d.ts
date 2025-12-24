declare global {
  namespace Express {
    interface Request {
      /**
       * 由 MetaContextMiddleware 注入，用于 MetaResponse 包装。
       */
      metaContext?: {
        traceId: string
        requestTime: number
        version: string
        protocol: 'default'
      }
      /**
       * 由 MetaFlagGuard 注入，用于在 ExceptionFilter 中识别 SkipMetaRes。
       */
      __skipMetaRes?: boolean
    }
  }
}

export {}
