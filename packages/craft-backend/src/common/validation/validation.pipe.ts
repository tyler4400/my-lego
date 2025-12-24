import type { ValidationError } from 'class-validator'
import { ValidationPipe } from '@nestjs/common'
import { BizException } from '@/common/error/biz.exception'

/**
 * createGlobalValidationPipe：统一全局 ValidationPipe 配置。
 *
 * 关键点：
 * - 使用 exceptionFactory 将校验错误转换为 BizException（userValidateFail）
 * - 从源头保证 MetaResponse.code = 101001（而不是依赖 Filter 做映射）
 */
export const createGlobalValidationPipe = () => {
  return new ValidationPipe({
    whitelist: true, // 自动剔除 DTO 中未声明的多余字段
    // 遇到多余字段直接抛错（更严格、更安全）。
    // forbidNonWhitelisted: true
    // transform: 自动转换请求对象到 DTO 实例
    transform: true,
    transformOptions: {
      // 允许类转换器隐式转换字段类型，如将字符串转换为数字等。
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const normalized = normalizeValidationErrors(errors)
      throw new BizException({
        errorKey: 'userValidateFail',
        httpStatus: 400,
        data: { errors: normalized },
      })
    },
  })
}

interface NormalizedValidationError {
  field: string
  constraints: string[]
}

function normalizeValidationErrors(errors: ValidationError[]): NormalizedValidationError[] {
  const result: NormalizedValidationError[] = []

  const walk = (items: ValidationError[], parentPath?: string) => {
    for (const item of items) {
      const path = parentPath ? `${parentPath}.${item.property}` : item.property

      if (item.constraints) {
        result.push({
          field: path,
          constraints: Object.values(item.constraints),
        })
      }

      if (item.children && item.children.length > 0) {
        walk(item.children, path)
      }
    }
  }

  walk(errors)
  return result
}
