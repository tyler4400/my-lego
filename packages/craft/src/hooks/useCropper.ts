import type { Ref } from 'vue'
import Cropper from 'cropperjs'
import { onUnmounted, ref, watchEffect } from 'vue'
import { canvasToBlob, getContainedSize } from '@/utils/utils.ts'

export interface UseCropperOptions {
  maxCanvasHeight?: number
  fallbackMaxCanvasWidth?: number
}
interface CropperCanvasSize {
  width: number
  height: number
}

export interface CropperBlobExportOptions {
  mimeType?: string
  quality?: number
  width?: number
  height?: number
}

const DEFAULT_MAX_CANVAS_HEIGHT = 500
const DEFAULT_FALLBACK_MAX_CANVAS_WIDTH = 680

export const CSS_VAR_CROPPER_CANVAS_HEIGHT = '--cropper-canvas-height'

const useCropper = (cropperContainerRef: Ref<HTMLElement | null>, options: UseCropperOptions) => {
  const {
    maxCanvasHeight = DEFAULT_MAX_CANVAS_HEIGHT,
    fallbackMaxCanvasWidth = DEFAULT_FALLBACK_MAX_CANVAS_WIDTH,
  } = options

  const cropper = ref<Cropper | null>(null)
  const cropperCanvasSize = ref<CropperCanvasSize | null>(null)

  const destroyCropper = () => {
    cropper.value?.destroy()
    cropper.value = null
    cropperContainerRef.value?.replaceChildren()
    cropperCanvasSize.value = null
  }

  const createLoadedImage = async (src: string): Promise<HTMLImageElement> => {
    const image = new Image()
    image.alt = '待裁剪图片'
    // decoding 属性用于告诉浏览器如何解析图像数据。具体来说，在渲染其他的内容更新前，是否应该等待图像解码完成。
    image.decoding = 'async' // 异步解码图像，允许在解码完成前渲染其他内容
    // 如果后面要导出 canvas，且图片来源支持 CORS，可以打开这一行
    image.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('图片加载失败'))
      image.src = src
    })
    return image
  }

  const initCropper = async (src: string) => {
    if (!src) return

    const image = await createLoadedImage(src)

    if (!cropperContainerRef.value) {
      throw new Error('cropper 容器未挂载')
    }

    destroyCropper()

    const maxCanvasWidth
      = cropperContainerRef.value?.parentElement?.clientWidth
        || cropperContainerRef.value?.clientWidth
        || fallbackMaxCanvasWidth
    cropperCanvasSize.value = getContainedSize(
      image.naturalWidth,
      image.naturalHeight,
      maxCanvasWidth,
      maxCanvasHeight,
    )

    cropperContainerRef.value.replaceChildren(image)
    cropper.value = new Cropper(image, {
      container: cropperContainerRef.value, // container 其实不是绝对必填，因为默认就是父容器，但我建议显式传，代码意图更清楚。
    })

    // $center('contain') 不是必须，但通常会让初始展示更自然一些。
    const cropperImage = cropper.value.getCropperImage()
    await cropperImage?.$ready()
    cropperImage?.$center('contain')
    // cropperImage?.translatable = true

    return cropper.value
  }

  onUnmounted(() => {
    destroyCropper()
  })

  watchEffect(() => {
    const container = cropperContainerRef.value
    if (!container) return

    container.style.maxWidth = '100%'
    if (!cropperCanvasSize.value) {
      container.style.width = '100%'
      container.style.margin = ''
      container.style.removeProperty(CSS_VAR_CROPPER_CANVAS_HEIGHT)
      return
    }

    container.style.width = `${cropperCanvasSize.value.width}px`
    container.style.margin = '0 auto'
    container.style.setProperty(CSS_VAR_CROPPER_CANVAS_HEIGHT, `${cropperCanvasSize.value.height}px`)
  })

  const getCroppedBlob = async ({
    mimeType,
    quality,
    width,
    height,
  }: CropperBlobExportOptions) => {
    if (!cropper.value) {
      throw new Error('cropper 未初始化')
    }

    const selection = cropper.value.getCropperSelection()

    if (!selection) {
      throw new Error('未获取到裁剪区域')
    }

    const canvas = await selection.$toCanvas({ width, height })

    return canvasToBlob(canvas, mimeType, quality)
  }

  return {
    initCropper,
    destroyCropper,
    getCroppedBlob,
    cropper,
  }
}

export default useCropper
