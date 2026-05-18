import { TOKEN_STORAGE_KEY } from './constants'

/**
 * token 内存缓存
 * - 首次读取时从 localStorage 同步到内存，后续读 / 写都先走内存
 * - 避免每次请求都触发一次 localStorage 同步 IO
 */
let memoryToken: string | null = null

/**
 * 获取当前 token
 * - 内存为空时回退到 localStorage
 * - localStorage 不可用（隐私模式 / SSR）时返回空字符串
 */
export const getToken = (): string => {
  if (memoryToken !== null) return memoryToken
  try {
    memoryToken = localStorage.getItem(TOKEN_STORAGE_KEY) ?? ''
  }
  catch {
    memoryToken = ''
  }
  return memoryToken
}

/**
 * 写入 token
 * - 空字符串等价于清空（同步从 localStorage 删除）
 */
export const setToken = (token: string) => {
  memoryToken = token
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token)
    }
    else {
      localStorage.removeItem(TOKEN_STORAGE_KEY)
    }
  }
  catch {
    // localStorage 不可用时静默忽略
  }
}

/** 清空 token（语义糖） */
export const clearToken = () => setToken('')
