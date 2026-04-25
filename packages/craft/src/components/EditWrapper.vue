<template>
  <div
    ref="editWrapper"
    class="edit-wrapper"
    :style="positionStyle as CSSProperties"
    :class="{ active, locked: comp.isLocked }"
    @mousedown.prevent="startMove"
    @click="() => handleClick(comp.id)"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { ComponentData } from '@/types/editor.ts'
import { pick } from 'lodash-es'
import { computed, inject, useTemplateRef } from 'vue'
import { numberToPx, pxToNumber } from '@/utils/utils.ts'
import { canvasKey } from '@/views/EditorView/canvasContext.ts'

export interface EditWrapperProps {
  active: boolean
  comp: ComponentData/* 这里拿了完整对象，也可以只拿相关props */
}

defineOptions({
  name: 'EditWrapper',
})

const { active, comp } = defineProps<EditWrapperProps>()

const emit = defineEmits<{
  (e: 'setActive', id: string): void
  (e: 'updatePosition', id: string, left: string, top: string): void
}>()

const positionStyle = computed(() => pick(comp.props, ['position', 'top', 'left', 'right', 'bottom', 'width', 'height']))

function handleClick(id: string) {
  emit('setActive', id)
}

const getCanvasRect = inject(canvasKey)

const currentEle = useTemplateRef('editWrapper')
const startMove = (e: MouseEvent): void => {
  // 必须是鼠标主键（左键）
  if (e.button !== 0) return

  // locked不可以拖动
  if (comp.isLocked) return

  let startMouseX: number | null = null
  let startMouseY: number | null = null
  let startLeft: number | null = null
  let startTop: number | null = null
  let newLeft: string = ''
  let newTop: string = ''

  startMouseX = e.clientX
  startMouseY = e.clientY
  console.log('startMove: ', startMouseX, startMouseY)
  startLeft = pxToNumber(positionStyle.value.left) ?? null
  startTop = pxToNumber(positionStyle.value.top) ?? null

  const canvasRect = getCanvasRect?.()
  const handleMove = (e: MouseEvent): void => {
    if (!currentEle.value) return
    if (startMouseX === null || startMouseY === null || startLeft === null || startTop === null) return

    if (canvasRect) { // 鼠标不能超出画布范围
      const { top, left, bottom, right } = canvasRect
      if (e.clientX < left || e.clientX > right || e.clientY < top || e.clientY > bottom) return
    }

    const deltaX = e.clientX - startMouseX
    const deltaY = e.clientY - startMouseY

    newLeft = numberToPx(startLeft + deltaX)
    newTop = numberToPx(startTop + deltaY)

    currentEle.value.style.left = newLeft
    currentEle.value.style.top = newTop
  }

  const handleMouseUp = (): void => {
    if (newTop || newLeft) {
      emit('updatePosition', comp.id, newLeft, newTop)
    }
    newLeft = newTop = ''
    startLeft = startTop = startMouseY = startMouseX = null

    document.removeEventListener('mousemove', handleMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  document.addEventListener('mousemove', handleMove)
  document.addEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.edit-wrapper {
  padding: 0;
  cursor: pointer;
  border: 1px solid transparent;
  user-select: none;
}
.edit-wrapper:hover {
  border: 1px dashed #ccc;
}
.edit-wrapper.active {
  border: 1px solid #1890ff;
  user-select: none;
  z-index: 1500;
}
.edit-wrapper.locked {
  border: 1px solid rgb(236 5 5 / 0.65);
}

/* 让内部任何子元素在编辑器里都不参与定位（交给外层 wrapper 管） */
.edit-wrapper > *:first-child {
  position: static !important;
  width: 100% !important;
  height: 100% !important;
}
</style>
