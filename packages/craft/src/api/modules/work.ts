import type { ServiceConfig } from '@/api/http'
import type { ComponentData, PageProps } from '@/types/editor.ts'
import { http, httpTry } from '@/api/http'

/**
 * 作品状态枚举（与 craft-backend WorkStatusEnum 对齐）
 */
export enum WorkStatusEnum {
  Deleted = 0, // 已删除（软删除）
  Initial = 1, // 未发布
  Published = 2, // 已发布
  Declined = 3, // 强制下线
}

/**
 * work 模块业务错误码（与 craft-backend work.error.ts 的 errno 一一对齐）
 * - 业务侧统一用常量判断错误分支，避免散落裸数字
 */
export const WORK_ERROR_CODE = {
  /** 输入信息验证失败 */
  VALIDATE_FAIL: 102001,
  /** 没有权限完成操作 */
  NO_PERMISSION: 102002,
  /** 该作品未公开，不能进行操作 */
  NO_PUBLIC: 102003,
  /** 渠道输入信息验证失败 */
  CHANNEL_VALIDATE_FAIL: 102004,
  /** 渠道操作失败 */
  CHANNEL_OPERATE_FAIL: 102005,
  /** 作品不存在 */
  NOT_EXIST: 102006,
  /** 作品状态不允许该操作 */
  STATUS_TRANSFER_FAIL: 102007,
  /** 该作品已发布为模版，不能重复发布 */
  ALREADY_TEMPLATE: 102008,
  /** 渠道名称已存在 */
  CHANNEL_DUPLICATE: 102009,
} as const

/**
 * 作品内容（content 子文档）
 * - 后端 content 是开放的 Record<string, any>，前端单方面收窄为固定 schema
 * - components：画布上的元素数组
 * - props：页面级样式（背景色、背景图、高度等）
 */
export interface WorkContent {
  components: ComponentData[]
  props: PageProps
}

/**
 * 作品详情中的作者公开信息（与后端 WorkDetailUserDto 对齐）
 */
export interface WorkDetailUserDto {
  username: string
  nickName?: string
  picture?: string
}

/**
 * 渠道（与后端 WorkChannel 对齐）
 */
export interface WorkChannel {
  id: string
  name: string
}

/**
 * 作品详情（与后端 WorkDetailDto 对齐）
 */
export interface WorkDetailDto {
  id: number
  uuid: string
  title: string
  desc: string
  coverImg?: string
  content?: WorkContent
  status: WorkStatusEnum
  channels?: WorkChannel[]
  author: string
  copiedCount: number
  isTemplate?: boolean
  isPublic?: boolean
  isHot?: boolean
  latestPublishAt?: string
  createdAt?: string
  updatedAt?: string
  user?: WorkDetailUserDto | null
}

/**
 * 我的作品列表单项（与后端 WorkListItemDto 对齐，不含 user / content）
 */
export interface WorkListItemDto {
  id: number
  author: string
  copiedCount: number
  coverImg: string
  desc: string
  title: string
  isHot: boolean
  status: WorkStatusEnum
  isTemplate: boolean
  latestPublishAt: string
  createdAt: string
  updatedAt: string
}

/**
 * 我的作品列表响应结构（{ list, total }）
 */
export interface WorkListResponse {
  list: WorkListItemDto[]
  total: number
}

/**
 * 我的作品列表 query（与后端 MyListQueryDto 对齐）
 */
export interface MyListQuery {
  page?: number
  pageSize?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'latestPublishAt' | 'copiedCount'
  sortOrder?: 'asc' | 'desc'
  title?: string
  isTemplate?: boolean
  status?: WorkStatusEnum
}

/**
 * 创建作品请求体（与后端 CreateDto 对齐）
 * - title / content 必填
 */
export interface CreateWorkReq {
  title: string
  content: WorkContent
  desc?: string
  coverImg?: string
  isTemplate?: boolean
  isPublic?: boolean
  isHot?: boolean
}

/**
 * 编辑作品请求体（与后端 WorkUpdateDto 对齐）
 * - 仅 id 必填，其余字段可选（后端做 partial 更新，未传字段不变）
 */
export interface WorkUpdateReq {
  id: number
  title?: string
  desc?: string
  coverImg?: string
  content?: WorkContent
}

/**
 * 创建渠道请求体（id 为 work id）
 */
export interface CreateChannelReq {
  id: number
  name: string
}

/**
 * 编辑渠道名称请求体（id 为 work id）
 */
export interface ChannelUpdateReq {
  id: number
  channelId: string
  name: string
}

/**
 * 删除渠道请求体（id 为 work id）
 */
export interface ChannelDeleteReq {
  id: number
  channelId: string
}

/**
 * 创建作品（未发布，初始 status=Initial）
 */
export const createWork = (body: CreateWorkReq, config?: ServiceConfig<CreateWorkReq>) =>
  httpTry(http.post<WorkDetailDto, CreateWorkReq>('/v1/work/create', body, config))

/**
 * 查询我的作品列表（支持分页 / 排序 / title 模糊搜索 / 模版过滤 / 状态过滤）
 */
export const getMyWorkList = (query?: MyListQuery, config?: ServiceConfig) =>
  httpTry(http.get<WorkListResponse>('/v1/work/myList', { ...config, params: query }))

/**
 * 查询作品详情（id 通过 query string 传递）
 */
export const getWorkDetail = (id: number, config?: ServiceConfig) =>
  httpTry(http.get<WorkDetailDto>('/v1/work/detail', { ...config, params: { id } }))

/**
 * 编辑我的作品（partial：未传字段不更新）
 */
export const updateWork = (body: WorkUpdateReq, config?: ServiceConfig<WorkUpdateReq>) =>
  httpTry(http.post<WorkDetailDto, WorkUpdateReq>('/v1/work/update', body, config))

/**
 * 发布作品（状态流转：Initial -> Published）
 */
export const publishWork = (id: number, config?: ServiceConfig<{ id: number }>) =>
  httpTry(http.post<WorkDetailDto, { id: number }>('/v1/work/publish', { id }, config))

/**
 * 发布作品为模版（要求当前已是 Published，且不可重复发布）
 */
export const publishTemplate = (id: number, config?: ServiceConfig<{ id: number }>) =>
  httpTry(http.post<WorkDetailDto, { id: number }>('/v1/work/publishTemplate', { id }, config))

/**
 * 删除作品（软删除，返回 { success: true }）
 */
export const deleteWork = (id: number, config?: ServiceConfig<{ id: number }>) =>
  httpTry(http.post<{ success: boolean }, { id: number }>('/v1/work/delete', { id }, config))

/**
 * 创建渠道（渠道名称不可重复）
 */
export const createChannel = (body: CreateChannelReq, config?: ServiceConfig<CreateChannelReq>) =>
  httpTry(http.post<WorkChannel, CreateChannelReq>('/v1/work/channel/create', body, config))

/**
 * 修改渠道名称（渠道名称不可重复）
 */
export const updateChannelName = (body: ChannelUpdateReq, config?: ServiceConfig<ChannelUpdateReq>) =>
  httpTry(http.post<WorkChannel, ChannelUpdateReq>('/v1/work/channel/update', body, config))

/**
 * 删除渠道（至少保留一个渠道，后端校验）
 */
export const deleteChannel = (body: ChannelDeleteReq, config?: ServiceConfig<ChannelDeleteReq>) =>
  httpTry(http.post<{ success: boolean }, ChannelDeleteReq>('/v1/work/channel/delete', body, config))
