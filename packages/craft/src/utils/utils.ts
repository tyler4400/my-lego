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
