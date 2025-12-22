/**
 * JWT 中记录的用户基础信息。
 * 后续接入 Mongo / 用户系统时，可以在此处扩展字段。
 */
export interface UserPayload {
  id: number | string
  username: string
}
