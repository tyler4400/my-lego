import type { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'
import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DEFAULT_PROTOCOL } from '@/common/meta/meta.constants'

/**
 * MetaContextMiddleware：为每个请求注入 Meta 上下文（traceId/requestTime/version/protocol）。
 *
 * 设计原因：
 * - Middleware 执行早于 Guard/Pipe/Interceptor
 * - 因此即使在 Guard/Pipe 阶段抛错，也能拿到 traceId/requestTime/version，用于统一错误响应
 *
 * traceId 约定：
 * - 允许透传：如果客户端传了 `x-trace-id`，则复用
 * - 否则使用 uuid 自动生成
 */
@Injectable()
export class MetaContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetaContextMiddleware.name)

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const headerTraceId = req.headers['x-trace-id']
    const rawTraceId = Array.isArray(headerTraceId) ? headerTraceId[0] : headerTraceId
    const traceId = typeof rawTraceId === 'string' && rawTraceId.length > 0 ? rawTraceId : randomUUID()

    const requestTime = Date.now()
    const version = this.configService.get<string>('VERSION', '')

    req.metaContext = {
      traceId,
      requestTime,
      version,
      protocol: DEFAULT_PROTOCOL,
      ip: req.ip,
    }

    // 方便联调：把 traceId 回写到响应头
    res.setHeader('x-trace-id', traceId)

    this.logger.log(`[Request url]：${req.originalUrl}`)
    next()
  }
}
