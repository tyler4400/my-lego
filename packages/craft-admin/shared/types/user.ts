// shared/types 下的类型会被自动导入（app + server 都能直接用）

export interface UserDataProps {
  username: string
  password: string
  email?: string
  nickName?: string
  picture?: string
  phoneNumber?: string
  createdAt: string
  updatedAt: string
  type: 'email' | 'cellphone' | 'oauth'
  role?: 'admin' | 'normal'
}

// 前端登录态结构
export interface UserProps {
  isLogin: boolean
  data: UserDataProps | null
}

export type UserListData = Pick<UserDataProps, 'username' | 'nickName' | 'type' | 'role' | 'createdAt' | 'updatedAt'>
