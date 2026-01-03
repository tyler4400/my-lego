import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator'

export type SortOrder = 'asc' | 'desc'

export const createPageSortQueryDto = <TSortBy extends string>(
  /**
   * sortBy 白名单（强制），避免用户传任意字段导致慢查询或行为不可控
   * 默认使用allowedSortBy第一条做为defaultSortBy
   */
  allowedSortBy: readonly TSortBy[],
  /**
   * 默认 sortOrder（当请求未传 sortOrder 时使用）
   */
  defaultSortOrder: SortOrder = 'desc',
  /**
   * 默认 pageSize
   */
  defaultPageSize: number = 10,
  /**
   * pageSize 最大值（避免拉爆接口）
   */
  maxPageSize: number = 100,
  /**
   * 默认的 sortBy（当请求未传 sortBy 时使用）
   * 当未指定时 默认使用allowedSortBy第一条
   */
  defaultSortBy?: TSortBy,
) => {
  class PageSortQueryDto {
    @IsOptional()
    @IsInt({ message: 'page 必须是整数' })
    @Min(1, { message: 'page 必须大于等于 1' })
    page: number = 1

    @IsOptional()
    @IsInt({ message: 'pageSize 必须是整数' })
    @Min(1, { message: 'pageSize 必须大于等于 1' })
    @Max(maxPageSize, { message: `pageSize 不能超过 ${maxPageSize}` })
    pageSize: number = defaultPageSize

    @IsOptional()
    @IsIn(allowedSortBy as unknown as any[], {
      message: `sortBy 必须是 ${allowedSortBy.join(', ')} 之一`,
    })
    sortBy: TSortBy = defaultSortBy ?? allowedSortBy[0]

    @IsOptional()
    @IsIn(['asc', 'desc'], { message: 'sortOrder 必须是 asc 或 desc' })
    sortOrder: SortOrder = defaultSortOrder

    /**
     * limit：分页条数（兜底 + maxPageSize 截断）
     */
    get limit() {
      const sizeRaw = Number(this.pageSize)
      const safeSize = Number.isFinite(sizeRaw) && sizeRaw >= 1 ? Math.floor(sizeRaw) : defaultPageSize
      return Math.min(safeSize, maxPageSize)
    }

    /**
     * skip：分页偏移量（兜底 + 使用 limit 结果）
     */
    get skip() {
      const pageRaw = Number(this.page)
      const safePage = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : defaultPageSize
      return (safePage - 1) * this.limit
    }

    /**
     * sort：mongoose sort 对象（1/-1）
     */
    get sort(): Record<string, 1 | -1> {
      const sortValue = this.sortOrder === 'asc' ? 1 : -1
      return { [this.sortBy]: sortValue }
    }
  }

  return PageSortQueryDto
}
