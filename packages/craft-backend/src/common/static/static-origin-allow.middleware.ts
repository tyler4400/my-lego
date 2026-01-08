import type { NextFunction, Request, Response } from 'express'
import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { normalizeOrigin, parseStaticAllowedOrigins } from './static-assets.utils'

/**
 * StaticOriginAllowMiddleware：为 `/static/*` 静态资源提供“尽力而为”的来源（Origin）限制。
 *
 * 说明（很重要）：
 * - 浏览器并不总会发送 `Origin`（例如 <img> 的简单 GET），因此我们做了：
 *   1) 优先使用 `Origin` 头
 *   2) `Origin` 不存在时，尝试从 `Referer` 推导来源
 *   3) 两者都不存在时，为了避免误伤，选择放行
 * - 这不是严格安全边界，但符合你“临时静态服务、适度限制即可”的诉求
 */
@Injectable()
export class StaticOriginAllowMiddleware implements NestMiddleware {
  private readonly logger = new Logger(StaticOriginAllowMiddleware.name)

  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    /**
     * 只允许读取类请求，避免静态目录被误用于上传/写入
     *
     * HTTP协议中的HEAD请求方法主要用于获取资源的元数据信息，而不实际下载资源内容。
     * HEAD方法与GET方法完全相同，唯一的区别是服务器在响应中不能返回消息体，只返回HTTP头信息。
     * HEAD请求的常见用途包括：
     *
     * - 探测资源是否存在
     * - 获取资源的大小（Content-Length）
     * - 获取资源的最后修改时间（Last-Modified）
     * - 检查资源的MIME类型（Content-Type）
     * - 验证缓存是否仍然有效
     */
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.status(405).send('Method Not Allowed')
      return
    }

    const rawAllowed = this.configService.get<string>('STATIC_ALLOWED_ORIGINS', '')
    const allowedOrigins = parseStaticAllowedOrigins(rawAllowed)

    // 配置为空：完全放开，不做任何 Origin 限制
    if (allowedOrigins.length === 0) {
      this.logger.log(`未配置allowedOrigins， 放行。req.originalUrl：${req.originalUrl}`)
      next()
      return
    }

    const origin = normalizeOrigin(req.headers.origin) ?? normalizeOrigin(req.headers.referer)

    // 无法获取来源：放行（避免误伤直接打开资源、部分浏览器策略等）
    if (!origin) {
      this.logger.log(`无法获取来源，放行。req.originalUrl：${req.originalUrl}`)
      next()
      return
    }

    const isAllowed = allowedOrigins.includes(origin)
    if (isAllowed) {
      this.logger.log(`允许${origin}访问，放行。req.originalUrl：${req.originalUrl}`)
      next()
      return
    }

    this.logger.warn(`禁止访问。req.originalUrl：${req.originalUrl}`)
    res.status(403).send('Forbidden')
  }
}
