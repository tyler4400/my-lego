import type { GlobalErrorKey } from '@/common/error/error.registry'
import { HttpException, HttpStatus } from '@nestjs/common'
import { getErrorInfoByKey } from '@/common/error/error.registry'

export interface BizExceptionOptions {
  /**
   * 业务错误 key（从旧 egg 项目迁移的 errorMessages 表中取值）
   */
  errorKey: GlobalErrorKey
  /**
   * 业务错误附加信息（会进入 MetaResponse.data）
   */
  data?: unknown
  /**
   * HTTP status：
   * - 默认 200（与 egg 兼容：业务失败不等于协议失败）
   * - 对于 401/404/500 等“系统类错误”，可显式传入对应 status
   */
  httpStatus?: number
}

/**
 * BizException：业务异常。
 *
 * - MetaResponse.code：使用 errno（复用旧 egg 的 returnCode/errno）
 * - HTTP status：默认 200，可按需指定（例如鉴权失败 401）
 *
 * 使用示例：
 * ```ts
 * // 用户已存在
 * throw new BizException({ errorKey: 'createUserAlreadyExists' })
 *
 * // 验证失败（建议配合 ValidationPipe.exceptionFactory）
 * throw new BizException({
 *   errorKey: 'userValidateFail',
 *   httpStatus: 400,
 *   data: { errors: [...] },
 * })
 * ```
 */
export class BizException extends HttpException {
  readonly errno: number
  readonly errorKey: GlobalErrorKey
  readonly bizData: unknown

  constructor(options: BizExceptionOptions) {
    const info = getErrorInfoByKey(options.errorKey)
    super(info.message, options.httpStatus ?? HttpStatus.OK)

    this.errno = info.errno
    this.errorKey = options.errorKey
    this.bizData = options.data ?? null
  }

  /**
   * 自定义业务错误（无需 errorKey）。
   * 适用于临时错误或需要动态 message 的场景。
   */
  static custom(options: { errno: number, message: string, data?: unknown, httpStatus?: number }) {
    const ex = new HttpException(options.message, options.httpStatus ?? HttpStatus.OK) as HttpException & {
      errno?: number
      bizData?: unknown
      __isBizException?: boolean
    }
    ex.errno = options.errno
    ex.bizData = options.data ?? null
    ex.__isBizException = true
    return ex
  }
}
