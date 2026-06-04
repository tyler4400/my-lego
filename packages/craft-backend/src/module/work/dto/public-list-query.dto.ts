import { escapeRegExp } from '@my-lego/shared'
import { IsOptional, IsString, MaxLength } from 'class-validator'
import { createPageSortQueryDto } from '@/dto/page-sort-query.dto'

/**
 * 公开模版列表允许的排序字段
 * - copiedCount：最热（首页默认）
 * - latestPublishAt：最新发布
 * - createdAt：兜底（一般用不到，保留方便排查）
 */
export const WORK_PUBLIC_LIST_SORT_BY = ['copiedCount', 'latestPublishAt', 'createdAt'] as const

/**
 * 首页公开模版列表 query DTO
 * - 不暴露 status / isTemplate / isPublic：这些都是服务端固定过滤条件（已发布 + 公开 + 模版）
 * - 仅支持 title 模糊搜索
 * - 默认按 copiedCount 倒序（最热在前），与首页"热门海报"语义对齐
 */
export class PublicListQueryDto extends createPageSortQueryDto(WORK_PUBLIC_LIST_SORT_BY) {
  @IsOptional()
  @IsString({ message: 'title 必须是字符串' })
  @MaxLength(50, { message: 'title 长度不能超过 50' })
  title?: string

  /**
   * safeTitle：把用户输入做正则字面量转义后再用于 $regex，避免 ReDoS / 误匹配
   * - 与 MyListQueryDto.safeTitle 同款实现
   */
  get safeTitle() {
    return this.title ? escapeRegExp(this.title) : undefined
  }
}
