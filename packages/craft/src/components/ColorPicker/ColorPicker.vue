<template>
  <div class="color-picker">
    <div class="native-color-container">
      <input
        type="color"
        :value="value"
        @input="e => onChange((e.target as HTMLInputElement).value)"
      >
    </div>
    <ul class="picked-color-list">
      <li
        v-for="(color, index) in colors" :key="color" :class="`item-${index}`"
        @click="() => onChange(color)"
      >
        <div class="color-item" :style="{ backgroundColor: color }" />
      </li>
      <li @click="() => onChange('transparent')">
        <div class="color-item transparent-back" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { defaultColors } from '@/components/ColorPicker/helper.ts'

export interface ColorPickerProps {
  value: string
  colors?: string[]
}

const { value, colors = defaultColors } = defineProps<ColorPickerProps>()

const emit = defineEmits<{ change: [color: string] }>()

const onChange = (color: string) => {
  emit('change', color)
}
</script>

<style scoped>
.color-picker {
  display: flex;
}
.native-color-container {
  width: 40%;
}
.native-color-container input[type="color"] {
  width: 100%;
  cursor: pointer;
  height: 50px;
  border: 0;
  padding: 0;
  background-color: transparent;
}
.picked-color-list {
  padding: 0 0 0 5px;
  margin: 0;
  width: 60%;
  display: flex;
  list-style-type: none;
  flex-wrap: wrap;
  justify-content: space-between;
}
.picked-color-list li {
  flex: 1;
  width: 20%;
  min-width: 20%;
  max-width: 20%;
}
.color-item {
  padding: 3px;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  margin-right: 5px;
  cursor: pointer;
  border: 1px solid #ccc;
}
.transparent-back {
  background: url('@/assets/transparent.png') no-repeat;
}
</style>
