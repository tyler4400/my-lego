<template>
  <router-link to="/" class="app-brand">
    <img
      :src="logo"
      alt="海豹乐高"
      class="app-brand__logo"
      :class="{ 'app-brand__logo--compact': compact }"
    >
    <span v-if="!compact" class="app-brand__name">{{ brandName }}</span>
  </router-link>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import logo from '@/assets/logo-chrome-512x512.png'

/** compact: 仅显示 logo，给编辑器 header 这种横向空间紧张的场景用 */
const { compact = false } = defineProps<{ compact?: boolean }>()

const route = useRoute()
const brandName = computed(() => {
  if (compact) return ''
  if (route.name === 'home') return '海豹乐高'
  if (route.meta.title) return `海豹乐高 - ${route.meta.title}`
  return '海豹乐高'
})
</script>

<style scoped>
.app-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  text-decoration: none;
  user-select: none;
}

.app-brand__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}

.app-brand__logo--compact {
  width: 36px;
  height: 36px;
}

.app-brand__name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  white-space: nowrap;
  color: #1f2937;
}
</style>
