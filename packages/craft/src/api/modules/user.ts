import { http, httpTry } from '@/api/http'

/**
 * 公开用户信息 DTO
 * - 与 craft-backend `PublicUserDto` 字段对齐
 * - 除 username 外几乎都是可选（手机号注册的用户没 email、邮箱注册的没 phoneNumber 等）
 * - id 是数据库自增 number，前端展示场景一般不依赖具体类型
 */
export interface PublicUserDto {
  id?: number
  username: string
  email?: string
  nickName?: string
  picture?: string
  phoneNumber?: string
  type?: string
  role?: string
  provider?: string
  oauthID?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * 登录类接口的统一响应：accessToken + 用户信息
 */
export interface LoginResDto {
  accessToken: string
  userInfo: PublicUserDto
}

/**
 * 邮箱注册请求体（与后端 CreateByEmailDto 对齐）
 * - username 必须是合法邮箱
 * - password ≥ 8 位
 */
export interface CreateByEmailReq {
  username: string
  password: string
}

/**
 * 邮箱登录请求体（与后端 LoginByEmailDto 对齐，字段同注册）
 */
export type LoginByEmailReq = CreateByEmailReq

/**
 * 发送短信验证码请求体
 */
export interface SendVerifyCodeReq {
  phoneNumber: string
}

/**
 * 发送短信验证码响应
 * - 开发态后端会直接返回 verifyCode 便于联调
 * - 生产环境字段可能被后端置空，前端不要依赖该字段做强校验
 */
export interface SendVerifyCodeRes {
  verifyCode: string
}

/**
 * 手机号 + 验证码 登录请求体
 * - phoneNumber 1[3-9]开头 11 位
 * - verifyCode 4 位数字字符串
 */
export interface LoginByCellphoneReq {
  phoneNumber: string
  verifyCode: string
}

/**
 * 邮箱注册（不会自动登录，由调用方决定后续动作）
 */
export const createByEmail = (body: CreateByEmailReq) =>
  httpTry(http.post<PublicUserDto, CreateByEmailReq>('/v1/user/createByEmail', body))

/**
 * 邮箱登录
 */
export const loginByEmail = (body: LoginByEmailReq) =>
  httpTry(http.post<LoginResDto, LoginByEmailReq>('/v1/user/loginByEmail', body))

/**
 * 发送短信验证码
 */
export const sendVerifyCode = (body: SendVerifyCodeReq) =>
  httpTry(http.post<SendVerifyCodeRes, SendVerifyCodeReq>('/v1/user/sendVerifyCode', body))

/**
 * 手机号 + 验证码 登录（未注册手机号自动注册）
 */
export const loginByCellphone = (body: LoginByCellphoneReq) =>
  httpTry(http.post<LoginResDto, LoginByCellphoneReq>('/v1/user/loginByCellphone', body))

/**
 * 获取当前登录用户信息（JWT 保护）
 * - 401 会被全局 http:unauthorized 拦截器接管（自动跳登录页）
 */
export const getMe = () => httpTry(http.get<PublicUserDto>('/v1/user/me'))
