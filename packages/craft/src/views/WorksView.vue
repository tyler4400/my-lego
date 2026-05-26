<template>
  <div class="works-view">
    <Empty description="我的作品功能建设中">
      <Button type="primary" @click="handleGoEditor">
        <PlusOutlined />
        去创建一个
      </Button>
    </Empty>
  </div>
</template>

<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue'
import { Button, Empty } from 'ant-design-vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const handleGoEditor = () => router.push('/editor')
</script>

<style scoped>
.works-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
}
</style>
