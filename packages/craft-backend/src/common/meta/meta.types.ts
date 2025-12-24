/**
 * MetaResponse：全局统一返回结构。
 *
 * 设计约定：
 * - 成功：code = 0
 * - 业务失败：code = errno（复用 egg 项目的 returnCode/errno）
 * - 系统失败（401/404/500 等 HttpException）：code = httpStatus
 * - version：直接读取 ConfigService.get('VERSION')
 * - requestTime：毫秒级（Date.now）
 * - protocol：固定为 'default'
 */
export type MetaProtocol = 'default'

export interface MetaResponse<T> {
  code: number
  data: T
  message: string
  version: string
  traceId: string
  requestTime: number
  protocol: MetaProtocol
}

/**
 * MetaRes 装饰器的可选项（目前只支持成功 message）。
 * 后续如需扩展（例如 protocol/extra），可以在这里增加字段。
 */
export interface MetaResOptions {
  message?: string
}
