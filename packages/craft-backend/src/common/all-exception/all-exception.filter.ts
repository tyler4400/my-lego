import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'
import { Request, Response } from 'express'
// import * as requestIp from 'request-ip'

@Catch()
export class AllExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionFilter.name)

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const httpStatus
      = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    let message = 'Internal Server Error'
    let stack: string | undefined

    if (exception instanceof HttpException) {
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message ?? JSON.stringify(res)
    }
    else if (exception instanceof Error) {
      message = exception.message
      stack = exception.stack
    }

    const responseBody = {
      headers: request.headers,
      query: request.query,
      body: request.body as object,
      params: request.params,
      timestamp: new Date().toISOString(),
      // ip: requestIp.getClientIp(request),
      exception: (exception as any)?.name,
      error: message,
      stack,
    }

    this.logger.error('[Unhandled Exception]', responseBody)

    httpAdapter.reply(response, responseBody, httpStatus)
  }
}
