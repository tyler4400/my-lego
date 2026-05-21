<template>
  <Result
    status="404"
    title="404"
    subTitle="抱歉，您访问的页面不存在或已被移除。"
    class="not-found-result"
  >
    <template #extra>
      <Space :size="12">
        <!-- 主按钮：蓝色（ant-design-vue 默认 primary，与项目主色一致） -->
        <Button type="primary" @click="handleGoHome">
          回到首页
        </Button>
        <!-- 次按钮：默认样式，仅作辅助选择 -->
        <Button @click="handleGoBack">
          返回上一页
        </Button>
      </Space>
    </template>
  </Result>
</template>

<script setup lang="ts">
import { Button, Result, Space } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// 跳首页：用 replace 避免「后退又回到 404」
const handleGoHome = () => {
  router.replace('/')
}

// 返回上一页：如果没有历史记录则兜底跳首页
const handleGoBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/')
}
</script>

<style scoped>
.not-found-result {
  background: #fff;
  padding: 64px 48px;
  border-radius: 16px;
  animation: fade-up 0.4s ease-out;
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
