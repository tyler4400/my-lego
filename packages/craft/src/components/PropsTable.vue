<template>
  <div class="props-table">
    <div
      v-for="field in fields"
      :key="field.key"
      class="prop-item"
    >
      <span class="label">{{ field.label }}</span>
      <div class="prop-component">
        <!--  用 <RenderVnode> 时：node 可以是 string 或 VNode，如果是 string 就直接当纯文本渲染。 -->
        <!--  <RenderVnode :node="field.node" /> -->
        <!--  RenderVnode也可以换成component.is，只不过如果field.node不能是纯字符串 -->
        <!--  改成 <component :is="node"> 时： -->
        <!--  如果 node 是 string，Vue 会尝试把它当“标签 / 组件名”，而不是“纯文本”。 -->
        <!--  所以像 ield.node = '纯文本' 这种场景，就不再适合用 <component :is="ield.node">， -->
        <!--  得把 label 包成一个 VNode（例如 <span>纯文本</span>），或者继续用 RenderVnode 这种“直接 return”的组件。 -->
        <component :is="field.node" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VNode } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { computed } from 'vue'
import { mapPropsToForms } from '@/views/EditorView/propsMap.tsx'

const { compProps = {} } = defineProps<{ compProps?: Partial<TextComponentProps> }>()

const emit = defineEmits<{ change: [key: keyof TextComponentProps, value: any] }>()

/**
 * 待做的逻级优化： 解耦EditorView 和 PropsTable
 * 现在 EditorView 把 editorStore.currentElement?.props 原样丢给 PropsTable；
 * PropsTable 又内部调用 mapPropsToForms()，自己决定如何根据 key 映射 UI；
 * 可以改成：
 * EditorView 主动调用 mapPropsToForms(currentProps) 得到一个 字段配置数组；
 * 再把这个字段配置数组丢给 PropsTable，PropsTable 只负责纯 UI 渲染；
 * 这样以后如果有别的组件类型（不仅仅是 TextComponentProps），EditorView 也可以用同一套 PropsTable，只是传不同的 fieldConfigs。
 *
 * 总结，也就是PropsTable不引入mapPropsToForms了，完全由上层EditorView引入。PropsTable只负责渲染。
 */

interface FinalField {
  key: keyof TextComponentProps
  label: string
  node: VNode
}

const fields = computed<FinalField[]>(() => {
  const result: FinalField[] = []
  const rawProps = compProps as Partial<TextComponentProps>

  Object.keys(rawProps).forEach((key) => {
    const newKey = key as keyof TextComponentProps
    const config = mapPropsToForms[newKey]
    if (!config) return

    const rawValue = rawProps[newKey]
    const value = config.fromProps?.(rawValue, rawProps, newKey) ?? (rawValue as any)

    const node = config.render({
      key: newKey,
      value,
      rawProps,
      onChange: (val: any) => {
        const nextRaw = config.toProps?.(val, rawProps, newKey) ?? val
        emit('change', newKey, nextRaw)
      },
    })

    result.push({
      key: newKey,
      label: config.label,
      node,
    })
  })

  return result
})
</script>

<style scoped>
.prop-item {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}
.label {
  width: 28%;
}
.prop-component {
  width: 70%;
}
</style>
