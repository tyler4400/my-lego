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
    :afterClose="handleAfterClose"
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
import Cropper from 'cropperjs'
import { computed, nextTick, onUnmounted, ref, useTemplateRef } from 'vue'
import StyleUploader from '@/components/StyleUploader'
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
const cropper = ref<Cropper | null>(null)

const destroyCropper = () => {
  cropper.value?.destroy()
  cropper.value = null
}
const createLoadedImage = async (src: string): Promise<HTMLImageElement> => {
  const image = new Image()
  image.alt = '待裁剪图片'
  // decoding 属性用于告诉浏览器如何解析图像数据。具体来说，在渲染其他的内容更新前，是否应该等待图像解码完成。
  image.decoding = 'async' // 异步解码图像，允许在解码完成前渲染其他内容
  // 如果后面要导出 canvas，且图片来源支持 CORS，可以打开这一行
  // image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('图片加载失败'))
    image.src = src
  })
  return image
}

const initCropper = async (src: string) => {
  if (!src) return

  // 确保 Modal 内容真的已经进 DOM 并完成一次布局
  await nextTick()
  await waitForNextFrame()

  const image = await createLoadedImage(src)

  if (!cropperContainerRef.value) {
    throw new Error('cropper 容器未挂载')
  }

  if (!cropperContainerRef.value) return
  if (!showCropperModal.value) return

  destroyCropper()

  cropperContainerRef.value.replaceChildren(image)
  cropper.value = new Cropper(image, {
    container: cropperContainerRef.value, // container 其实不是绝对必填，因为默认就是父容器，但我建议显式传，代码意图更清楚。
  })

  // $center('contain') 不是必须，但通常会让初始展示更自然一些。
  const cropperImage = cropper.value.getCropperImage()
  await cropperImage?.$ready()
  cropperImage?.$center('contain')
}

onUnmounted(() => {
  destroyCropper()
})

const openCropperModal = async () => {
  if (!value) return

  showCropperModal.value = true

  const [, error] = await tryCatch(initCropper(value))
  if (error) console.error('初始化cropper失败:', error)
}
const closeCropperModal = () => {
  showCropperModal.value = false
}
const handleAfterClose = () => {
  destroyCropper()
  cropperContainerRef.value?.replaceChildren()
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
    border: 1px solid #f0f0f0;
  }

  .image-cropper :deep(cropper-canvas) {
    width: 100%;
    height: 300px;
  }
  /* will use this later */
  .image-cropper img {
    //display: block;
    /* This rule is very important, please don't ignore this */
    //max-width: 100%;
  }

  .image-process {
    padding: 5px 0;
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
</style>
