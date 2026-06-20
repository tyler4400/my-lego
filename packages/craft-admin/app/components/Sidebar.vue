<template>
  <UNavigationMenu
    orientation="vertical"
    :items="items"
    class="w-full"
  />
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[] = [
  { label: '用户管理', icon: 'i-lucide-users', to: '/users' },
  { label: '海报管理', icon: 'i-lucide-image', to: '/posters' },
  { label: '模板管理', icon: 'i-lucide-layout-template', to: '/templates' },
]
</script>

<style scoped>

</style>
