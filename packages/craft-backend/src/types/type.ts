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

  /**
   * 用户角色：
   * - 目前只有 admin/normal（见 UserSchema）
   * - 旧 token 可能不带 role，业务侧需把缺省视为 normal
   */
  role?: import('@/database/mongo/schema/user.schema').UserRole
}
