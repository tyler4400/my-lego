import { userErrorMessages } from '@/common/error/user.error'
import { utilsErrorMessages } from '@/common/error/utils'
import { workErrorMessages } from '@/common/error/work'

/**
 * 全局错误码表（未来可扩展 work/utils 等）。
 * 业务侧通过 errorKey 查表获取 errno/message，然后抛 BizException。
 *
 * 统一格式：A-BB-CCC
 *
 * A:错误级别，如1代表系统级错误，2代表服务级错误
 * B:项目或模块名称，一般公司不会超过99个项目，这里使用 01 代表用户模块。
 * C:具体错误编号，自增即可，一个项目999种错误应该够用
 */
export const globalErrorMessages = {
  ...userErrorMessages,
  ...utilsErrorMessages,
  ...workErrorMessages,
} as const

export type GlobalErrorKey = keyof typeof globalErrorMessages

export type GlobalErrorInfo = (typeof globalErrorMessages)[GlobalErrorKey]

export const getErrorInfoByKey = (key: GlobalErrorKey): GlobalErrorInfo => globalErrorMessages[key]
