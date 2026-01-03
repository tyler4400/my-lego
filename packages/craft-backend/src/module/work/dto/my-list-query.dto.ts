import { escapeRegExp } from '@my-lego/shared'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { allWorkStatus, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { createPageSortQueryDto } from '@/dto/page-sort-query.dto'

export const WORK_MY_LIST_SORT_BY = ['createdAt', 'updatedAt', 'latestPublishAt', 'copiedCount'] as const

/**
 * 我的作品列表 query DTO
 * - page/pageSize/sortBy/sortOrder：来自可复用基类（含默认值 + skip/limit/sort getter）
 * - title/isTemplate：模块自定义过滤条件
 */
export class MyListQueryDto extends createPageSortQueryDto(WORK_MY_LIST_SORT_BY) {
  @IsOptional()
  @IsString({ message: 'title 必须是字符串' })
  @MaxLength(50, { message: 'title 长度不能超过 50' })
  title?: string

  /**
   * 是否只查询模版
   * - 不传：不过滤
   * - true：只查模版
   * - false：只查非模版
   */
  @IsOptional()
  @IsBoolean({ message: 'isTemplate 必须是 boolean' })
  isTemplate?: boolean

  @IsOptional()
  @IsIn(allWorkStatus, { message: `status 必须是 ${allWorkStatus.join(', ')} 之一` })
  status?: WorkStatusEnum

  /**
   * safeTitle 模糊搜索关键词（安全的正则字面量）
   */
  get safeTitle() {
    return this.title ? escapeRegExp(this.title) : undefined
  }
}
