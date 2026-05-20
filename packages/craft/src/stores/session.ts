import type {
  CreateByEmailReq,
  LoginByCellphoneReq,
  LoginByEmailReq,
  PublicUserDto,
  SendVerifyCodeReq,
} from '@/api/modules/user'
import { defineStore } from 'pinia'
import { computed, reactive, readonly, ref } from 'vue'
import { clearToken as clearHttpToken, getToken, setToken as setHttpToken } from '@/api/http'
import {
  createByEmail as apiCreateByEmail,
  getMe as apiGetMe,
  loginByCellphone as apiLoginByCellphone,
  loginByEmail as apiLoginByEmail,
  sendVerifyCode as apiSendVerifyCode,
} from '@/api/modules/user'

/**
 * 用户角色（后端 PublicUserDto.role 实际类型为 string，
 * 这里保留联合类型仅作为可读性提示，运行时取值由后端决定）
 */
export type UserRole = 'admin' | 'normal'

/**
 * 前端持有的用户信息：与后端 PublicUserDto 字段一一对齐
 * - 除 username 外几乎都是可选
 */
export type UserInfo = PublicUserDto

/**
 * 初始用户信息工厂
 * - 用最小可用值占位：未登录态下其他页面读取依然安全
 */
const getInitialUserInfo = (): UserInfo => ({
  username: '',
  nickName: '游客',
})

export const useSessionStore = defineStore('session', () => {
  /**
   * token 的 reactive 副本
   * - 真实 token 仍由 http 模块的 token.ts（localStorage + 内存缓存）持有
   * - 这里的 ref 仅用于让 isLogin 等 computed 能感知到登录态变化
   * - 通过 setToken / clearToken 双写保证两边同步
   */
  const tokenRef = ref<string>(getToken())

  const userInfo = reactive<UserInfo>(getInitialUserInfo())

  /**
   * 登录态判断：以 token 是否存在为唯一依据
   * - 优点：刷新页面时无需等待 fetchMe 即可立刻判定为已登录态，UI 不闪烁
   * - token 失效时由 http 拦截器的 401 兜底（自动 clearToken + 跳登录页）
   */
  const isLogin = computed(() => Boolean(tokenRef.value))

  /**
   * 双写 token：reactive 副本 + http 模块持久化层
   */
  const setToken = (token: string) => {
    tokenRef.value = token
    setHttpToken(token)
  }

  const clearToken = () => {
    tokenRef.value = ''
    clearHttpToken()
  }

  /**
   * 部分写入 userInfo，未传入字段保留原值
   * - 暴露给特殊场景（OAuth 回调 postMessage 直接回填）使用
   */
  const setUserInfo = (newUserInfo: Partial<UserInfo>) => {
    Object.assign(userInfo, newUserInfo)
  }

  /**
   * 清空 userInfo 回到初始态
   */
  const clearUserInfo = () => {
    Object.keys(userInfo).forEach((k) => {
      delete (userInfo as Record<string, unknown>)[k]
    })
    Object.assign(userInfo, getInitialUserInfo())
  }

  /**
   * 邮箱登录：调接口 → 写 token → 写 userInfo
   * - 失败时透传 BizError，全局 handler 已 toast，调用方只需处理成功路径
   */
  const loginByEmail = async (payload: LoginByEmailReq) => {
    const [data, err] = await apiLoginByEmail(payload)
    if (err) return [null, err] as const
    setToken(data.accessToken)
    setUserInfo(data.userInfo)
    return [data, null] as const
  }

  /**
   * 手机号 + 验证码 登录（未注册手机号自动注册）
   */
  const loginByCellphone = async (payload: LoginByCellphoneReq) => {
    const [data, err] = await apiLoginByCellphone(payload)
    if (err) return [null, err] as const
    setToken(data.accessToken)
    setUserInfo(data.userInfo)
    return [data, null] as const
  }

  /**
   * 邮箱注册
   * - 仅注册，不自动登录；"注册成功后立即登录" 的组合逻辑由调用方完成
   */
  const registerByEmail = (payload: CreateByEmailReq) => apiCreateByEmail(payload)

  /**
   * 发送短信验证码（透传 service 调用）
   * - 调用方拿到 verifyCode 可在开发态做调试展示
   */
  const sendVerifyCode = (payload: SendVerifyCodeReq) => apiSendVerifyCode(payload)

  /**
   * 拉取当前用户信息
   * - 仅写 userInfo，错误透传不做副作用（401 已被全局拦截器接管）
   */
  const fetchMe = async () => {
    const [data, err] = await apiGetMe()
    if (err) return [null, err] as const
    setUserInfo(data)
    return [data, null] as const
  }

  /**
   * 登出（纯前端）
   * - 后端目前无 logout 接口，仅清空 token + store 状态
   * - JWT 单 token + 无 refresh token 的项目，纯前端登出即可
   */
  const logout = () => {
    clearToken()
    clearUserInfo()
  }

  return {
    userInfo: readonly(userInfo),
    isLogin,
    setUserInfo,
    clearUserInfo,
    loginByEmail,
    loginByCellphone,
    registerByEmail,
    sendVerifyCode,
    fetchMe,
    logout,
  }
})
