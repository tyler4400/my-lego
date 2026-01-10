<template>
  <div class="create-component-list">
    <div
      v-for="(item, index) in list"
      :key="index"
      class="component-item"
      @click="() => handleTextClick(item)"
    >
      <LText v-bind="item" />
    </div>
  </div>
  <StyleUploader @success="handleImageUploaded" />
</template>

<script setup lang="ts">
import type { ComponentData } from '@/components'
import type { TextComponentProps } from '@/defaultProps.ts'
import type { UploadResponse } from '@/types/upload.ts'
import { v4 as uuidv4 } from 'uuid'
import LText from '@/components/LText.vue'
import StyleUploader from '@/components/StyleUploader'
import { imageDefaultProps } from '@/defaultProps.ts'
import { getImageDimensions } from '@/utils/utils.ts'

defineProps<{ list: Partial<TextComponentProps>[] }>()

const emit = defineEmits<{
  (e: 'onItemClick', item: ComponentData): void
}>()

const maxWidth = 373

const handleImageUploaded = async (resp: UploadResponse, _file: File) => {
  const componentData: ComponentData = {
    name: 'LImage',
    id: uuidv4(),
    props: {
      ...imageDefaultProps,
      src: resp.data.url,
    },
  }
  const { width } = await getImageDimensions(resp.data.url)
  componentData.props.width = `${Math.min(width, maxWidth)}px`
  emit('onItemClick', componentData)
}

const handleTextClick = (data: Partial<TextComponentProps>) => {
  const componentData: ComponentData = {
    name: 'LText',
    id: uuidv4(),
    props: {
      ...data,
    },
  }
  emit('onItemClick', componentData)
}
</script>

<style scoped>
.component-item {
  width: 100px;
  margin: 0 auto 15px;
}
</style>
