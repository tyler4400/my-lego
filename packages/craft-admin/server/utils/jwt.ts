import type { SignOptions, VerifyOptions } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  username: string
  _id: string
}

// 写在 jwt.ts 里，紧挨 JwtPayload 定义即可（就近维护）
declare module 'h3' {
  interface H3EventContext {
    user?: JwtPayload // 复用上面的 JwtPayload（记得先把 _id 改成 string）
  }
}

export const signJwtToken = (userData: JwtPayload, options: SignOptions = {}) => {
  const config = useRuntimeConfig()
  const newOpt = { expiresIn: config.jwt.expiresIn, ...options }
  return jwt.sign(userData, config.jwt.secret, newOpt)
}

export const verifyJwtToken = (token: string, options: VerifyOptions = {}): JwtPayload => {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwt.secret, options) as JwtPayload
}
