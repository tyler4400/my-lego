export const useCurrentUser = () => {
  // useState 是 Nuxt 的跨组件、SSR 友好的全局状态
  return useState<UserProps>('currentUser', () => ({
    isLogin: false,
    data: null,
  }))
}
