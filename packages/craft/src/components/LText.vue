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

defineOptions({
  name: 'LText',
})

const props = defineProps({
  // eslint-disable-next-line vue/require-default-prop
  text: {
    type: String,
    required: false,
  },
  fontSize: {
    type: String,
    required: true,
  },
  tag: {
    type: String,
    default: 'div',
  },
})


const styleProps = computed(() => pick(props, 'fontSize'))
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
}
</style>
