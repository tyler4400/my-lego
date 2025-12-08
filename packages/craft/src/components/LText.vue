<template>
  <component
    :is="tag"
    :style="styleProps"
    class="l-text-component"
  >
    {{ text }}
  </component>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { pick } from 'lodash-es'
import { textPropType, textStylePropsKeys } from '@/defaultProps.ts'

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

const styleProps = computed(() => pick(props, textStylePropsKeys))
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
