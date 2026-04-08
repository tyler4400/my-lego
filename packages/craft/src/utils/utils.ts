/**
 * 获取图片图像固有的（自然的）、修正后的 CSS 像素宽高。
 * https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLImageElement/naturalHeight
 * @param url 图片地址 或 图片文件对象
 */
export const getImageDimensions = (url: string | File) => {
  return new Promise<{ width: number, height: number }>((resolve, reject) => {
    const img = new Image()
    img.src = typeof url === 'string' ? url : URL.createObjectURL(url)
    img.addEventListener('load', () => {
      const { naturalWidth: width, naturalHeight: height } = img
      resolve({ width, height })
    })
    img.addEventListener('error', () => {
      reject(new Error('Image load failed'))
    })
  })
}

/**
 * 等待下一帧完成
 */
export const waitForNextFrame = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/**
 * 在最大宽高限制内，按原图比例计算最终显示尺寸。
 */
export const getContainedSize = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) => {
  if (!width || !height || !maxWidth || !maxHeight) {
    return {
      width: maxWidth,
      height: maxHeight,
    }
  }
  const scale = Math.min(maxWidth / width, maxHeight / height, 1)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

export const canvasToBlob = (canvas: HTMLCanvasElement, mimeType?: string, quality?: number) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('canvasToBlob失败'))
        return
      }
      resolve(blob)
    }, mimeType, quality)
  })
}
