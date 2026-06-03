import html2canvas from 'html2canvas'
import { canvasToBlob, waitForNextFrame } from '@/utils/utils.ts'

/**
 * useCanvasSnapshot：对 html2canvas 的薄封装，专门处理本项目编辑器画布的截图。
 *
 * 已知坑（实施时反复踩过）：
 * 1. **DPR 像素糊**：默认 scale=1 会按 CSS 像素截图，Retina 屏看起来糊。
 *    → 取 window.devicePixelRatio，封顶 2（再高文件 size 急剧膨胀，收益边际）。
 * 2. **box-shadow 不支持**：html2canvas 不渲染 box-shadow，会导致截图与编辑器肉眼所见有出入。
 *    → 在 onclone 回调里把克隆 DOM 内的 box-shadow 全部清空（替换为 outline 也是常见兜底）。
 *    本期选择"清空"——成品 H5 上 box-shadow 仍然正常，仅封面图差异。
 * 3. **EditWrapper 的选中态 / 控制点**：`.active` 边框 + `.resizer-container` 八个调节点会一起被截进图。
 *    → 在 onclone 里移除 `.edit-wrapper.active` 的 class、删除 `.resizer-container` 节点。
 *    （即便调用方已经清空了 store 的 currentElement，仍在 hook 里兜底，避免边缘条件下漏。）
 * 4. **跨域图片（重点）**：项目所有 LImage 用的是外部图床 <img>，没有 crossorigin 属性。
 *    即便后端图床配了 Access-Control-Allow-Origin，浏览器也已经把"无 CORS 版本"缓存到了 image cache，
 *    html2canvas 拿到的是污染的 canvas → toBlob/toDataURL 直接 SecurityError，所有图片显示为空白。
 *    → 解决方案：截图前**预先把所有 <img> 的 src 通过 fetch 转成 dataURL**，
 *      然后在 onclone 里把克隆 DOM 内的 src 替换为 dataURL（dataURL 是 inline 数据，不走 CORS）。
 *    → fetch 失败的图保留原 src 让 html2canvas 兜底处理（最坏画成空白，但不阻塞整张截图）。
 * 5. **截图前 DOM 未稳定**：调用方可能刚刚改了 store（如清空选中），React/Vue 还没 patch 完。
 *    → 强制 await 一次 waitForNextFrame 再开始截图。
 */

/**
 * 把图片 URL 通过 fetch 转换成 dataURL，绕开 canvas tainted 问题
 * - 图床须返回 Access-Control-Allow-Origin（项目当前图床支持，参见 ImageProcesser/cropperjs 的成功调用）
 * - 失败时静默返回 null，由调用方决定保留原 src
 */
const imgSrcToDataUrl = async (src: string): Promise<string | null> => {
  try {
    const resp = await fetch(src, { mode: 'cors', credentials: 'omit' })
    if (!resp.ok) return null
    const blob = await resp.blob()
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }
  catch {
    return null
  }
}

export interface CanvasSnapshotOptions {
  /**
   * 渲染缩放倍数。
   * - 默认按 devicePixelRatio 取，但封顶 2（超过收益边际，且会让上传文件 size 很大）
   * - 显式传入会覆盖默认
   */
  scale?: number
  /** 背景色。默认 #fff（避免透明截图叠到列表卡片上不好看） */
  backgroundColor?: string
  /** 输出 mime 类型。默认 image/png；可改 image/jpeg/webp 减小体积 */
  mimeType?: string
  /** 输出文件名（用于 File 对象）。默认 cover-${ts}.png */
  fileName?: string
  /** jpeg/webp 时的质量 0~1 */
  quality?: number
}

export interface CanvasSnapshotResult {
  blob: Blob
  file: File
  /** base64 dataURL，可直接当 <img src> 预览，不必再 createObjectURL */
  dataUrl: string
  /** 实际截图宽度（CSS 像素 × scale） */
  width: number
  /** 实际截图高度（CSS 像素 × scale） */
  height: number
}

const DEFAULT_MAX_SCALE = 2

/**
 * 创建一次画布截图
 *
 * @param target 要截图的根 DOM 元素（如 EditorView 的 #canvas-area）
 * @param options 截图选项，详见 CanvasSnapshotOptions
 */
export const snapshotElement = async (
  target: HTMLElement,
  options: CanvasSnapshotOptions = {},
): Promise<CanvasSnapshotResult> => {
  const {
    scale = Math.min(window.devicePixelRatio || 1, DEFAULT_MAX_SCALE),
    backgroundColor = '#fff',
    mimeType = 'image/png',
    fileName = `cover-${Date.now()}.png`,
    quality,
  } = options

  // 等 DOM 在调用方变更后稳定下来（例如刚刚清空了选中态）
  await waitForNextFrame()

  // 预加载所有图片为 dataURL（解决跨域 canvas tainted；详见上方坑 #4）
  // 用 Map 去重：同一 src 只 fetch 一次
  const imgs = Array.from(target.querySelectorAll<HTMLImageElement>('img'))
  const srcToDataUrl = new Map<string, string>()
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.currentSrc || img.src
      if (!src || src.startsWith('data:') || srcToDataUrl.has(src)) return
      const dataUrl = await imgSrcToDataUrl(src)
      if (dataUrl) srcToDataUrl.set(src, dataUrl)
    }),
  )

  const canvas = await html2canvas(target, {
    scale,
    backgroundColor,
    useCORS: true,
    // 关闭 html2canvas 的 console.log 喷射
    logging: false,
    // onclone 在 html2canvas 内部克隆一份 DOM 时调用，修改克隆体不会影响原编辑器
    onclone: (_doc, clonedRoot) => {
      // 1. 移除选中态 class，避免 .active 边框被截进图
      clonedRoot.querySelectorAll('.edit-wrapper.active').forEach((node) => {
        node.classList.remove('active')
      })
      // 2. 删除选中态的八个 resizer 调节点
      clonedRoot.querySelectorAll('.resizer-container').forEach((node) => {
        node.remove()
      })
      // 3. 清空所有 box-shadow（html2canvas 不支持，留着会让截图与所见不一致）
      const all = clonedRoot.querySelectorAll<HTMLElement>('*')
      all.forEach((el) => {
        if (el.style.boxShadow) el.style.boxShadow = 'none'
      })
      // 4. 用预加载好的 dataURL 替换 img.src（修复跨域 canvas 污染）
      clonedRoot.querySelectorAll<HTMLImageElement>('img').forEach((img) => {
        const original = img.getAttribute('src')
        if (!original) return
        const dataUrl = srcToDataUrl.get(original)
        if (dataUrl) img.src = dataUrl
      })
    },
  })

  const blob = await canvasToBlob(canvas, mimeType, quality)
  const file = new File([blob], fileName, { type: blob.type, lastModified: Date.now() })

  // 在大尺寸下 toDataURL 占内存较多，但封面截图（编辑画布尺寸）一般可控
  const dataUrl = canvas.toDataURL(mimeType, quality)

  return {
    blob,
    file,
    dataUrl,
    width: canvas.width,
    height: canvas.height,
  }
}
