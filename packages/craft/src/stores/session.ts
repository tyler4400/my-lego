import type { ServiceConfig } from '@/api/http'
import type { GithubLoginPayload } from '@/api/modules/oauth.ts'
import type { CreateByEmailReq, LoginByCellphoneReq, LoginByEmailReq, PublicUserDto, SendVerifyCodeReq, UpdateUserReq } from '@/api/modules/user'
import type { OAuthError } from '@/utils/biz/openOauthPopup.ts'
import { GITHUB_OAUTH_TYPE, tryCatch } from '@my-lego/shared'
import { defineStore } from 'pinia'
import { computed, reactive, readonly, ref } from 'vue'
import { clearToken as clearHttpToken, getToken, setToken as setHttpToken } from '@/api/http'
import { API_HOST } from '@/api/http/constants.ts'
import { getGithubOauthUrl } from '@/api/modules/oauth.ts'
import {
  createByEmail as apiCreateByEmail,
  getMe as apiGetMe,
  loginByCellphone as apiLoginByCellphone,
  loginByEmail as apiLoginByEmail,
  sendVerifyCode as apiSendVerifyCode,
  updateUser as apiUpdateUser,
} from '@/api/modules/user'
import { openOauthPopup } from '@/utils/biz/openOauthPopup.ts'

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
  id: -1,
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
   * - config 透传给底层 service，供 useService 注入 signal 等场景使用
   */
  const loginByEmail = async (payload: LoginByEmailReq, config?: ServiceConfig<LoginByEmailReq>) => {
    const [data, err] = await apiLoginByEmail(payload, config)
    if (err) return [null, err] as const
    setToken(data.accessToken)
    setUserInfo(data.userInfo)
    return [data, null] as const
  }

  /**
   * 手机号 + 验证码 登录（未注册手机号自动注册）
   */
  const loginByCellphone = async (payload: LoginByCellphoneReq, config?: ServiceConfig<LoginByCellphoneReq>) => {
    const [data, err] = await apiLoginByCellphone(payload, config)
    if (err) return [null, err] as const
    setToken(data.accessToken)
    setUserInfo(data.userInfo)
    return [data, null] as const
  }

  /**
   * Oauth2 GitHub联合登录
   */
  const loginByGithub = async () => {
    const [data, err] = await tryCatch<GithubLoginPayload, OAuthError>(openOauthPopup({
      expectedOrigin: new URL(API_HOST).origin,
      url: getGithubOauthUrl(),
      expectedType: GITHUB_OAUTH_TYPE,
    }))
    if (err) return [null, err] as const
    setToken(data.accessToken)
    setUserInfo(data.userInfo)
    return [data, null] as const
  }

  /**
   * 邮箱注册
   * - 仅注册，不自动登录；"注册成功后立即登录" 的组合逻辑由调用方完成
   */
  const registerByEmail = (payload: CreateByEmailReq, config?: ServiceConfig<CreateByEmailReq>) =>
    apiCreateByEmail(payload, config)

  /**
   * 发送短信验证码（透传 service 调用）
   * - 调用方拿到 verifyCode 可在开发态做调试展示
   */
  const sendVerifyCode = (payload: SendVerifyCodeReq, config?: ServiceConfig<SendVerifyCodeReq>) =>
    apiSendVerifyCode(payload, config)

  /**
   * 拉取当前用户信息
   * - 仅写 userInfo，错误透传不做副作用（401 已被全局拦截器接管）
   * - 守卫场景通常传入 { silentSuccess: true } 抑制成功 toast，错误交给全局接管
   */
  const fetchMe = async (config?: ServiceConfig) => {
    const [data, err] = await apiGetMe(config)
    if (err) return [null, err] as const
    setUserInfo(data)
    return [data, null] as const
  }

  /**
   * 更新当前登录用户资料（白名单：nickName / picture）
   * - 成功后用响应数据覆盖全局 userInfo，保证 UserMenu/AppHeader 头像与昵称即时刷新
   * - 错误透传，业务方据此决定是否回滚 UI
   */
  const updateMe = async (payload: UpdateUserReq, config?: ServiceConfig<UpdateUserReq>) => {
    const [data, err] = await apiUpdateUser(payload, config)
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
    loginByGithub,
    registerByEmail,
    sendVerifyCode,
    fetchMe,
    updateMe,
    logout,
  }
})
