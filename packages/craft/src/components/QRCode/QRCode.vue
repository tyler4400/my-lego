<template>
  <div
    class="qrcode-wrap"
    :style="{ width: `${size}px`, height: `${size}px` }"
  >
    <img
      v-if="dataUrl"
      class="qrcode-img"
      :src="dataUrl"
      :alt="alt"
      :width="size"
      :height="size"
    >
    <div v-else-if="error" class="qrcode-error">
      生成失败
    </div>
    <Spin v-else class="qrcode-loading" size="small" />
  </div>
</template>

<script setup lang="ts">
import { tryCatch } from '@my-lego/shared'
import { Spin } from 'ant-design-vue'
import QRCodeLib from 'qrcode'
import { ref, watch } from 'vue'

interface Props {
  value: string
  size?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  alt?: string
}

const {
  value,
  size = 160,
  margin = 1,
  errorCorrectionLevel = 'M',
  alt = '二维码',
} = defineProps<Props>()

const dataUrl = ref<string>('')
const error = ref<string>('')

const generate = async () => {
  dataUrl.value = ''
  error.value = ''

  if (!value) return

  const [url, err] = await tryCatch(QRCodeLib.toDataURL(value, {
    width: size,
    margin,
    errorCorrectionLevel,
  }))

  if (err) {
    error.value = err.message
    return
  }

  dataUrl.value = url
}

watch(
  () => [value, size, margin, errorCorrectionLevel] as const,
  () => generate(),
  { immediate: true },
)
</script>

<style scoped>
.qrcode-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}

.qrcode-img {
  display: block;
  object-fit: contain;
}

.qrcode-error,
.qrcode-loading {
  color: #999;
  font-size: 12px;
}
</style>
