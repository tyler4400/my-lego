import bcrypt from 'bcryptjs'

/**
 * 密码 hash & verify 工具（后端使用）。
 *
 * 注意：该模块会从 `@my-lego/shared` 的入口导出，但前端约定不使用。
 * 使用 bcryptjs 的原因：
 * - 纯 JS 依赖，Tree-shaking/打包阶段更稳定
 * - 便于在 monorepo 的 shared 包中导出，不影响前端构建
 */

const SALT_ROUNDS = 10

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS)
}

export const verifyPassword = async (plainPassword: string, passwordHash: string): Promise<boolean> => {
  return bcrypt.compare(plainPassword, passwordHash)
}
