import { existsSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 把任意 URL/Origin 字符串归一化为 `url.origin`（形如：`https://example.com`）。
 * - 非法 URL 返回 null
 * - 便于后续做“严格相等”匹配
 */
export const normalizeOrigin = (value: string): string | null => {
  const trimmed = value.trim()
  if (trimmed.length === 0) return null
  if (trimmed === 'null') return null

  try {
    const url = new URL(trimmed)
    return url.origin.toLowerCase()
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
        .filter((item): item is string => typeof item === 'string')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .map(normalizeOrigin)
        .filter((item): item is string => typeof item === 'string')
    }
    catch {
      // JSON 不合法：按“无配置”处理（完全放开）
      return []
    }
  }

  // 2) 逗号分隔
  return trimmed
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(normalizeOrigin)
    .filter((item): item is string => typeof item === 'string')
}

/**
 * 从 Referer 推导 Origin（尽力而为）。
 * 注意：Referer 在某些场景可能缺失或被客户端伪造，因此不能当成严格安全边界。
 */
export const getOriginFromReferer = (referer?: string): string | null => {
  if (typeof referer !== 'string') return null
  const trimmed = referer.trim()
  if (trimmed.length === 0) return null

  try {
    return new URL(trimmed).origin.toLowerCase()
  }
  catch {
    return null
  }
}

/**
 * 兼容开发/生产环境的静态资源物理目录定位：
 * - 开发（nest start --watch）：通常从 `packages/craft-backend/static` 读取
 * - 生产（node dist/...）：通常从 `packages/craft-backend/dist/craft-backend/static` 读取（由 nest-cli assets 拷贝）
 */
export const resolveStaticRootPath = (): string => {
  /**
   * 最稳妥的方式：基于当前文件所在目录（__dirname）向上回溯。
   *
   * - 开发态：.../packages/craft-backend/src/common/static-assets -> 上溯 4 级 -> .../packages/craft-backend -> /static
   * - 生产态：.../packages/craft-backend/dist/craft-backend/src/common/static-assets -> 上溯 4 级 -> .../dist/craft-backend -> /static
   */
  const byDirname = join(__dirname, '..', '..', '..', '..', 'static')
  if (existsSync(byDirname)) return byDirname

  /**
   * 兜底：基于进程工作目录尝试推断（不同启动方式可能 cwd 不同）。
   * - 如果你们固定用 pnpm --filter 进入 craft-backend 目录启动，这里通常也能命中
   */
  const candidates = [
    join(process.cwd(), 'dist', 'craft-backend', 'static'),
    join(process.cwd(), 'packages', 'craft-backend', 'dist', 'craft-backend', 'static'),
    join(process.cwd(), 'static'),
    join(process.cwd(), 'packages', 'craft-backend', 'static'),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }

  // 最终兜底：返回 byDirname（即使不存在，也能让错误更可见，便于排查部署路径问题）
  return byDirname
}
