<template>
  <div class="props-table">
    <div
      v-for="(item, key) in finalProps" :key="key"
      class="prop-item"
    >
      <span v-if="item" class="label">{{ item?.label }}</span>
      <div class="prop-component">
        <component
          :is="item.component" v-bind="item.extraProps" v-if="item"
          :[item.valueKey!]="item.value" v-on="item.events"
        >
          <template v-if="item.options">
            <component
              :is="item.subComponent" v-for="(option, subKey) in item.options"
              :key="subKey" :value="option.value"
            >
              <RenderVnode :node="option.label" />
              <!--              RenderVnode也可以换成component.is，只不过如果option.label不能是纯字符串 -->
              <!--              <component :is="option.label" /> -->
            </component>
          </template>
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component, VNode } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { reduce } from 'lodash-es'
import { computed } from 'vue'
import { mapPropsToForms } from '@/propsMap.tsx'
import RenderVnode from '@/utils/RenderVnode.ts'

export interface FormProps {
  value?: string
  component: Component
  subComponent?: Component // 组件可能有子组件，例如Select - SelectOption。 后面重构的时候应该会被vnode替换掉
  options?: { label: string | VNode, value: string }[] // 有的组件是选项
  extraProps?: Record<string, any> // 组件额外参数
  label?: string // 表单项名称
  transferVal?: (val?: string) => any // 将value转换为组件的数据格式
  parseVal?: (val?: any) => any // 将组件值转换为表单数据格式

  /* 数据流 */
  valueKey?: string // 有的组件状态可能不叫 'value'， 例如CheckBox的状态是checked 所以新加此字段来指定value的名称. 默认value
  events?: Record<string, (e: any) => void>
}

const { compProps = {} } = defineProps<{ compProps?: Partial<TextComponentProps> }>()

const emit = defineEmits<{ change: [key: string, value: any] }>()

const propsToFormsMap = mapPropsToForms()

const finalProps = computed<Record<string, FormProps>>(() => reduce(compProps, (result, val, key) => {
  const newKey = key as keyof TextComponentProps
  const item = propsToFormsMap[newKey]
  if (item) {
    const { valueKey = 'value', eventName = 'change', parseVal, transferVal, ...other } = item

    const newItem: FormProps = {
      ...other,
      value: transferVal?.(val) ?? val,
      valueKey,
      events: {
        [eventName]: (e: any) => {
          const newVal = parseVal?.(e) ?? e
          emit('change', newKey, newVal)
        },
      },
    }
    result[newKey] = newItem
  }
  return result
}, {} as Record<string, FormProps>))
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
