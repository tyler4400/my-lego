import type { ExecutionContext } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { BizException } from '@/common/error/biz.exception'

/**
 * 按需在控制器 / 路由上使用：
 *  @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * 统一把 JWT 校验失败转换为 BizException，
   * 以便 MetaResponse.code 复用旧 egg 的 errno（loginValidateFail=101004），同时保持 HTTP 401。
   */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: 401 })
    }
    return user as TUser
  }
}
