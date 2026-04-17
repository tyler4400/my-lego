<template>
  <div class="props-table">
    <!--    <div -->
    <!--      v-for="field in fields" -->
    <!--      :key="field.key" -->
    <!--      class="prop-item" -->
    <!--    > -->
    <!--      <span v-if="field.label" class="label">{{ field.label }}</span> -->
    <!--      <div class="prop-component"> -->
    <!--        &lt;!&ndash;  用 <RenderVnode> 时：node 可以是 string 或 VNode，如果是 string 就直接当纯文本渲染。 &ndash;&gt; -->
    <!--        &lt;!&ndash;  <RenderVnode :node="field.node" /> &ndash;&gt; -->
    <!--        &lt;!&ndash;  RenderVnode也可以换成component.is，只不过如果field.node不能是纯字符串 &ndash;&gt; -->
    <!--        &lt;!&ndash;  改成 <component :is="node"> 时： &ndash;&gt; -->
    <!--        &lt;!&ndash;  如果 node 是 string，Vue 会尝试把它当“标签 / 组件名”，而不是“纯文本”。 &ndash;&gt; -->
    <!--        &lt;!&ndash;  所以像 ield.node = '纯文本' 这种场景，就不再适合用 <component :is="ield.node">， &ndash;&gt; -->
    <!--  得把 label 包成一个 VNode（例如 <span>纯文本</span>），或者继续用 RenderVnode 这种“直接 return”的组件。 &ndash;&gt; -->
    <!--        <component :is="field.node" /> -->
    <!--      </div> -->
    <!--    </div> -->

    <!-- 上面是优化前版本，下面是优化后版本   -->
    <RenderPropField
      v-for="field in fieldDefinition"
      :key="`${currentElementId}: ${field.key}`"
      :fieldKey="field.key"
      :config="field.config"
      :compProps="compProps"
      @change="handleFieldChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { FieldConfig } from './propsMap.tsx'
import type { AllComponentProps } from '@/defaultProps.ts'
import { isArray } from '@my-lego/shared'
import { computed } from 'vue'
import RenderPropField from '@/components/PropsTable/RenderPropField.tsx'
import { mapPropsToForms } from './propsMap.tsx'

const { compProps = {}, currentElementId = '' } = defineProps<{
  compProps?: Partial<AllComponentProps>
  currentElementId?: string
}>()

const emit = defineEmits<{ change: [key: keyof AllComponentProps, value: any] }>()

interface FieldDefinition {
  key: keyof AllComponentProps
  config: FieldConfig
}

const fieldDefinition = computed<FieldDefinition[]>(() => {
  return Object.keys(compProps).reduce<FieldDefinition[]>((result, key) => {
    const fieldKey = key as FieldDefinition['key']

    const config = mapPropsToForms[fieldKey]

    if (!config) return result

    if (isArray(config)) {
      config.forEach((item) => {
        result.push({ key: fieldKey, config: item })
      })
    }
    else {
      result.push({ key: fieldKey, config })
    }

    return result
  }, [])
})

const handleFieldChange = (key: keyof AllComponentProps, value: any) => {
  emit('change', key, value)
}
</script>

<style>
.props-table {
  & .prop-item {
    display: flex;
    margin-bottom: 10px;
    align-items: center;
  }
  & .label {
    width: 28%;
  }
  & .prop-component {
    width: 70%;
  }
}
</style>
