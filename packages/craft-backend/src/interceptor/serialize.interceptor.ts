import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common'
import type { ClassConstructor } from 'class-transformer'
import type { Observable } from 'rxjs'
import { Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { map } from 'rxjs'

/**
 * SerializeInterceptor：把“业务 data”序列化为 DTO。
 *
 * 说明：
 * - 该拦截器只处理 controller 的返回值（业务 data），不会影响 MetaResponse 的外层包装
 * - 在全局 MetaResponseInterceptor 之前执行（内层），因此最终返回结构是：
 *   MetaResponse<{业务 DTO}>
 */
@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(
    private readonly dto: ClassConstructor<T>,
    private readonly excludeExtraneousValues: boolean = true,
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<T> {
    return next.handle().pipe(
      map((data) => {
        return plainToInstance(this.dto, data, {
          excludeExtraneousValues: this.excludeExtraneousValues,
          enableImplicitConversion: true,
        })
      }),
    )
  }
}
