import { onBeforeUnmount } from 'vue'

export interface OnMove {
  (deltaX: number, deltaY: number, moveEnd: boolean): void
}

interface GetBoundary {
  (): DOMRect | undefined
}

/**
 * 处理鼠标主键按下拖动时的场景
 * @param startMouseDownEvent 鼠标主键按下时的事件
 * @param onMove 鼠标主键按下后移动时，不停的触发，delatX/Ys相对于初始鼠标按下的相对位置. 鼠标抬起时moveEnd参数为true
 * @param getBoundary 设置鼠标按下后移动的边界，超出边界后不再触发onMove事件
 */
export const useMouseDrag = (
  startMouseDownEvent: MouseEvent,
  onMove: OnMove,
  getBoundary?: GetBoundary,
): void => {
  // 必须是鼠标主键（左键）
  if (startMouseDownEvent.button !== 0) return

  let startMouseX: number | null = startMouseDownEvent.clientX
  let startMouseY: number | null = startMouseDownEvent.clientY
  let deltaX: number = 0
  let deltaY: number = 0

  // console.log('startMove: ', startMouseX, startMouseY)

  const canvasRect = getBoundary?.()
  const handleMove = (e: MouseEvent): void => {
    if (startMouseX === null || startMouseY === null) return

    if (canvasRect) { // 鼠标不能超出画布范围
      const { top, left, bottom, right } = canvasRect
      if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) return
    }

    deltaX = e.clientX - startMouseX
    deltaY = e.clientY - startMouseY

    onMove?.(deltaX, deltaY, false)
  }

  const handleMouseUp = (): void => {
    startMouseY = startMouseX = null
    onMove?.(deltaX, deltaY, true)

    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleMouseUp)

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleMouseUp)
  })
}
