<template>
  <div class="login-view">
    <h1 @click="getMe">
      登录
    </h1>
    <p class="hint">
      登录页占位，等待后续业务实现。
    </p>
    <p v-if="redirect" class="redirect">
      登录成功后将跳转回：<code>{{ redirect }}</code>
    </p>
    <h3>用户{{ userStore.isLogin ? '已登录' : '未登录' }}</h3>
    <pre>
      {{ userStore.userInfo }}
    </pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getMe } from '@/api/modules/user.ts'
import { useUserInfoStore } from '@/stores/userInfo.ts'

const route = useRoute()
const redirect = computed(() => {
  const value = route.query.redirect
  return typeof value === 'string' ? value : ''
})

const userStore = useUserInfoStore()
</script>

<style scoped>
.login-view {
  padding: 24px;
}
.hint {
  margin-top: 12px;
  color: rgba(0, 0, 0, 0.45);
}
.redirect {
  margin-top: 8px;
  color: rgba(0, 0, 0, 0.65);
}
</style>
