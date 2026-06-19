export default defineNuxtRouteMiddleware(async (to) => {
  // 登录 / 注册页放行
  if (to.path === '/login' || to.path === '/signup') {
    return
  }

  const currentUser = useCurrentUser()

  // 1) 内存里已是登录态 → 直接放行（客户端路由跳转走这里，不调接口）
  // 这一步替代课程里 `token.value && !isLogin` 的快速判断，但不依赖读 cookie
  if (currentUser.value.isLogin) {
    return
  }

  // 2) 没有内存态（首次进入 / 刷新 / 客户端首次跳转）→ 请求接口
  // SSR 首次渲染时 useFetch 不会自动带浏览器 cookie，需手动透传（httpOnly 服务端读得到）
  const headers = useRequestHeaders(['cookie']) // 服务端：{ cookie: 'xxx' } 客户端：{}（自动返回空对象）
  const { data, error } = await useFetch<UserDataProps>('/api/users/current', {
    headers: {
      ...headers, // client时， 也不会覆盖
      accept: 'application/json',
    },
  })

  if (!error.value && data.value) {
    currentUser.value.isLogin = true
    currentUser.value.data = data.value
    return
  }

  // 无 token / token 失效 → 去登录页
  return navigateTo('/login')
})
