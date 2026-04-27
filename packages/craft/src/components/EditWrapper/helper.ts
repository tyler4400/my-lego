import type { Rect, ResizeDirection } from './types.ts'

export interface CalculateSizeOptions {
  minWidth?: number
  minHeight?: number
}
/**
 * 根据拖动的角(direction)、初始位置/尺寸、鼠标偏移量，计算新元素的位置和尺寸。
 *
 * 核心思路：任何一个角的 resize，本质上是固定对角点不动，让被拖的角随鼠标移动。最终矩形 = 这两个点构成的 bounding box。
 * ────────────────────────────────────────────────────────────────────
 * 任何一个角的 resize，本质上都是：
 *   - 该方向的【对角点】保持不动 (fixed)
 *   - 当前被拖动的角随鼠标移动        (dragged = 初始角 + delta)
 * 那么新元素 = 这两个点构成的轴对齐包围盒 (AABB)。
 *
 * 用 Math.abs / Math.min 直接得出宽高和左上角，
 * 就天然支持「鼠标越过对角点 → 元素翻转继续 resize」这种边界情况，
 * 不需要为 4 个方向各写一堆 if 翻转判断。
 *
 * 各方向的对角点定义：
 *   bottomRight 拖右下角 → fixed = topLeft     (left,         top)
 *   bottomLeft  拖左下角 → fixed = topRight    (left + width, top)
 *   topRight    拖右上角 → fixed = bottomLeft  (left,         top + height)
 *   topLeft     拖左上角 → fixed = bottomRight (left + width, top + height)
 *
 * 步骤：
 *   1. 由 direction 取出 fixed 点 与 dragged 角的"初始"坐标
 *   2. 把 (deltaX, deltaY) 加到 dragged 上，得到鼠标当前位置
 *   3. nextWidth/nextHeight = |dragged - fixed|     ← 自动处理翻转
 *   4. left/top 取靠左/靠上的那一侧；翻转时由 fixed 反向偏移得到
 *
 * minWidth / minHeight：
 *   通过 Math.max 兜底；当处于翻转一侧 (dragged < fixed) 时，
 *   left/top 用 `fixed - nextWidth` 反推，保证 fixed 边永远不动，
 *   只在拖动那一侧扩展到最小尺寸，避免抖动。
 */
export const calculateSize = (
  direction: ResizeDirection,
  initPosition: Rect,
  deltaX: number,
  deltaY: number,
  options: CalculateSizeOptions = {},
): Rect => {
  const { left, top, width, height } = initPosition
  const { minWidth = 0, minHeight = 0 } = options

  let fixedX: number, fixedY: number
  let draggedX: number, draggedY: number

  switch (direction) {
    case 'bottomRight':
      fixedX = left
      fixedY = top
      draggedX = left + width
      draggedY = top + height
      break
    case 'bottomLeft':
      fixedX = left + width
      fixedY = top
      draggedX = left
      draggedY = top + height
      break
    case 'topLeft':
      fixedX = left + width
      fixedY = top + height
      draggedX = left
      draggedY = top

      break
    case 'topRight':
      fixedX = left
      fixedY = top + height
      draggedX = left + width
      draggedY = top
      break
  }

  draggedX += deltaX
  draggedY += deltaY

  const newWidth = Math.max(minWidth, Math.abs(draggedX - fixedX))
  const newHeight = Math.max(minHeight, Math.abs(draggedY - fixedY))

  /**
   * 当 minWidth/minHeight = 0（不限制）时，等同于min(fixed.x, dragged.x)
   * 而当有限制的时候，nextWidth 已经被 Math.max 撑大，超出了 dragged 与 fixed 之间的距离。这时必须明确「向哪边扩展」——答案永远是向 dragged 那一侧扩展，fixed 那一侧保持不动
   */
  const newLeft = draggedX < fixedX ? fixedX - newWidth : fixedX
  const newTop = draggedY < fixedY ? fixedY - newHeight : fixedY

  return { left: newLeft, top: newTop, width: newWidth, height: newHeight }
}
