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
 * 发布静态资源（随代码发布）的物理根目录：
 * - 该目录来自 nest-cli assets 拷贝：craft-backend/static/** /* => dist/craft-backend/static/** /*
 *
 * 注意：
 * - 这里依赖 __dirname（运行在 dist 时能正确指向 dist 下的 static）
 * - 该目录属于“构建产物”，不要往这里写运行时数据
 */
export const resolvePackagedStaticRootPath = (): string => {
  return path.join(__dirname, '..', '..', '..', 'static')
}

/**
 * 运行时上传数据的物理根目录（持久化，强制由环境变量配置）：
 * - `${RUNTIME_DATA_ROOT_PATH}/upload`
 *
 * 说明：
 * - 运行时数据必须脱离 dist，避免 build/重启导致丢失
 * - 这里读取 process.env 即可（ConfigModule 已在启动时完成校验）
 */
export const resolveRuntimeUploadRootPath = (): string => {
  const raw = process.env.RUNTIME_DATA_ROOT_PATH
  if (!isString(raw) || raw.trim().length === 0) {
    // 双保险：即使未来有人绕过 ConfigModule 校验，这里也能尽早失败
    throw new Error('RUNTIME_DATA_ROOT_PATH is required')
  }

  return path.resolve(raw.trim(), 'upload')
}
