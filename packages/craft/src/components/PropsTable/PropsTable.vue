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
    <Collapse defaultActiveKey="border">
      <CollapsePanel
        v-for="group in groups"
        :key="group.groupKey"
        :header="group.text"
      >
        <RenderPropField
          v-for="field in group.items"
          :key="`${currentElementId}: ${field.key}`"
          :fieldKey="field.key"
          :config="field.config"
          :compProps="compProps"
          @change="handleFieldChange"
        />
      </CollapsePanel>
    </Collapse>
  </div>
</template>

<script setup lang="ts">
import type { FieldConfig, GroupKey } from './propsMap.tsx'
import type { AllComponentProps, CompFieldKey } from '@/defaultProps.ts'
import { isArray } from '@my-lego/shared'
import { Collapse, CollapsePanel } from 'ant-design-vue'
import { computed } from 'vue'
import RenderPropField from '@/components/PropsTable/RenderPropField.tsx'
import { mapPropsToForms } from './propsMap.tsx'

const { compProps = {}, currentElementId = '' } = defineProps<{
  compProps?: Partial<AllComponentProps>
  currentElementId?: string
}>()

const emit = defineEmits<{ change: [key: CompFieldKey, value: any] }>()

interface FieldDefinition {
  key: CompFieldKey
  config: FieldConfig
}

interface Group {
  groupKey: GroupKey
  text: string
  items: FieldDefinition[]
}

const getPresetGroups: () => Group[] = () => [
  { groupKey: 'content', text: '基本属性', items: [] },
  { groupKey: 'size', text: '尺寸', items: [] },
  { groupKey: 'border', text: '边框', items: [] },
  { groupKey: 'shadowAndOpacity', text: '阴影与透明度', items: [] },
  { groupKey: 'position', text: '位置', items: [] },
  { groupKey: 'action', text: '事件功能', items: [] },
]

const groups = computed<Group[]>(() => {
  console.log('PropTable渲染了: ', compProps)
  return Object.keys(compProps).reduce<Group[]>((result, key) => {
    const fieldKey = key as FieldDefinition['key']

    const config = mapPropsToForms[fieldKey]

    if (!config) return result

    if (isArray(config)) {
      config.forEach((item) => {
        const groupKey = item.groupKey ?? 'content'
        const group = result.find(g => g.groupKey === groupKey)
        if (group) group.items.push({ key: fieldKey, config: item })
      })
    }
    else {
      const groupKey = config.groupKey ?? 'content'
      const group = result.find(item => item.groupKey === groupKey)
      if (group) group.items.push({ key: fieldKey, config })
    }

    return result
  }, getPresetGroups())
})

const handleFieldChange = (key: CompFieldKey, value: any) => {
  emit('change', key, value)
}
</script>

<style>
.props-table {
  /* 这些样式在RenderPropField.tsx中会用到 */
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
