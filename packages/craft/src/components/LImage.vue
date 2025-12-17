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
import type { ImageComponentProps } from '@/defaultProps.ts'
import { imageStylePropsKeys } from '@/defaultProps.ts'
import useComponentCommon from '@/hooks/useComponentCommon.ts'

defineOptions({
  name: 'LImage',
})
const props = defineProps<ImageComponentProps>()

const { stylesProps, handleClick } = useComponentCommon(
  props,
  imageStylePropsKeys,
)
</script>

<style scoped>

</style>
