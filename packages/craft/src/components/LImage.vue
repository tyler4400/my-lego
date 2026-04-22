<template>
  <img
    :src="src"
    class="l-image-component"
    :style="stylesProps"
    alt="image"
    @click.prevent="handleClick"
  >
</template>

<script setup lang="ts">
import type { ImageComponentProps } from '@/types/editor.ts'
import { without } from 'lodash-es'
import { imageDefaultProps } from '@/components'
import useComponentCommon from '@/hooks/useComponentCommon.ts'

defineOptions({
  name: 'LImage',
})
const props = defineProps<ImageComponentProps>()

const imageStylePropsKeys = without(Object.keys(imageDefaultProps), 'src', 'naturalWidth', 'naturalHeight')

const { stylesProps, handleClick } = useComponentCommon(
  props,
  imageStylePropsKeys,
)
</script>

<style scoped>
.l-image-component {
  max-width: 100%;
  /*
  position: relative !important;
  */
}
</style>
