import { Exclude, Expose } from 'class-transformer'

/**
 * PublicUserDto：对外暴露的用户信息（用于响应序列化）。
 *
 * 双重保险：
 * - Schema 层：password 默认 select:false（查询不会返回）
 * - DTO 层：即使某些场景下内存中包含 password，也会被 @Exclude() 拦截掉
 */
export class PublicUserDto {
  // @Transform(({ value }) => (value ? String(value) : value))
  @Exclude()
  _id!: string

  @Expose()
  id?: number

  @Expose()
  username!: string

  @Expose()
  email?: string

  @Expose()
  nickName?: string

  @Expose()
  picture?: string

  @Expose()
  phoneNumber?: string

  @Expose()
  type?: string

  @Expose()
  role?: string

  @Expose()
  provider?: string

  @Expose()
  oauthID?: string

  @Expose()
  createdAt?: Date

  @Expose()
  updatedAt?: Date

  @Exclude()
  password?: string
}
