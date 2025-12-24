import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SKIP_META_RES_KEY } from '@/common/meta/meta.constants'

/**
 * MetaFlagGuard：用于在“其他 Guard 执行前”把 SkipMetaRes 标记写入 req，
 * 方便 ExceptionFilter 也能读取到（因为 Filter 无法直接拿到 handler/class 元数据）。
 *
 * 注意：该 Guard 永远返回 true，不会影响业务鉴权。
 *
 * 详细解释：
 *  MetaFlagGuard：把“是否 Skip”尽早写进 req
 * 这是你这套实现里最“巧”的地方，也解释了你为什么需要 APP_GUARD：
 * 问题：ExceptionFilter 的 catch(exception, host) 拿不到 context.getHandler()/getClass()，所以它无法直接用 Reflector 去读装饰器元数据。
 * 解决：在 Guard 阶段（能拿到 handler/class），读出 @SkipMetaRes() 的元数据，然后写到 req.__skipMetaRes。这样 Filter 只要看 req 就知道要不要跳过包装。
 */
@Injectable()
export class MetaFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_META_RES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const req = context.switchToHttp().getRequest<Request>()
    req.__skipMetaRes = skip === true
    return true
  }
}
