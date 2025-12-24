import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { Request } from 'express'
import type { Observable } from 'rxjs'
import type { MetaResOptions, MetaResponse } from '@/common/meta/meta.types'
import { randomUUID } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { map } from 'rxjs'
import {
  DEFAULT_PROTOCOL,
  DEFAULT_SUCCESS_CODE,
  DEFAULT_SUCCESS_MESSAGE,
  META_RES_OPTIONS_KEY,
} from '@/common/meta/meta.constants'

/**
 * MetaResponseInterceptor：全局成功响应包装器。
 * - controller 只返回业务 data
 * - 由该拦截器统一包装成 MetaResponse<T>
 */
@Injectable()
export class MetaResponseInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<MetaResponse<unknown>> {
    const req = context.switchToHttp().getRequest<Request>()
    if (req.__skipMetaRes === true) {
      // eslint-disable-next-line ts/no-unsafe-return
      return next.handle() as any
    }

    const options = this.reflector.getAllAndOverride<MetaResOptions>(META_RES_OPTIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    const message = options?.message ?? DEFAULT_SUCCESS_MESSAGE

    return next.handle().pipe(
      map((businessData) => {
        const meta = req.metaContext ?? {
          traceId: randomUUID(),
          requestTime: Date.now(),
          version: '',
          protocol: DEFAULT_PROTOCOL,
        }

        return {
          code: DEFAULT_SUCCESS_CODE,
          data: businessData ?? null,
          message,
          version: meta.version,
          traceId: meta.traceId,
          requestTime: meta.requestTime,
          protocol: meta.protocol,
        }
      }),
    )
  }
}
