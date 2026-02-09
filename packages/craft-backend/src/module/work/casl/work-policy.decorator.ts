import type { GlobalErrorKey } from '@/common/error/error.registry'
import type { WorkAction } from '@/module/work/casl/work-ability.types'
import { SetMetadata } from '@nestjs/common'

export const WORK_POLICY_KEY = 'work_policy' as const

export type WorkPolicyIdFrom = 'body' | 'query' | 'params'

export interface WorkPolicyMeta {
  action: WorkAction
  idFrom: WorkPolicyIdFrom
  idKey: string
  errorKey: GlobalErrorKey
}

/**
 * WorkPolicy：在 controller 路由上声明“对某个 Work 做某个 action”的授权策略。
 *
 * 设计目标：controller 使用时尽量短（减少对象字面量的臃肿）。
 *
 * 默认值：
 * - idFrom: body
 * - idKey: id
 * - errorKey: workNoPermissonFail
 */
export const WorkPolicy = (
  action: WorkAction,
  idFrom: WorkPolicyIdFrom = 'body',
  idKey = 'id',
  errorKey: GlobalErrorKey = 'workNoPermissonFail',
) => SetMetadata(WORK_POLICY_KEY, { action, idFrom, idKey, errorKey } satisfies WorkPolicyMeta)
