<template>
  <div class="settings-view">
    <Empty description="个人设置功能建设中">
      <Button type="primary" @click="handleBackHome">
        回到首页
      </Button>
    </Empty>
  </div>
</template>

<script setup lang="ts">
import { Button, Empty } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const handleBackHome = () => router.push('/')
</script>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
}
</style>
