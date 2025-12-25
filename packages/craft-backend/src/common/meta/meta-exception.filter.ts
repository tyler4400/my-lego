import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common'
import type { Request, Response } from 'express'
import type { MetaResponse } from '@/common/meta/meta.types'
import { randomUUID } from 'node:crypto'
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpAdapterHost } from '@nestjs/core'
import { BizException } from '@/common/error/biz.exception'
import { getErrorInfoByKey } from '@/common/error/error.registry'
import { DEFAULT_PROTOCOL } from '@/common/meta/meta.constants'

/**
 * MetaExceptionFilter：全局异常过滤器（输出统一 MetaResponse）。
 *
 * 约定：
 * - 业务异常（BizException）：httpStatus 默认 200（可自行指定），code=errno（egg returnCode）
 * - 系统异常（HttpException，如 401/404 等）：保持原 httpStatus，code=httpStatus（不做统一映射）
 * - 未知异常：httpStatus=500，code=100000（unknownValidateFail）
 */
@Catch()
export class MetaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MetaExceptionFilter.name)

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    if (req.__skipMetaRes === true) {
      // SkipMetaRes：尽量保持 Nest 默认错误格式（仅用于特殊接口）
      if (exception instanceof HttpException) {
        httpAdapter.reply(res, exception.getResponse(), exception.getStatus())
        return
      }
      httpAdapter.reply(res, { message: 'Internal Server Error' }, HttpStatus.INTERNAL_SERVER_ERROR)
      return
    }

    const meta = req.metaContext ?? {
      traceId: randomUUID(),
      requestTime: Date.now(),
      version: this.configService.get<string>('VERSION', ''),
      protocol: DEFAULT_PROTOCOL,
      ip: req.ip,
    }

    // 1) 业务异常：code=errno，message=业务 message，httpStatus 默认 200（可指定）
    if (exception instanceof BizException) {
      const body: MetaResponse<unknown> = {
        code: exception.errno,
        data: exception.bizData ?? null,
        message: exception.message,
        version: meta.version,
        traceId: meta.traceId,
        requestTime: meta.requestTime,
        protocol: meta.protocol,
        ip: meta.ip,
      }
      httpAdapter.reply(res, body, exception.getStatus())
      return
    }

    // BizException.custom 的兼容分支
    if (exception instanceof HttpException) {
      const anyEx = exception as HttpException & {
        errno?: number
        bizData?: unknown
        __isBizException?: boolean
      }
      if (anyEx.__isBizException === true && typeof anyEx.errno === 'number') {
        const body: MetaResponse<unknown> = {
          code: anyEx.errno,
          data: anyEx.bizData ?? null,
          message: exception.message,
          version: meta.version,
          traceId: meta.traceId,
          requestTime: meta.requestTime,
          protocol: meta.protocol,
          ip: meta.ip,
        }
        httpAdapter.reply(res, body, exception.getStatus())
        return
      }
    }

    // 2) 系统异常：保持 httpStatus，code=httpStatus，data 带上可读信息（不做业务映射）
    if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus()
      const responseBody = exception.getResponse()

      const { message, data } = normalizeHttpExceptionResponse(responseBody)

      const body: MetaResponse<unknown> = {
        code: httpStatus,
        data,
        message,
        version: meta.version,
        traceId: meta.traceId,
        requestTime: meta.requestTime,
        protocol: meta.protocol,
        ip: meta.ip,
      }

      httpAdapter.reply(res, body, httpStatus)
      return
    }

    // 3) 未知异常：返回 500 + unknownValidateFail
    const unknownInfo = getErrorInfoByKey('unknownValidateFail')
    const body: MetaResponse<null> = {
      code: unknownInfo.errno,
      data: null,
      message: unknownInfo.message,
      version: meta.version,
      traceId: meta.traceId,
      requestTime: meta.requestTime,
      protocol: meta.protocol,
      ip: meta.ip,
    }

    // 记录完整异常（不返回给前端）
    this.logger.error('[Unhandled Exception]', exception)
    httpAdapter.reply(res, body, HttpStatus.INTERNAL_SERVER_ERROR)
  }
}

function normalizeHttpExceptionResponse(responseBody: unknown): { message: string, data: unknown } {
  // Nest 默认 HttpException.getResponse() 可能是 string 或 object
  if (typeof responseBody === 'string') {
    return { message: responseBody, data: null }
  }

  if (!responseBody || typeof responseBody !== 'object') {
    return { message: '请求失败', data: null }
  }

  const obj = responseBody as Record<string, unknown>
  const rawMessage = obj.message

  let message = '请求失败'
  if (Array.isArray(rawMessage)) {
    message = rawMessage.map(v => String(v)).join('; ')
  }
  else if (typeof rawMessage === 'string') {
    message = rawMessage
  }
  else if (typeof obj.error === 'string') {
    message = obj.error
  }

  // 为避免与顶层 code 混淆，尽量剔除 statusCode 字段
  const { statusCode, ...rest } = obj
  const data = Object.keys(rest).length > 0 ? rest : null

  return { message, data }
}
