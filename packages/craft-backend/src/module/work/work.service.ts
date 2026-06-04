import type { UserPayload } from '@/types/type'
import { isBoolean, isUndefined } from '@my-lego/shared'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { nanoid } from 'nanoid'
import { BizException } from '@/common/error/biz.exception'
import { allWorkStatus, Work, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { MyListQueryDto } from '@/module/work/dto/my-list-query.dto'
import { PublicListQueryDto } from '@/module/work/dto/public-list-query.dto'
import { projection } from '@/module/work/dto/work-list-item.dto'
import { publicListProjection } from '@/module/work/dto/work-public-list-item.dto'
import { WorkUpdateDto } from '@/module/work/dto/work-update.dto'

/**
 * 创建 Work 的入参类型。
 *
 * 说明：
 * - title/content 在 CreateDto 中是必填，这里也设为必填
 * - 不允许在创建时设置 isPublic / isTemplate / isHot：
 *   - isPublic / isTemplate 受「必须 Published」约束，新建作品状态为 Initial，违反约束
 *   - isHot 是运营标记，本期不在创建链路开放
 */
type CreateWorkInput
  = Required<Pick<Work, 'title'>>
    & { content: NonNullable<Work['content']> }
    & Partial<Pick<Work, 'desc' | 'coverImg'>>

@Injectable()
export class WorkService {
  private readonly logger = new Logger(WorkService.name)

  constructor(@InjectModel(Work.name) private readonly workModel: Model<WorkDocument>) {}

  /**
   * 把 JWT 中的 _id string 转成 mongoose ObjectId，并做合法性校验。
   */
  getUserObjectId(userPayload: UserPayload) {
    if (!Types.ObjectId.isValid(userPayload._id)) {
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }
    return new Types.ObjectId(userPayload._id)
  }

  /**
   * 统一“作品不存在”（排除软删除）
   */
  async findWorkByIdOrThrow(id: number) {
    const work = await this.workModel.findOne({ id, status: { $ne: WorkStatusEnum.Deleted } }).lean()
    if (!work) {
      throw new BizException({ errorKey: 'workNotExistError' })
    }
    return work
  }

  /**
   * 创建作品（未发布）
   */
  async createWork(work: CreateWorkInput, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)
    return this.workModel.create({
      ...work,
      uuid: nanoid(8), // 生成短uuid，给h5使用
      user: userObjectId,
      author: userPayload.username,
    })
  }

  async getMyWorkList(query: MyListQueryDto, userPayload: UserPayload) {
    this.logger.debug(query)
    const userObjectId = this.getUserObjectId(userPayload)

    const filter: Record<string, any> = {
      user: userObjectId,
      ...allWorkStatus.includes(query.status as WorkStatusEnum) ? { status: query.status } : {},
      ...isBoolean(query.isTemplate) ? { isTemplate: query.isTemplate } : {},
    }

    if (query.safeTitle) {
      // filter.title = new RegExp(query.safeTitle, 'i') // 这样写RegExp对象不会被打印出来
      filter.title = { $regex: query.safeTitle, $options: 'i' }
    }

    this.logger.debug(filter)
    const [list, total] = await Promise.all([
      this.workModel
        .find(filter)
        .select(projection.join(' '))
        .sort(query.sort)
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      this.workModel.countDocuments(filter),
    ])
    return { list, total }
  }

  async getWorkDetail(id: number) {
    const work = await this.workModel
      .findOne({ id, status: { $ne: WorkStatusEnum.Deleted } })
      .populate({ path: 'user', select: 'username nickName picture' }) // Select必有_id
      .lean()

    this.logger.debug(work)
    if (!work) throw new BizException(({ errorKey: 'workNotExistError' }))

    return work
  }

  async updateMyWork(dto: WorkUpdateDto) {
    const updated = await this.workModel
      .findOneAndUpdate(
        { id: dto.id, status: { $ne: WorkStatusEnum.Deleted } },
        { $set: {
          ...isUndefined(dto.title) ? {} : { title: dto.title },
          ...isUndefined(dto.desc) ? {} : { desc: dto.desc },
          ...isUndefined(dto.coverImg) ? {} : { coverImg: dto.coverImg },
          ...isUndefined(dto.content) ? {} : { content: dto.content },
        } },
        { new: true },
      )
      .populate({ path: 'user', select: 'username nickName picture' })
      .lean()

    if (!updated) throw new BizException(({ errorKey: 'workNotExistError' }))

    return updated
  }

  /**
   * 发布作品：仅允许 Initial -> Published
   */
  async publishMyWork(id: number) {
    const existing = await this.findWorkByIdOrThrow(id)

    if (existing.status !== WorkStatusEnum.Initial) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    const now = new Date()

    const updated = await this.workModel
      .findOneAndUpdate(
        { id, status: WorkStatusEnum.Initial },
        { $set: { status: WorkStatusEnum.Published, latestPublishAt: now } },
        { new: true },
      )
      .populate({ path: 'user', select: 'username nickName picture' })
      .lean()

    if (!updated) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    return updated
  }

  /**
   * 发布为模版：要求 status 已是 Published；不可重复；同时 isTemplate 置 true，isPublic可以为false，可以是私有模板
   */
  async publishTemplate(id: number) {
    const existing = await this.findWorkByIdOrThrow(id)

    if (existing.status !== WorkStatusEnum.Published) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    if (existing.isTemplate === true) {
      throw new BizException({ errorKey: 'workAlreadyTemplateFail' })
    }

    const updated = await this.workModel
      .findOneAndUpdate(
        { id, isTemplate: { $ne: true }, status: WorkStatusEnum.Published },
        { $set: { isTemplate: true } },
        { new: true },
      )
      .populate({ path: 'user', select: 'username nickName picture' })
      .lean()

    if (!updated) {
      throw new BizException({ errorKey: 'workAlreadyTemplateFail' })
    }

    return updated
  }

  /**
   * 切换作品公开性（isPublic）
   *
   * 业务约束：
   * - 仅 status=Published 的作品才允许调用本接口（无论目标 isPublic 是 true 还是 false）
   *   原因：未发布的作品不在 H5 渲染白名单内（H5 只看 Published），也不会出现在任何
   *   对外的可见性列表里，所以「公开/私有」对它没有业务意义。
   * - 该数据完整性约束对所有角色（含 admin）一视同仁。
   */
  async setPublic(id: number, isPublic: boolean) {
    const existing = await this.findWorkByIdOrThrow(id)

    if (existing.status !== WorkStatusEnum.Published) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    const updated = await this.workModel
      .findOneAndUpdate(
        { id, status: WorkStatusEnum.Published },
        { $set: { isPublic } },
        { new: true },
      )
      .populate({ path: 'user', select: 'username nickName picture' })
      .lean()

    if (!updated) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    return updated
  }

  /**
   * 首页公开模版列表
   *
   * 过滤条件（服务端固定，不接受外部覆盖）：
   * - status = Published
   * - isPublic = true
   * - isTemplate = true
   *
   * - title 支持模糊搜索（DTO 已做正则字面量转义）
   * - 排序字段限定为 copiedCount / latestPublishAt / createdAt，默认 copiedCount desc
   * - populate user 拿 username / nickName / picture 用于卡片作者展示
   */
  async getPublicWorkList(query: PublicListQueryDto) {
    const filter: Record<string, any> = {
      status: WorkStatusEnum.Published,
      isPublic: true,
      isTemplate: true,
    }

    if (query.safeTitle) {
      filter.title = { $regex: query.safeTitle, $options: 'i' }
    }

    this.logger.debug(filter)
    const [list, total] = await Promise.all([
      this.workModel
        .find(filter)
        .select(publicListProjection.join(' '))
        .populate({ path: 'user', select: 'username nickName picture' })
        .sort(query.sort)
        .skip(query.skip)
        .limit(query.limit)
        .lean(),
      this.workModel.countDocuments(filter),
    ])
    return { list, total }
  }

  /**
   * 复制作品到当前用户名下
   *
   * 权限：调用方已通过 WorkPolicyGuard + WorkAction.Read 校验
   * - 作者本人 OR isPublic=true 才能进到这里
   *
   * 业务约束：
   * - 源作品必须是 Published（防止复制别人未发布的草稿；自己的草稿也没有"复制"语义）
   * - 副本字段策略：
   *   - 沿用：title（追加"-副本"）、desc、coverImg、content
   *   - 重置：status=Initial、isTemplate=false、isPublic=false、isHot=false、copiedCount=0、channels=[]、uuid 重新生成、user/author 为当前用户
   * - copiedCount 累计策略：仅"非作者复制"才在源 work 上 $inc 1（避免作者自己刷数据）
   *
   * 一致性：
   * - 单机 MongoDB 不支持事务，采用"先创建副本成功后再 $inc 源 work"的弱一致性
   * - $inc 失败仅记日志，不影响副本创建结果（业务上 copiedCount 偶尔少 1 可接受）
   */
  async copyWork(id: number, userPayload: UserPayload) {
    const source = await this.findWorkByIdOrThrow(id)

    if (source.status !== WorkStatusEnum.Published) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    const userObjectId = this.getUserObjectId(userPayload)
    const sourceOwnerId = String((source as any).user?._id ?? (source as any).user ?? '')
    const isOwner = sourceOwnerId === userPayload._id

    // 副本标题：源标题为空时回落到"未命名作品"，避免出现"-副本"这种孤儿后缀
    const baseTitle = source.title?.trim() || '未命名作品'

    const copied = await this.workModel.create({
      title: `${baseTitle}-副本`,
      desc: source.desc ?? '',
      coverImg: source.coverImg,
      content: source.content,
      uuid: nanoid(8),
      user: userObjectId,
      author: userPayload.username,
      status: WorkStatusEnum.Initial,
      isTemplate: false,
      isPublic: false,
      isHot: false,
      copiedCount: 0,
      channels: [],
    })

    if (!isOwner) {
      // 弱一致性：失败仅记日志，不抛出，避免副本已建好却返回错误
      this.workModel
        .updateOne({ id }, { $inc: { copiedCount: 1 } })
        .catch((err: unknown) => {
          this.logger.warn(`copyWork: inc copiedCount failed for work id=${id}: ${String(err)}`)
        })
    }

    // populate 后返回，与 detail 结构对齐，方便前端直接 applyDetail 或跳编辑器
    const populated = await this.workModel
      .findOne({ id: copied.id })
      .populate({ path: 'user', select: 'username nickName picture' })
      .lean()

    // 理论上不可能为 null（刚 create 出来），兜底保留 copied
    return populated ?? copied
  }

  /**
   * 软删除：status=Deleted，返回 { success: true }
   */
  async softDelete(id: number) {
    // 保持既有行为：不存在/已软删除时抛 workNotExistError
    await this.findWorkByIdOrThrow(id)

    await this.workModel.updateOne(
      { id, status: { $ne: WorkStatusEnum.Deleted } },
      { $set: { status: WorkStatusEnum.Deleted } },
    )

    return { success: true }
  }
}
