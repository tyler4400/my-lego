<template>
  <div class="image-processer">
    <div
      class="image-preview"
      :class="{ extraHeight: showDelete }"
      :style="{ backgroundImage: backgroundUrl }"
    />
    <div class="image-process">
      <StyleUploader @success="handleFileUploaded" />
      <Button v-if="showDelete" danger @click="handleDelete">
        <DeleteOutlined />
        删除图片 {{ ratio }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UploadResponse } from '@/types/upload.ts'
import { DeleteOutlined } from '@ant-design/icons-vue'
import { Button } from 'ant-design-vue'
import { computed } from 'vue'
import StyleUploader from '@/components/StyleUploader'

export interface ImageProcesserProps {
  value: string
  ratio: number
  showDelete?: boolean
}
const { value, showDelete = false, ratio } = defineProps<ImageProcesserProps>()

const emit = defineEmits<ImageProcesserEmits>()

export interface ImageProcesserEmits {
  change: [url: string, file?: File]
  uploaded: [resp: UploadResponse, file: File]
}

console.log('/ratio: ', ratio)
const backgroundUrl = computed(() => `url(${value})`)

const handleFileUploaded = (res: UploadResponse, file: File): void => {
  emit('change', res.data.url, file)
  emit('uploaded', res, file)
}

const handleDelete = () => {
  emit('change', '')
}
</script>

<style scoped>
  .image-processer {
    display: flex;
    justify-content: space-between;
  }

  .image-preview {
    width: 150px;
    height: 84px;
    border: 1px solid #e6ebed;
    background: no-repeat 50%/contain;
  }
  .image-preview.extraHeight {
    //height: 110px;
  }

  /* will use this later */
  .image-cropper img {
    display: block;
    /* This rule is very important, please don't ignore this */
    max-width: 100%;
  }

  .image-process {
    padding: 5px 0;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
</style>
