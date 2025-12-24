import type { ClassConstructor } from 'class-transformer'
import { UseInterceptors } from '@nestjs/common'
import { SerializeInterceptor } from '@/interceptor/serialize.interceptor'

/**
 * Serialize：用于给 controller 方法挂载序列化拦截器。
 *
 * 使用示例：
 * ```ts
 * @Serialize(PublicUserDto)
 * @Get('/me')
 * me() {
 *   return this.userService.getMe()
 * }
 * ```
 */
export function Serialize<T>(dto: ClassConstructor<T>, excludeExtraneousValues: boolean = true) {
  return UseInterceptors(new SerializeInterceptor(dto, excludeExtraneousValues))
}
