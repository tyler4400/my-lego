import { userErrorMessages } from '@/common/error/user.error'

/**
 * 全局错误码表（未来可扩展 work/utils 等）。
 * 业务侧通过 errorKey 查表获取 errno/message，然后抛 BizException。
 */
export const globalErrorMessages = {
  ...userErrorMessages,
} as const

export type GlobalErrorKey = keyof typeof globalErrorMessages

export type GlobalErrorInfo = (typeof globalErrorMessages)[GlobalErrorKey]

export const getErrorInfoByKey = (key: GlobalErrorKey): GlobalErrorInfo => globalErrorMessages[key]
