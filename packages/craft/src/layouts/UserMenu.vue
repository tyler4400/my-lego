<template>
  <Dropdown placement="bottomRight" :trigger="['click']">
    <div
      class="user-menu__trigger"
      :class="{ 'user-menu__trigger--compact': compact }"
    >
      <Avatar :src="userInfo.picture" :size="32">
        <template #icon>
          <UserOutlined />
        </template>
      </Avatar>
      <template v-if="!compact">
        <span class="user-menu__name">{{ userInfo.nickName }}</span>
        <DownOutlined class="user-menu__arrow" />
      </template>
    </div>

    <template #overlay>
      <div class="user-menu__panel">
        <div class="user-menu__profile">
          <Avatar :src="userInfo.picture" :size="40">
            <template #icon>
              <UserOutlined />
            </template>
          </Avatar>
          <div class="user-menu__profile-info">
            <span class="user-menu__profile-name">{{ userInfo.nickName }}</span>
            <span v-if="userInfo.username" class="user-menu__profile-username">
              {{ userInfo.username }}
            </span>
          </div>
        </div>

        <Menu
          mode="vertical"
          :selectable="false"
          class="user-menu__menu"
          @click="handleMenuClick"
        >
          <MenuItem key="works">
            <FolderOutlined />
            <span class="user-menu__label">我的作品</span>
          </MenuItem>
          <MenuItem key="settings">
            <SettingOutlined />
            <span class="user-menu__label">个人设置</span>
          </MenuItem>
          <MenuDivider />
          <MenuItem key="logout" danger>
            <LogoutOutlined />
            <span class="user-menu__label">退出登录</span>
          </MenuItem>
        </Menu>
      </div>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import type { Key } from 'ant-design-vue/lib/_util/type'
import {
  DownOutlined,
  FolderOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { Avatar, Dropdown, Menu, MenuDivider, MenuItem } from 'ant-design-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const { compact = false } = defineProps<{ compact?: boolean }>()

const router = useRouter()
const sessionStore = useSessionStore()
const userInfo = computed(() => sessionStore.userInfo)

type MenuKey = 'works' | 'settings' | 'logout'

const handleMenuClick = ({ key }: { key: Key }) => {
  switch (key as MenuKey) {
    case 'works':
      router.push('/works')
      return
    case 'settings':
      router.push('/settings')
      return
    case 'logout':
      // logout 只清前端状态，不会触发路由切换；当前页若是 requiresAuth 守卫不会自动触发，必须手动跳转
      sessionStore.logout()
      router.push('/login')
  }
}
</script>

<style scoped>
.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.user-menu__trigger:hover {
  background: #f5f5f5;
}

.user-menu__name {
  max-width: 120px;
  overflow: hidden;
  font-size: 14px;
  color: #1f2937;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu__arrow {
  font-size: 10px;
  color: #9ca3af;
}

.user-menu__panel {
  min-width: 220px;
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
  box-shadow:
      0 6px 16px 0 rgba(0, 0, 0, 0.08),
      0 3px 6px -4px rgba(0, 0, 0, 0.12),
      0 9px 28px 8px rgba(0, 0, 0, 0.05);
}

.user-menu__profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.user-menu__profile-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-menu__profile-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.user-menu__profile-username {
  margin-top: 2px;
  font-size: 12px;
  color: #9ca3af;
}

.user-menu__menu {
  border: none;
  box-shadow: none;
}

.user-menu__label {
  margin-left: 10px;
}
</style>
