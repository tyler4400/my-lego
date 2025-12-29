import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

export type UserRole = 'admin' | 'normal'

export interface UserInfo {
  id: number
  username: string // unique
  nickName: string
  email: string
  picture: string // avatarUrl
  phoneNumber: string
  role: UserRole
}

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = reactive<UserInfo>({
    username: '',
    nickName: '游客',
    picture: '',
    role: 'normal',
  } as UserInfo)

  const isLogin = computed(() => !!userInfo.username)

  const setUserInfo = (newUserInfo: Partial<UserInfo>) => {
    Object.assign(userInfo, newUserInfo)
  }

  return {
    isLogin,
    userInfo,
    setUserInfo,
  }
})
