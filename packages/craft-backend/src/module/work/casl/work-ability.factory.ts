import type { WorkAbility } from '@/module/work/casl/work-ability.types'
import type { UserPayload } from '@/types/type'
import { AbilityBuilder, createMongoAbility } from '@casl/ability'
import { Injectable } from '@nestjs/common'
import { WorkAction } from '@/module/work/casl/work-ability.types'

/**
 * WorkAbilityFactory：按用户生成 Work 模块的 Ability。
 *
 * 规则来源：用户在对话中确认的清单
 * - admin：manage all，但不能 delete Work
 * - normal：按“作者本人/公开”规则
 *
 * 注意：
 * - 这里用 string 来表达 userId 条件（user._id）
 * - Guard 在鉴权前会把 Work.user 归一化为 string（避免 ObjectId 等值匹配问题）
 */
@Injectable()
export class WorkAbilityFactory {
  createForUser(user: UserPayload): WorkAbility {
    const role = user.role ?? 'normal'

    const { can, cannot, build } = new AbilityBuilder<WorkAbility>(createMongoAbility)

    if (role === 'admin') {
      can(WorkAction.Manage, 'all')
      // A2：admin 不能操作 delete（覆盖 manage all）
      cannot(WorkAction.Delete, 'Work')
      return build()
    }

    // normal：按确认的能力清单
    can(WorkAction.Create, 'Work')

    // detail：作者本人 OR isPublic=true
    can(WorkAction.Read, 'Work', { user: user._id })
    can(WorkAction.Read, 'Work', { isPublic: true })

    // 作品操作：必须作者本人
    can(WorkAction.Update, 'Work', { user: user._id })
    can(WorkAction.Publish, 'Work', { user: user._id })
    can(WorkAction.PublishTemplate, 'Work', { user: user._id })
    can(WorkAction.Delete, 'Work', { user: user._id })

    // 渠道操作：独立 action，必须作者本人
    can(WorkAction.ManageChannels, 'Work', { user: user._id })

    return build()
  }
}
