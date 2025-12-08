<template>
  <component
    :is="tag"
    :style="stylesProps"
    class="l-text-component"
    @click="handleClick"
  >
    {{ text }}
  </component>
</template>
<script setup lang="ts">
import { textPropType, textStylePropsKeys } from '@/defaultProps.ts'
import useComponentCommon from '@/hooks/useComponentCommon.ts'

defineOptions({
  name: 'LText',
})

const props = defineProps({
  tag: {
    type: String,
    default: 'div',
  },
  ...textPropType,
})

const { stylesProps, handleClick } = useComponentCommon(props, textStylePropsKeys)
</script>

<style scoped>
h2.l-text-component,
p.l-text-component {
  margin-bottom: 0;
}
button.l-text-component {
  padding: 5px 10px;
  cursor: pointer;
}
.l-text-component {
  box-sizing: border-box;
  white-space: pre-wrap;
  position: relative !important;
}
</style>
