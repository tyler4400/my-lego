import path from 'node:path'
import { isString } from '@my-lego/shared'

/**
 * 把任意 URL/Origin 字符串归一化为 `url.origin`（形如：`https://example.com`）。
 * - 非法 URL 返回 null
 * - 便于后续做“严格相等”匹配
 */
export const normalizeOrigin = (val?: unknown): string | null => {
  if (!isString(val)) return null
  const trimmed = val.trim()
  if (trimmed.length === 0) return null

  try {
    return new URL(trimmed).origin.toLowerCase()
  }
  catch {
    return null
  }
}

/**
 * 从环境变量解析允许的 Origin 列表。
 *
 * 设计目标：
 * - 支持 JSON 数组：["http://localhost:5173","https://your-frontend.com"]
 * - 支持逗号分隔：http://localhost:5173,https://your-frontend.com
 * - 空值/解析失败：返回空数组（代表“不做任何 Origin 限制”）
 */
export const parseStaticAllowedOrigins = (rawValue?: string): string[] => {
  if (typeof rawValue !== 'string') return []
  const trimmed = rawValue.trim()
  if (trimmed.length === 0) return []

  // 1) JSON 数组
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(normalizeOrigin)
        .filter(isString)
    }
    catch {
      // JSON 不合法：按“无配置”处理（完全放开）
      return []
    }
  }

  // 2) 逗号分隔
  return trimmed
    .split(',')
    .map(normalizeOrigin)
    .filter(isString)
}

/**
 * 兼容开发/生产环境的静态资源物理目录定位：
 * __dirname： .../packages/craft-backend/dist/craft-backend/src/common/static
 * static:     .../packages/craft-backend/dist/craft-backend/static
 * 所以向上3层 + static
 */
export const resolveStaticRootPath = (): string => {
  return path.join(__dirname, '..', '..', '..', 'static')
}
