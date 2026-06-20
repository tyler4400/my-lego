<template>
  <header class="border-b border-gray-200 dark:border-b-gray-700 bg-white dark:bg-gray-800">
    <div class="flex items-center justify-between px-6 py-3">
      <!-- 左：Logo / 链接 -->
      <NuxtLink to="/" class="text-lg font-semibold text-gray-800 dark:text-gray-200">
        海豹乐高后台
      </NuxtLink>

      <!-- 右：主题切换 + 头像 / 下拉菜单 -->
      <div class="flex items-center justify-between gap-2">
        <UColorModeSwitch />
        <UDropdownMenu :items="items">
          <UAvatar
            :src="currentUser.data?.picture"
            :alt="currentUser.data?.username"
            icon="i-lucide-user"
            size="md"
            class="cursor-pointer"
          />
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const currentUser = useCurrentUser()

const handleLogout = async () => {
  await $fetch('/api/users/logout', { method: 'POST' })
  currentUser.value.isLogin = false
  currentUser.value.data = null
  navigateTo('/login')
}

// 二维数组 = 分组（组间自动加分割线）
const items = computed<DropdownMenuItem[][]>(() => [
  [{ label: currentUser.value.data?.username ?? '未登录', avatar: { src: currentUser.value.data?.picture, icon: 'i-lucide-user' } }],
  [
    { label: '编辑个人资料', icon: 'i-lucide-pencil', to: '/profile' },
    { label: '退出登录', icon: 'i-lucide-log-out', onSelect: handleLogout },
  ],
])
</script>
