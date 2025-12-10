<template>
  <div class="props-table">
    <div
      v-for="(item, key) in finalProps"
      :key="key"
      class="prop-item"
    >
      <span v-if="item" class="label">{{ item?.label }}</span>
      <div class="prop-component">
        <component :is="item.component" v-if="item" :value="item.value" v-bind="item.extraProps">
          <template v-if="item.options">
            <component :is="item.subComponent" v-for="(option, subKey) in item.options" :key="subKey" :value="option.value">
              {{ option.label }}
            </component>
          </template>
        </component>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TextComponentProps } from '@/defaultProps.ts'
import type { PropsToForms } from '@/propsMap.ts'
import { reduce } from 'lodash-es'
import { computed } from 'vue'
import { mapPropsToForms } from '@/propsMap.ts'

const { compProps = {} } = defineProps<{ compProps?: Partial<TextComponentProps> }>()
const finalProps = computed<PropsToForms>(() => reduce(compProps, (result, val, key) => {
  const newKey = key as keyof TextComponentProps
  const item = mapPropsToForms[newKey]
  if (item) {
    // fixme 这里有bug，item.value = val会改变原对象mapPropsToForms
    item.value = item.transferVal?.(val) ?? val
    console.log('todo: 这里有bug，item.value = val会改变原对象mapPropsToForms', mapPropsToForms)
    result[newKey] = item
  }
  return result
}, {} as PropsToForms))
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
