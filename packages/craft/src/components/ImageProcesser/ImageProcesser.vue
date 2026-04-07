<template>
  <div class="image-processer">
    <div
      class="image-preview"
      :class="{ extraHeight: showDelete }"
      :style="{ backgroundImage: backgroundUrl }"
    />
    <div class="image-process">
      <StyleUploader @success="handleFileUploaded" />
      <Button v-if="value" @click="openCropperModal">
        <ScissorOutlined />
        裁剪图片
      </Button>
      <Button v-if="showDelete" danger @click="handleDelete">
        <DeleteOutlined />
        删除图片
      </Button>
    </div>
    {{ ratio }}
  </div>
  <!--
forceRender
作用是让 Modal 内容提前渲染出来，而不是等第一次打开时才创建。
这样 cropperContainerRef 在首次打开前就更有机会已经存在。
权衡点：
优点：首开时序更稳
代价：多一个隐藏的 modal body DOM，但你这个场景成本很低
-->
  <Modal
    v-model:open="showCropperModal"
    title="裁剪图片"
    forceRender
    :width="800"
    :afterClose="destroyCropper"
    @ok="closeCropperModal"
    @cancel="closeCropperModal"
  >
    <div ref="cropperContainerRef" class="image-cropper" />
  </Modal>
</template>

<script setup lang="ts">
import type { UploadResponse } from '@/types/upload.ts'
import { DeleteOutlined, ScissorOutlined } from '@ant-design/icons-vue'
import { tryCatch } from '@my-lego/shared'
import { Button, Modal } from 'ant-design-vue'
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import StyleUploader from '@/components/StyleUploader'
import useCropper from '@/hooks/useCropper.ts'
import { waitForNextFrame } from '@/utils/utils.ts'

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

const backgroundUrl = computed(() => `url(${value})`)

const handleFileUploaded = (res: UploadResponse, file: File): void => {
  emit('change', res.data.url, file)
  emit('uploaded', res, file)
}

const handleDelete = () => {
  emit('change', '')
}

/* 裁剪图片 */
const cropperContainerRef = useTemplateRef('cropperContainerRef')
const showCropperModal = ref(false)

const { destroyCropper, initCropper } = useCropper(cropperContainerRef, {
  maxCanvasHeight: 700,
  fallbackMaxCanvasWidth: 800,
})

const openCropperModal = async () => {
  if (!value) return

  showCropperModal.value = true

  // 确保 Modal 内容真的已经进 DOM 并完成一次布局
  await nextTick()
  await waitForNextFrame()

  const [, error] = await tryCatch(initCropper(value))
  if (error) console.error('初始化cropper失败:', error)
}
const closeCropperModal = () => {
  showCropperModal.value = false
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
    height: 110px;
  }

  .image-cropper {
    width: 100%;
    border: 1px solid rgb(25 65 197 / 0.65);
  }

  .image-cropper :deep(cropper-canvas) {
    width: 100%;
    height: var(--cropper-canvas-height, 300px);
  }

  .image-process {
    padding: 5px 0;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
</style>
