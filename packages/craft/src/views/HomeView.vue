<template>
  <div class="homepage-container">
    <Layout :style="{ background: '#fff' }">
      <LayoutHeader class="header">
        <div class="page-title">
          <router-link to="/editor">
            i分享
          </router-link>
        </div>
      </LayoutHeader>
      <LayoutContent class="home-layout">
        <div @click="() => getMe()">
          <Avatar v-if="sessionStore.userInfo.picture" :src="sessionStore.userInfo.picture" />
          <Avatar v-else>
            <UserOutlined />
          </Avatar>
          <span>{{ sessionStore.userInfo.nickName }}</span>
        </div>
        <Button type="primary" :disabled="sessionStore.isLogin" @click="() => notifyUnauthorized('未登录')">
          <GithubOutlined />
          {{ sessionStore.isLogin ? '已登录' : '去登录' }}
        </Button>
      </LayoutContent>
    </Layout>
    <LayoutFooter>
      footer
    </LayoutFooter>
    <pre>{{ sessionStore.userInfo }}</pre>
    <span @click="sessionStore.logout">
      退出登录
    </span>
  </div>
</template>

<script setup lang="ts">
import { GithubOutlined, UserOutlined } from '@ant-design/icons-vue'
import { Avatar, Button, Layout, LayoutContent, LayoutFooter, LayoutHeader } from 'ant-design-vue'
import { getMe } from '@/api/modules/user'
import { useSessionStore } from '@/stores/session'
import { notifyUnauthorized } from '@/utils/biz/notifyUnauthorized'

const sessionStore = useSessionStore()
</script>

<style>
.page-title {
  color: #fff;
}
</style>
