<template>
  <div class="history-area">
    <div class="operation-list">
      <RadioGroup>
        <Tooltip title="撤销">
          <RadioButton :disabled="!canUndo" @click="emit('undo')">
            <ArrowLeftOutlined />
          </RadioButton>
        </Tooltip>
        <Tooltip title="重做">
          <RadioButton :disabled="!canRedo" @click="emit('redo')">
            <ArrowRightOutlined />
          </RadioButton>
        </Tooltip>
      </RadioGroup>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftOutlined, ArrowRightOutlined } from '@ant-design/icons-vue'
import { RadioButton, RadioGroup, Tooltip } from 'ant-design-vue'

const { canUndo, canRedo } = defineProps<{
  canUndo: boolean
  canRedo: boolean
}>()

const emit = defineEmits<{
  (e: 'undo'): void
  (e: 'redo'): void
}>()
</script>

<style scoped>
.history-area {
  position: absolute;
  right: 0;
  z-index: 500;
}
.operation-list {
  display: flex;
}
.history-area .bold {
  font-weight: bold;
}
</style>
