<template>
  <div class="homepage-container">
    <Layout :style="{ background: '#fff' }">
      <LayoutHeader class="header">
        <div class="page-title">
          <router-link to="/login">
            i分享
          </router-link>
        </div>
      </LayoutHeader>
      <LayoutContent class="home-layout">
        <div>
          <Avatar v-if="sessionStore.userInfo.picture" :src="sessionStore.userInfo.picture" />
          <Avatar v-else>
            <UserOutlined />
          </Avatar>
          <span>{{ sessionStore.userInfo.nickName }}</span>
        </div>
        <Button type="primary" :disabled="sessionStore.isLogin" @click="handleGithubLogin">
          <GithubOutlined />
          {{ sessionStore.isLogin ? '已登录' : '登录' }}
        </Button>
      </LayoutContent>
    </Layout>
    <LayoutFooter @click="getMe">
      footer
    </LayoutFooter>
    <pre>{{ sessionStore.userInfo }}</pre>
    <p @click="sessionStore.logout">退出登录</p>
  </div>
</template>

<script setup lang="ts">
import type { UserInfo } from '@/stores/session.js'
import { GithubOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useEventListener } from '@vueuse/core'
import { Avatar, Button, Layout, LayoutContent, LayoutFooter, LayoutHeader } from 'ant-design-vue'
import { getMe } from '@/api/modules/user.ts'
import { useSessionStore } from '@/stores/session.js'

interface GithubLogin {
  payload: {
    accessToken: string
    userInfo: UserInfo
  }
  type: string // oauth.github
}

const sessionStore = useSessionStore()

const BACKEND_ORIGIN = 'http://localhost:3001'
const AUTHORIZE_URL = `${BACKEND_ORIGIN}/api/v1/oauth/github/authorize`

let popup: WindowProxy | null = null
const handleMessage = (event: MessageEvent) => {
  // 为什么要校验 origin：防止任意页面给你 postMessage 注入假 token
  if (event.origin !== BACKEND_ORIGIN) return
  console.log('handleMessage/event: ', event)

  const data = event.data as GithubLogin
  if (!data || data.type !== 'oauth.github') return

  const { accessToken, userInfo } = data.payload
  console.log('handleMessage/accessToken: ', accessToken)
  sessionStore.setUserInfo(userInfo)
  // 后面再开发前端的登录登出
  // localStorage.setItem('access_token', accessToken)
  popup?.close()
}
const handleGithubLogin = () => {
  popup = window.open(AUTHORIZE_URL, '_blank')
  useEventListener(window, 'message', handleMessage)
}
</script>

<style>
.page-title {
  color: #fff;
}
</style>
