/**
 * JWT 中记录的用户基础信息。
 * 后续接入 Mongo / 用户系统时，可以在此处扩展字段。
 */
export interface UserPayload {
  /**
   * Mongo User 的 _id（统一用 string 表达，避免把 ObjectId 类型泄漏到边界协议中）。
   */
  _id: string
  username: string
}
