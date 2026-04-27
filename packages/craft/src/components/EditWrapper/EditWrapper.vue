<template>
  <div
    ref="editWrapper"
    class="edit-wrapper"
    :style="positionStyle as CSSProperties"
    style="position: absolute"
    :class="{ active, locked: comp.isLocked }"
    @mousedown.prevent="startMove"
    @click="() => handleClick(comp.id)"
  >
    <slot />
    <div v-show="active && !comp.isLocked" class="resizer-container">
      <div class="resizer top-left" @mousedown.stop.prevent="e => startResize(e, 'topLeft')" />
      <div class="resizer top-right" @mousedown.stop.prevent="e => startResize(e, 'topRight')" />
      <div class="resizer bottom-left" @mousedown.stop.prevent="e => startResize(e, 'bottomLeft')" />
      <div class="resizer bottom-right" @mousedown.stop.prevent="e => startResize(e, 'bottomRight')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type { EditWrapperProps, PositionPayload, ResizeDirection } from './types.ts'
import type { OnMove } from '@/hooks/useMouseDrag.ts'
import { pick } from 'lodash-es'
import { computed, inject, useTemplateRef } from 'vue'
import { useMouseDrag } from '@/hooks/useMouseDrag.ts'
import { numberToPx, pxToNumber } from '@/utils/utils.ts'
import { canvasKey } from '@/views/EditorView/canvasContext.ts'
import { calculateSize } from './helper.ts'

defineOptions({
  name: 'EditWrapper',
})

const { active, comp } = defineProps<EditWrapperProps>()

const emit = defineEmits<{
  (e: 'setActive', id: string): void
  (e: 'updatePosition', id: string, position: PositionPayload): void
}>()

const positionStyle = computed(() => pick(comp.props, ['position', 'top', 'left', 'right', 'bottom', 'width', 'height']))

function handleClick(id: string) {
  emit('setActive', id)
}

const getCanvasRect = inject(canvasKey)

const currentEle = useTemplateRef('editWrapper')

const startMove = (e: MouseEvent) => {
  // locked不可以拖动
  if (comp.isLocked) return

  const initLeft: number | null = pxToNumber(positionStyle.value.left) ?? null
  const initTop: number | null = pxToNumber(positionStyle.value.top) ?? null

  if (initLeft === null || initTop === null) return

  const onMouseMove: OnMove = (deltaX, deltaY, end) => {
    if (!currentEle.value) return

    const newLeft = numberToPx(initLeft! + deltaX)
    const newTop = numberToPx(initTop! + deltaY)

    currentEle.value.style.left = newLeft
    currentEle.value.style.top = newTop

    if (end) {
      emit('updatePosition', comp.id, { left: newLeft, top: newTop })
    }
  }

  useMouseDrag(e, onMouseMove, getCanvasRect)
}

const startResize = (e: MouseEvent, direction: ResizeDirection) => {
  // locked不可以拖动
  if (comp.isLocked) return

  const initLeft: number | null = pxToNumber(positionStyle.value.left) ?? null
  const initTop: number | null = pxToNumber(positionStyle.value.top) ?? null
  const initWidth: number | null = pxToNumber(positionStyle.value.width) ?? null
  const initHeight: number | null = pxToNumber(positionStyle.value.height) ?? null

  if (initLeft === null || initTop === null || initWidth === null || initHeight === null) return

  const onMouseMove: OnMove = (deltaX, deltaY, end) => {
    if (!currentEle.value) return

    const initResizePosition = { left: initLeft, width: initWidth, height: initHeight, top: initTop }
    const { left, height, width, top } = calculateSize(direction, initResizePosition, deltaX, deltaY)

    const newLeft = numberToPx(left)
    const newHeight = numberToPx(height)
    const newWidth = numberToPx(width)
    const newTop = numberToPx(top)

    currentEle.value.style.left = newLeft
    currentEle.value.style.height = newHeight
    currentEle.value.style.width = newWidth
    currentEle.value.style.top = newTop

    if (end) {
      emit('updatePosition', comp.id, { left: newLeft, top: newTop, height: newHeight, width: newWidth })
    }
  }

  useMouseDrag(e, onMouseMove, getCanvasRect)
}
</script>

<style scoped>
.edit-wrapper {
  padding: 0;
  cursor: pointer;
  border: 1px solid transparent;
  user-select: none;
  box-sizing: content-box !important;
}
.edit-wrapper:hover {
  border: 1px dashed #ccc;
}
.edit-wrapper.active {
  border: 1px solid #1890ff;
  user-select: none;
  z-index: 1500;

  .resizer-container {

    & .resizer {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 3px solid #1890ff;
      background: #fff;
      position: absolute;
      &.top-left {
        left: -5px;
        top: -5px;
        cursor: nwse-resize;
      }
      &.top-right {
        right: -5px;
        top: -5px;
        cursor: nesw-resize;
      }
      &.bottom-left {
        left: -5px;
        bottom: -5px;
        cursor: nesw-resize;
      }
      &.bottom-right {
        right: -5px;
        bottom: -5px;
        cursor: nwse-resize;
      }
    }
  }
}
.edit-wrapper.locked {
  border: 1px solid rgb(236 5 5 / 0.65);
}

/* 让内部任何子元素在编辑器里都不参与定位（交给外层 wrapper 管） */
.edit-wrapper > *:first-child {
  position: static !important;
  width: 100% !important;
  height: 100% !important;
  display: block; /* 防止 <img> 这类 inline-replaced 元素被 baseline 拽下去 */
}
</style>
