import type { SignOptions, VerifyOptions } from 'jsonwebtoken'
import type mongoose from 'mongoose'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  username: string
  _id: mongoose.Types.ObjectId
}

export const signJwtToken = (userData: Parameters<typeof jwt.sign>[0], options: SignOptions = {}) => {
  const config = useRuntimeConfig()
  const newOpt = { expiresIn: config.jwt.expiresIn, ...options }
  return jwt.sign(userData, config.jwt.secret, newOpt)
}

export const verifyJwtToken = (token: string, options: VerifyOptions = {}): JwtPayload => {
  const config = useRuntimeConfig()
  return jwt.verify(token, config.jwt.secret, options) as JwtPayload
}
