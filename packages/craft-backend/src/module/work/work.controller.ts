import type { Request, Response } from 'express'
import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { MetaRes } from '@/common/meta/meta.decorator'
import { Serialize } from '@/decorator/Serialize.decorator'
import { JwtAuthGuard } from '@/module/auth/guard/jwt-auth.guard'
import { WorkAction } from '@/module/work/casl/work-ability.types'
import { WorkPolicy } from '@/module/work/casl/work-policy.decorator'
import { WorkPolicyGuard } from '@/module/work/casl/work-policy.guard'
import { ChannelDeleteDto } from '@/module/work/dto/channel-delete.dto'
import { ChannelUpdateDto } from '@/module/work/dto/channel-update.dto'
import { CreateChannelDto } from '@/module/work/dto/create-Channel.dto'
import { CreateDto } from '@/module/work/dto/create-dto'
import { MyListQueryDto } from '@/module/work/dto/my-list-query.dto'
import { WorkDetailDto } from '@/module/work/dto/work-detail.dto'
import { WorkIdDto } from '@/module/work/dto/work-id.dto'
import { WorkListResponseDto } from '@/module/work/dto/work-list-response.dto'
import { WorkUpdateDto } from '@/module/work/dto/work-update.dto'
import { WorkService } from '@/module/work/work.service'
import { WorkChannelService } from '@/module/work/workChannel.service'
import { WorkToH5Service } from '@/module/work/workToH5.service'

@Controller('work')
export class WorkController {
  constructor(
    private readonly workService: WorkService,
    private readonly workToH5Service: WorkToH5Service,
    private readonly workChannelService: WorkChannelService,

  ) {}

  /**
   * 创建作品（未发布）
   * - 必须登录
   * - 初始状态 status=Initial（由 schema default）
   */
  @Post('create')
  @MetaRes({ message: '创建作品成功' })
  @UseGuards(JwtAuthGuard)
  async createWork(@Req() req: Request, @Body() dto: CreateDto) {
    return this.workService.createWork(dto, req.user!)
  }

  /**
   * 查询我的作品列表
   * - 必须登录
   * - 仅查询当前用户下的作品
   * - 支持：分页 / 排序 / title 模糊搜索 / 是否只查模版 / 状态
   * - 默认：pageSize=10，按 createdAt 倒序
   */
  @Get('myList')
  @UseGuards(JwtAuthGuard)
  @MetaRes({ message: '获取作品列表成功' })
  @Serialize(WorkListResponseDto)
  async myList(@Req() req: Request, @Query() dto: MyListQueryDto) {
    return this.workService.getMyWorkList(dto, req.user!)
  }

  /**
   * 查询作品详情
   * - 必须登录
   * - 排除已删除（status=Deleted）
   * - 若不是作者本人：必须 isPublic=true
   * - 返回：work 字段 + user(username/nickName/picture) + content/status/channels/uuid
   */
  @Get('detail')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.Read, 'query', 'id', 'workNoPublicFail')
  @MetaRes({ message: '获取作品详情成功' })
  @Serialize(WorkDetailDto)
  async detail(@Query() dto: WorkIdDto) {
    return this.workService.getWorkDetail(dto.id)
  }

  /**
   * 编辑我的作品
   * - 必须登录
   * - 必须作者本人
   * - 可编辑字段：coverImg/desc/title/content
   * - 已发布作品允许继续编辑
   */
  @Post('update')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.Update)
  @MetaRes({ message: '编辑作品成功' })
  @Serialize(WorkDetailDto)
  async update(@Body() dto: WorkUpdateDto) {
    return this.workService.updateMyWork(dto)
  }

  /**
   * 发布我的作品
   * - 必须登录
   * - 必须作者本人
   * - 状态流转：仅允许 Initial -> Published
   * - 设置 latestPublishAt=now
   * - 不允许重复发布或非法流转
   */
  @Post('publish')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.Publish)
  @MetaRes({ message: '发布成功' })
  @Serialize(WorkDetailDto)
  async publishWork(@Body() dto: WorkIdDto) {
    return this.workService.publishMyWork(dto.id)
  }

  /**
   * 发布作品为模版
   * - 必须登录
   * - 必须作者本人
   * - 不可重复发布模版
   * - 同时置 isTemplate=true 且 isPublic=true
   * - 模版要求 status 必须是 Published
   */
  @Post('publishTemplate')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.PublishTemplate)
  @MetaRes({ message: '发布为模版成功' })
  @Serialize(WorkDetailDto)
  async publishTemplate(@Body() dto: WorkIdDto) {
    return this.workService.publishTemplate(dto.id)
  }

  /**
   * 删除作品（软删除）
   * - 必须登录
   * - 必须作者本人
   * - 设置 status=Deleted
   * - 返回 { success: true }
   */
  @Post('delete')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.Delete)
  @MetaRes({ message: '删除作品成功' })
  async delete(@Body() dto: WorkIdDto) {
    return this.workService.softDelete(dto.id)
  }

  /**
   * 创建渠道
   * - 必须登录
   * - 必须作者本人
   * - 渠道名称不能重复
   * - 传参为work的id，和渠道name，返回的是渠道id和name
   */
  @Post('channel/create')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.ManageChannels)
  @MetaRes({ message: '创建渠道成功' })
  async createChannel(@Body() dto: CreateChannelDto) {
    return this.workChannelService.createChannel(dto)
  }

  /**
   * 获取某个作品的渠道列表 （已弃用， 直接使用获取作品详情接口）
   * - 必须登录
   * - 若不是作者本人：必须 isPublic=true
   */
  // @Get('channel/list')
  // @UseGuards(JwtAuthGuard)
  // @MetaRes({ message: '创建渠道成功' })
  // async getChannelList(@Query('workId', ParseIntPipe) workId: number, @Req() req: Request) {
  //   return this.workChannelService.getChannelList(workId, req.user!)
  // }

  /**
   * 修改渠道名称
   * - 必须登录
   * - 必须作者本人
   * - 渠道名称不能重复
   */
  @Post('channel/update')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.ManageChannels)
  @MetaRes({ message: '更新渠道成功' })
  async updateChannelName(@Body() dto: ChannelUpdateDto) {
    return this.workChannelService.updateChannelName(dto)
  }

  /**
   * 删除渠道
   * - 必须登录
   * - 必须作者本人
   */
  @Post('channel/delete')
  @UseGuards(JwtAuthGuard, WorkPolicyGuard)
  @WorkPolicy(WorkAction.ManageChannels)
  @MetaRes({ message: '删除渠道成功' })
  async deleteChannel(@Body() dto: ChannelDeleteDto) {
    return this.workChannelService.deleteChannel(dto)
  }

  /**
   * 在移动端渲染成品
   * - 作品状态必须是已发布
   */
  @Get('pages/:id/:uuid')
  async renderH5Page(
    // 虽然全局 ValidationPipe 开启了 transform: true + enableImplicitConversion: true 有了自动隐式类型转换
    // 但这种“隐式转换”不等价于强校验：比如 id=abc 可能会被转成 NaN 然后继续往下跑
    @Param('id', ParseIntPipe) id: number,
    @Param('uuid') uuid: string,
    @Res() res: Response,
  ) {
    const pageData = await this.workToH5Service.getPageData(id, uuid)
    res.render('h5page', pageData)
  }
}
