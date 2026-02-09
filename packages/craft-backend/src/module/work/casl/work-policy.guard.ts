import type { CanActivate, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'
import type { WorkPolicyMeta } from '@/module/work/casl/work-policy.decorator'
import type { UserPayload } from '@/types/type'
import { subject } from '@casl/ability'
import { Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { BizException } from '@/common/error/biz.exception'
import { WorkAbilityFactory } from '@/module/work/casl/work-ability.factory'
import { WORK_POLICY_KEY } from '@/module/work/casl/work-policy.decorator'
import { WorkService } from '@/module/work/work.service'

@Injectable()
export class WorkPolicyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: WorkAbilityFactory,
    private readonly workService: WorkService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<WorkPolicyMeta>(WORK_POLICY_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!meta) return true

    const req = context.switchToHttp().getRequest<Request>()
    const user = req.user as UserPayload | undefined
    if (!user) {
      // 兜底：理论上 JwtAuthGuard 已经拦住
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: 401 })
    }

    // C1：旧 token 可能不带 role，缺省视为 normal
    const normalizedUser: UserPayload = { ...user, role: user.role ?? 'normal' }

    // 保持你们现有语义：payload._id 非法 -> loginValidateFail（401）
    this.workService.getUserObjectId(normalizedUser)

    const ability = this.abilityFactory.createForUser(normalizedUser)

    const rawId = this.getWorkIdFromRequest(req, meta)
    const workId = Number(rawId)

    // Guard 执行时机早于 pipe/validation：
    // - id 非法时，让后续 ValidationPipe / ParseIntPipe 去抛 userValidateFail
    if (!Number.isFinite(workId)) return true

    // 与现有行为一致：排除软删除；不存在则抛 workNotExistError
    const work = await this.workService.findWorkByIdOrThrow(workId)

    // 归一化 user 字段为 string，避免 ObjectId 等值匹配导致 can(...) 误判
    const ownerId = String((work as any).user?._id ?? (work as any).user ?? '')
    const workForAbility = { ...work, user: ownerId }

    /**
     * subject（）是 CASL 提供的一个工具函数（在 @casl/ability 里叫 setSubjectType，但导出名就是 subject），作用是：
     * 给一个普通对象“打标签”：把它标记为某个 subject 类型（这里是 'Work'）
     * 这样 CASL 在执行 ability.can(action, 某个对象) 时，能明确知道“这对象属于 Work”，
     * 从而去匹配你在 Ability 里写的规则（比如 can(Read, 'Work', { isPublic: true }) / can(Update, 'Work', { user: xxx })）
     * 如果你只是直接传对象 ability.can(action, workForAbility)，CASL 需要靠 detectSubjectType 去猜 subject 类型；
     * 而你的对象是 .lean() 出来的普通对象/并没有 class 信息时，通常猜不出来。所以我们用 subject('Work', ...) 明确告诉它：这就是一个 Work。
     */
    const ok = ability.can(meta.action, subject('Work', workForAbility))
    if (ok) return true

    throw new BizException({ errorKey: meta.errorKey })
  }

  private getWorkIdFromRequest(req: Request, meta: WorkPolicyMeta) {
    if (meta.idFrom === 'body') return req.body?.[meta.idKey]
    if (meta.idFrom === 'query') return req.query?.[meta.idKey]
    return req.params?.[meta.idKey]
  }
}
