<template>
  <ul class="ant-list-items ant-list-bordered">
    <li
      v-for="(item, index) in list"
      :key="item.id"
      class="ant-list-item"
      :class="{ active: item.id === currentElementId, drag: item.id === currentDraggingId }"
      draggable="true"
      @click="() => handleClick(item.id)"
      @dragstart="handleDragStart($event, index)"
      @drop="handleDrop($event, index)"
      @dragover="handleDragOver"
      @dragend="handleDragEnd"
    >
      <div class="element-item">
        <div class="item-left">
          <MenuOutlined class="item-drag-icon" />
          {{ index + 1 }}.
          <TypographyParagraph
            :editable="{ triggerType: ['text'], tooltip: false, maxlength: 15 }"
            class="item-text"
            ellipsis
            :content="item.layerName"
            @update:content="(e) => handleRename(item, e)"
          >
            {{ item.layerName }}
          </TypographyParagraph>
        </div>
        <div class="item-setting">
          <IconSwitch
            :checked="!!item.isHidden"
            :tip="item.isHidden ? '显示' : '隐藏'"
            :icon="h(item.isHidden ? EyeInvisibleOutlined : EyeOutlined)"
            @click.stop="() => handleToggleHidden(item)"
          />
          <IconSwitch
            :checked="!!item.isLocked"
            :tip="item.isLocked ? '解锁' : '锁定'"
            :icon="h(item.isLocked ? LockOutlined : UnlockOutlined)"
            @click.stop="() => handleToggleLocked(item)"
          />
        </div>
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { ComponentData, EditableCompField } from '@/components'
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, MenuOutlined, UnlockOutlined } from '@ant-design/icons-vue'
import { TypographyParagraph } from 'ant-design-vue'

import { h, ref } from 'vue'
import IconSwitch from '@/components/IconSwitch'

export interface LayerListProps {
  list?: ComponentData[]
  currentElementId?: ComponentData['id']
}
export interface LayerListEmits {
  (e: 'setActive', id: ComponentData['id']): void
  (e: 'move', startIndex: number, endIndex: number): void
  <T extends EditableCompField>(e: 'change', id: ComponentData['id'], key: T, value: ComponentData[T]): void
}
const { list = [], currentElementId } = defineProps<LayerListProps>()

const emit = defineEmits<LayerListEmits>()

const handleClick = (id: ComponentData['id']) => {
  emit('setActive', id)
}
const handleToggleHidden = (item: ComponentData) => {
  emit('change', item.id, 'isHidden', !item.isHidden)
}
const handleToggleLocked = (item: ComponentData) => {
  emit('change', item.id, 'isLocked', !item.isLocked)
}
const handleRename = (item: ComponentData, layerName: string) => {
  emit('change', item.id, 'layerName', layerName)
}

/* drag and drop */
const currentDraggingId = ref<string>() // to change UI
let startDragIndex: number | undefined

const handleDragStart = (e: DragEvent, index: number) => {
  currentDraggingId.value = list[index]?.id
  startDragIndex = index

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move'
  }
}

const handleDragOver = (e: DragEvent) => {
  // 很多元素默认不可以dropdown的。阻止默认行为以允许放置，才可以接受drop是件
  e.preventDefault()

  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnd = () => {
  // emit('move', startDragIndex, index)
  startDragIndex = undefined
  currentDraggingId.value = undefined
}

const handleDrop = (e: DragEvent, index: number) => {
  if (index === startDragIndex || startDragIndex === undefined) return
  emit('move', startDragIndex, index)
}
</script>

<style scoped>
  .ant-list-items{
    padding-left: 0;
  }
  .ant-list-item {
    padding: 10px 5px;
    border: 1px solid #fff;
    border-bottom-color: #f0f0f0;
    justify-content: normal;
    cursor: pointer;
    transition: all 0.5s ease-out;
    list-style: none;

    &.active {
      border: 1px solid #1890ff;
      background-color: #e6f7ff;
    }
    &.drag {
      background-color: #dedfe0 !important;
    }

    &:hover {
      border: 1px solid #1890ff;
    }

    & .element-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      & .item-setting {
        gap: 0 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      & .item-left {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0 10px;
        color: #000000a6;

        & .item-drag-icon {
          font-size: 16px;
          cursor: grab;
        }
        & .item-text {
          margin-bottom: 0;
          cursor: text;
          max-width: 150px;
          color: #000000a6;
        }
      }
    }
  }
</style>
