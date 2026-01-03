import type { UserPayload } from '@/types/type'
import { isBoolean, isUndefined } from '@my-lego/shared'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { nanoid } from 'nanoid'
import { BizException } from '@/common/error/biz.exception'
import { allWorkStatus, Work, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { MyListQueryDto } from '@/module/work/dto/my-list-query.dto'
import { projection } from '@/module/work/dto/work-list-item.dto'
import { WorkUpdateDto } from '@/module/work/dto/work-update.dto'

/**
 * 创建 Work 的入参类型。
 *
 * 说明：
 * - title/content 在 CreateDto 中是必填，这里也设为必填
 * - 其他字段允许缺省，交给 mongoose default 或业务自行填充
 */
type CreateWorkInput
  = Required<Pick<Work, 'title'>>
    & { content: NonNullable<Work['content']> }
    & Partial<Pick<Work, 'desc' | 'coverImg' | 'isTemplate' | 'isPublic' | 'isHot'>>

@Injectable()
export class WorkService {
  private readonly logger = new Logger(WorkService.name)

  constructor(@InjectModel(Work.name) private readonly workModel: Model<WorkDocument>) {}

  /**
   * 把 JWT 中的 _id string 转成 mongoose ObjectId，并做合法性校验。
   */
  private getUserObjectId(userPayload: UserPayload) {
    if (!Types.ObjectId.isValid(userPayload._id)) {
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }
    return new Types.ObjectId(userPayload._id)
  }

  /**
   * 统一“作品不存在”（排除软删除）
   */
  private async findWorkByIdOrThrow(id: number) {
    const work = await this.workModel.findOne({ id, status: { $ne: WorkStatusEnum.Deleted } }).lean()
    if (!work) {
      throw new BizException({ errorKey: 'workNotExistError' })
    }
    return work
  }

  /**
   * 校验作者权限（必须作者本人）
   */
  private assertIsAuthorOrThrow(work: any, userObjectId: Types.ObjectId) {
    const ownerId = work?.user ? String(work.user) : ''
    if (ownerId !== String(userObjectId)) {
      throw new BizException({ errorKey: 'workNoPermissonFail' })
    }
  }

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

  async getWorkDetail(id: number, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)

    const work = await this.workModel
      .findOne({ id, status: { $ne: WorkStatusEnum.Deleted } })
      .populate({ path: 'user', select: 'username nickName picture' }) // Select必有_id
      .lean()

    this.logger.debug(work)
    if (!work) throw new BizException(({ errorKey: 'workNotExistError' }))

    const isAuthor = String(work.user?._id ?? work.user) === String(userObjectId)
    if (!isAuthor) {
      if (!work.isPublic) throw new BizException(({ errorKey: 'workNoPublicFail' }))
    }

    return work
  }

  async updateMyWork(dto: WorkUpdateDto, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)

    const existing = await this.findWorkByIdOrThrow(dto.id)
    this.assertIsAuthorOrThrow(existing, userObjectId)

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
  async publishMyWork(id: number, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)

    const existing = await this.findWorkByIdOrThrow(id)
    this.assertIsAuthorOrThrow(existing, userObjectId)

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
   * 发布为模版：要求 status 已是 Published；不可重复；同时 isTemplate/isPublic 置 true
   */
  async publishTemplate(id: number, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)

    const existing = await this.findWorkByIdOrThrow(id)
    this.assertIsAuthorOrThrow(existing, userObjectId)

    if (existing.status !== WorkStatusEnum.Published) {
      throw new BizException({ errorKey: 'workStatusTransferFail' })
    }

    if (existing.isTemplate === true) {
      throw new BizException({ errorKey: 'workAlreadyTemplateFail' })
    }

    const updated = await this.workModel
      .findOneAndUpdate(
        { id, isTemplate: { $ne: true }, status: WorkStatusEnum.Published },
        { $set: { isTemplate: true, isPublic: true } },
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
   * 软删除：status=Deleted，返回 { success: true }
   */
  async softDelete(id: number, userPayload: UserPayload) {
    const userObjectId = this.getUserObjectId(userPayload)

    const existing = await this.findWorkByIdOrThrow(id)
    this.assertIsAuthorOrThrow(existing, userObjectId)

    await this.workModel.updateOne(
      { id, status: { $ne: WorkStatusEnum.Deleted } },
      { $set: { status: WorkStatusEnum.Deleted } },
    )

    return { success: true }
  }
}
