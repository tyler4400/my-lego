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
import type { TextComponentProps } from '@/defaultProps.ts'
import { textDefaultProps, textStylePropsKeys } from '@/defaultProps.ts'
import useComponentCommon from '@/hooks/useComponentCommon.ts'

export type LTextProps = Partial<TextComponentProps> & {
  tag?: string
}

defineOptions({
  name: 'LText',
})

/**
 * 课程里使用的是运行时声明props。我这里改为类型声明。课程代码如下
 * const props = defineProps({
 *   tag: {
 *     type: String,
 *     default: 'div',
 *   },
 *   ...textPropType,
 * })
 */
const props = withDefaults(defineProps<LTextProps>(), {
  ...textDefaultProps,
  tag: 'div',
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
