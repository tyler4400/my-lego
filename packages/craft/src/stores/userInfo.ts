import { defineStore } from 'pinia'
import { computed, reactive, readonly } from 'vue'

export type UserRole = 'admin' | 'normal'

export interface UserInfo {
  id: string
  username: string // unique
  nickName: string
  email: string
  picture: string // avatarUrl
  phoneNumber: string
  role: UserRole
}

// 抽出初始值工厂函数，便于复用
const getInitialUserInfo = (): UserInfo => ({
  id: '',
  username: '',
  nickName: '游客',
  email: '',
  picture: '',
  phoneNumber: '',
  role: 'normal',
})

export const useUserInfoStore = defineStore('userInfo', () => {
  const userInfo = reactive<UserInfo>(getInitialUserInfo())

  const isLogin = computed(() => !!userInfo.username)

  const setUserInfo = (newUserInfo: Partial<UserInfo>) => {
    Object.assign(userInfo, newUserInfo)
  }

  const clearUserInfo = () => {
    Object.assign(userInfo, getInitialUserInfo())
  }

  return {
    isLogin,
    userInfo: readonly(userInfo),
    setUserInfo,
    clearUserInfo,
  }
})
