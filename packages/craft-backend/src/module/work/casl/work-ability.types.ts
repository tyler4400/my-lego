import type { ForcedSubject, MongoAbility } from '@casl/ability'

/**
 * Work 模块的动作集合。
 *
 * 说明：
 * - 保留 CASL 约定的 'manage'（通配动作）
 * - 渠道操作单独用 manageChannels，避免与 Work 内容编辑混淆
 */
export enum WorkAction {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Publish = 'publish',
  PublishTemplate = 'publishTemplate',
  Delete = 'delete',
  ManageChannels = 'manageChannels',
}

/**
 * Work 的 CASL 实例类型（用于让 CASL 能推导条件字段）。
 *
 * 说明：
 * - CASL 对字符串 subject（如 'Work'）的条件推导，需要在 abilities 的 subject 联合里存在
 *   带 tag 的对象类型（ForcedSubject<'Work'>）。
 * - 这里仅声明授权判断会用到的最小字段（user/isPublic），避免把 mongoose 类型直接引入授权层。
 */
export type WorkCaslInstance = ForcedSubject<'Work'> & {
  user: string
  isPublic?: boolean
}

export type WorkSubject = 'Work' | 'all' | WorkCaslInstance

export type WorkAbility = MongoAbility<[WorkAction, WorkSubject]>
