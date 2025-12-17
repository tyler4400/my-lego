<template>
  <Uploader
    class="styled-uploader"
    action="http://123.57.138.48/api/upload/"
    :showUploadList="false"
    :beforeUpload="commonUploadCheck"
    @success="data => handleUploadSuccess(data.resp, data.file)"
    @error="data => handleUploadError(data.err)"
  />
</template>

<script lang="ts" setup>
import type { UploadFile } from '@/components/Uploader'
import type { UploadResponse } from '@/types/upload.ts'
import { message } from 'ant-design-vue'
import { commonUploadCheck } from '@/components/StyleUploader/helper.ts'
import Uploader from '@/components/Uploader'

const emit = defineEmits<{
  (e: 'success', resp: UploadResponse, file: File): void
}>()

const handleUploadSuccess = (resp: UploadResponse, file: UploadFile) => {
  message.success('上传成功')
  emit('success', resp, file.raw)
}

const handleUploadError = (error: Error) => {
  message.error(`上传失败：${error?.message}`)
}
</script>

<style scoped>
.uploader-container {
  width: 100px;
  padding: 10px;
  color: #ffffff;
  background: #1890ff;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
}
.uploader-container:hover {
  background: #40a9ff;
}
.uploader-container h4 {
  color: #ffffff;
  margin-bottom: 0;
  margin-left: 10px;
}
</style>
