import type { MetaResOptions } from '@/common/meta/meta.types'
import { SetMetadata } from '@nestjs/common'
import { META_RES_OPTIONS_KEY, SKIP_META_RES_KEY } from '@/common/meta/meta.constants'

/**
 * MetaRes：用于声明“成功响应”的 message（controller 只返回业务 data，不再手写包装结构）。
 *
 * 使用示例：
 * ```ts
 * @MetaRes({ message: '登录成功' })
 * @Post('/loginByEmail')
 * loginByEmail(@Body() dto: LoginByEmailDto) {
 *   return this.userService.loginByEmail(dto)
 * }
 * ```
 */
export function MetaRes(options?: MetaResOptions) {
  return SetMetadata(META_RES_OPTIONS_KEY, options ?? {})
}

/**
 * SkipMetaRes：跳过 MetaResponse 包装（用于文件流/特殊接口等）。
 *
 * 注意：一般情况下不需要使用；仅在确实不希望返回 MetaResponse 时启用。
 * 流式/文件下载/手动写响应：务必使用 @SkipMetaRes()，否则 Interceptor 会尝试包装返回值，导致响应格式不对。
 */
export function SkipMetaRes() {
  return SetMetadata(SKIP_META_RES_KEY, true)
}
