export interface PagedData<T> {
  total: number
  list: T[]
  currentPage: number
  pageSize: number
  order?: 'asc' | 'desc'
  orderBy?: string
}
