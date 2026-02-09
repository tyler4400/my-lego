import { isArray } from '@my-lego/shared'
import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { nanoid } from 'nanoid'
import { BizException } from '@/common/error/biz.exception'
import { Work, WorkChannel, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { ChannelDeleteDto } from '@/module/work/dto/channel-delete.dto'
import { ChannelUpdateDto } from '@/module/work/dto/channel-update.dto'
import { CreateChannelDto } from '@/module/work/dto/create-Channel.dto'
import { WorkService } from '@/module/work/work.service'

@Injectable()
export class WorkChannelService {
  private readonly logger = new Logger(WorkChannelService.name)

  constructor(
    @InjectModel(Work.name) private readonly workModel: Model<WorkDocument>,
    private readonly workService: WorkService,
  ) {}

  private assertNoDuplicateChannelNameOrThrow(work: any, channelName: string) {
    const channels: WorkChannel[] = work?.channels ?? []
    if (isArray(channels) && channels.some(channel => channel.name === channelName)) {
      throw new BizException({ errorKey: 'channelDuplicateFail' })
    }
  }

  async createChannel(dto: CreateChannelDto) {
    const { id, name } = dto
    const existing = await this.workService.findWorkByIdOrThrow(id)
    this.assertNoDuplicateChannelNameOrThrow(existing, name)

    const newChannel = { name, id: nanoid(6) }
    const update = await this.workModel.findOneAndUpdate(
      {
        id,
        status: { $ne: WorkStatusEnum.Deleted },
        $or: [
          { channels: { $exists: false } },
          { channels: { $not: { $elemMatch: { name } } } },
        ],
      },
      { $push: { channels: newChannel } },
      { new: true },
    )

    if (!update) throw new BizException({ errorKey: 'channelOperateFail' })
    return newChannel
  }

  async updateChannelName(dto: ChannelUpdateDto) {
    const { id, name, channelId } = dto

    const existing = await this.workService.findWorkByIdOrThrow(id)
    this.assertNoDuplicateChannelNameOrThrow(existing, name)

    const update = await this.workModel.findOneAndUpdate(
      {
        id,
        'status': { $ne: WorkStatusEnum.Deleted },
        'channels.id': channelId,
        '$or': [
          { channels: { $exists: false } },
          { channels: { $not: { $elemMatch: { name } } } },
        ],
      },
      { $set: { 'channels.$.name': name } },
      { new: true },
    )

    if (!update) throw new BizException({ errorKey: 'channelOperateFail' })
    return { success: true }
  }

  async deleteChannel(dto: ChannelDeleteDto) {
    const { id, channelId } = dto

    // 保持既有行为：不存在/已软删除时抛 workNotExistError
    await this.workService.findWorkByIdOrThrow(id)

    const update = await this.workModel.findOneAndUpdate(
      {
        id,
        'status': { $ne: WorkStatusEnum.Deleted },
        'channels.id': channelId,
      },
      {
        $pull: { channels: { id: channelId } },
      },
      { new: true },
    )

    if (!update) throw new BizException({ errorKey: 'channelOperateFail' })
    return { success: true }
  }
}
