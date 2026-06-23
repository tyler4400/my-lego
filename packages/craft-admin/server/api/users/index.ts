import type { SortOrder } from 'mongoose'

interface Query {
  currentPage: string
  pageSize: string
  orderBy: string
  order: string
  keyword: string
}

export default defineAuthResponseHandler(async (event) => {
  const query = getQuery<Query>(event)
  // query 里取出来都是 string，转成 number
  const currentPage = Number(query.currentPage ?? 1)
  const pageSize = Number(query.pageSize ?? 10)

  const orderBy = (query.orderBy as string) ?? 'createdAt'
  const order = (query.order as string) ?? 'desc'

  const skip = (currentPage - 1) * pageSize
  // MongoDB sort：{ 字段: 'asc' | 'desc' }
  const sort = { [orderBy]: order as SortOrder }

  const keyword = (query.keyword as string) ?? ''
  const findCondition = keyword ? { username: { $regex: keyword } } : {}

  const users = await UserSchema
    .find(findCondition)
    .skip(skip)
    .limit(pageSize)
    .sort(sort)
    .select('username nickName type role createdAt updatedAt') // lean() 默认含 _id
    .lean()

  const total = await UserSchema.countDocuments(findCondition)
  return { list: users, total, currentPage, pageSize, orderBy, order }
})
