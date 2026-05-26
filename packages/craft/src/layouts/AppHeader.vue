<template>
  <header class="app-header">
    <!-- 左段 -->
    <AppBrand />

    <!-- 中段：未登录时为空（视觉上 brand 与右段之间留白） -->
    <nav class="app-header__nav">
      <template v-if="sessionStore.isLogin">
        <Button type="primary" class="app-header__cta" @click="handleCreate">
          <PlusOutlined />
          创建海报
        </Button>
        <Button class="app-header__cta" @click="handleWork">
          <FolderOutlined />
          我的作品
        </Button>
      </template>
    </nav>

    <!-- 右段 -->
    <div class="app-header__right">
      <UserMenu v-if="sessionStore.isLogin" />
      <Button v-else type="primary" @click="handleLogin">
        去登录
      </Button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { FolderOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { Button } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '@/stores/session'
import AppBrand from './AppBrand.vue'
import UserMenu from './UserMenu.vue'

const sessionStore = useSessionStore()

const router = useRouter()
const handleCreate = () => router.push('/editor')
const handleWork = () => router.push('/works')
const handleLogin = () => router.push('/login')
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 24px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.1);
  height: 64px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.app-header__nav {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: end;
  gap: 16px;
}

.app-header__right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
</style>
