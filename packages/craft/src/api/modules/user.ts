import type { UserRole } from '@/stores/userInfo'
import { http, httpTry } from '@/api/http'

/**
 * 用户信息 DTO（与 craft-backend 返回结构对齐）
 */
export interface UserInfoDto {
  _id: string
  username: string
  nickName: string
  email: string
  picture: string
  phoneNumber: string
  role: UserRole
}

export interface LoginDto {
  username: string
  password: string
}

export interface LoginResDto {
  token: string
  user: UserInfoDto
}

/**
 * 获取当前登录用户信息
 * - service 内部已用 httpTry 收口为 [data, err] 元组，业务层无需再包一层
 */
export const getMe = () => httpTry(http.get<UserInfoDto>('/v1/user/me'))

/**
 * 登录
 * - silent: true：失败时不弹默认错误提示，由登录页自行处理
 */
export const login = (body: LoginDto) =>
  httpTry(http.post<LoginResDto, LoginDto>('/v1/auth/login', body, { silent: true }))

/**
 * 退出登录
 */
export const logout = () => httpTry(http.post<void>('/v1/auth/logout'))
