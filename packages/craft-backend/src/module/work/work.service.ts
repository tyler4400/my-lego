import type { UserPayload } from '@/types/type'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { nanoid } from 'nanoid'
import { BizException } from '@/common/error/biz.exception'
import { Work, WorkDocument } from '@/database/mongo/schema/work.schema'

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
  constructor(@InjectModel(Work.name) private readonly workModel: Model<WorkDocument>) {}

  async createWork(work: CreateWorkInput, userPayload: UserPayload) {
    // 显式写入：把 JWT 中的 _id string 转成 mongoose ObjectId
    if (!Types.ObjectId.isValid(userPayload._id)) {
      // token payload 非法：统一按登录失效处理（由 BizExceptionFilter/MetaResponse 包装）
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }

    const userObjectId = new Types.ObjectId(userPayload._id)

    return this.workModel.create({
      ...work,
      uuid: nanoid(8), // 生成短uuid，给h5使用
      user: userObjectId,
      author: userPayload.username,
    })
  }
}
