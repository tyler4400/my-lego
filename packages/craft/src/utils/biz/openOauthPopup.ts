/**
 * OAuth popup 登录的通用工具
 * - 负责：开 popup → 监听 postMessage → 校验 origin/type → 清理（成功/取消/拦截/超时）
 * - 不负责：业务态写入（token / userInfo），由调用方决定
 * - 调用方拿到 payload 后自行更新 store；失败时根据 OAuthError.code 决定文案
 */
export type OAuthErrorCode
  = | 'popup_blocked' // 浏览器拦截了 window.open
    | 'user_cancelled' // 用户手动关闭了 popup
    | 'timeout' // 在期望时间内未收到合法 message

export class OAuthError extends Error {
  readonly code: OAuthErrorCode
  constructor(code: OAuthErrorCode, message: string) {
    super(message)
    this.name = 'OAuthError'
    this.code = code
  }
}

export interface OAuthMessage<T> {
  type: string
  payload: T
}

export interface OpenOAuthPopupOptions {
  /** 授权入口 URL，例如 ${API_ORIGIN}/api/v1/oauth/github/authorize */
  url: string
  /** 期望的 postMessage origin（必须是纯 origin，不带 path/尾斜杠） */
  expectedOrigin: string
  /** 期望的 message.type，例如 'oauth.github' */
  expectedType: string
  /** 整体超时，默认 5 分钟 */
  timeoutMs?: number
  /** popup window name / features，按需透传 */
  windowName?: string
  windowFeatures?: string
}

export const openOauthPopup = <T>(options: OpenOAuthPopupOptions): Promise<T> => {
  const {
    url,
    expectedOrigin,
    expectedType,
    timeoutMs = 5 * 60 * 1000,
    windowName = '_blank',
    windowFeatures,
  } = options

  return new Promise<T>((resolve, reject) => {
    const popup = window.open(url, windowName, windowFeatures)

    // 浏览器拦截弹窗：立即拒绝，不绑任何 listener
    if (!popup) {
      reject(new OAuthError('popup_blocked', '浏览器阻止了授权窗口，请允许弹窗后重试'))
      return
    }

    // settled 防重入：成功 / 取消 / 超时 三路只允许走一次
    let settled = false
    const finalize = (cb: () => void) => {
      if (settled) return

      settled = true
      // eslint-disable-next-line ts/no-use-before-define
      window.removeEventListener('message', handleMessage)
      // eslint-disable-next-line ts/no-use-before-define
      clearInterval(closedTimer)
      // eslint-disable-next-line ts/no-use-before-define
      clearTimeout(timeoutTimer)
      cb()
    }

    const handleMessage = (event: MessageEvent) => {
      // origin 校验：防止任意页面给你 postMessage 注入假 token
      if (event.origin !== expectedOrigin) return
      const data = event.data as OAuthMessage<T> | undefined
      if (!data || data.type !== expectedType) return

      finalize(() => {
        popup.close()
        resolve(data.payload)
      })
    }
    window.addEventListener('message', handleMessage)

    // 轮询 popup 是否被用户关闭（浏览器没有 close 事件，只能轮询）
    const closedTimer = window.setInterval(() => {
      if (popup.closed) {
        finalize(() => {
          reject(new OAuthError('user_cancelled', '用户关闭授权页面，已取消授权'))
        })
      }
    }, 500)

    // 整体超时兜底
    const timeoutTimer = window.setTimeout(() => {
      finalize(() => {
        popup.close()
        reject(new OAuthError('timeout', '授权超时，请重试'))
      })
    }, timeoutMs)
  })
}
