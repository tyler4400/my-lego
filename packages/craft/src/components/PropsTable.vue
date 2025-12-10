<template>
  <div class="props-table">
    <div
      v-for="(item, key) in finalProps"
      :key="key"
      class="prop-item"
    >
      <component :is="item.component" v-if="item" :value="item.value" />
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
const finalProps = computed(() => reduce(compProps, (result, val, key) => {
  const newKey = key as keyof TextComponentProps
  const item = mapPropsToForms[newKey]
  if (item) {
    item.value = val
    result[newKey] = item
  }
  return result
}, {} as PropsToForms))
</script>

<style scoped>

</style>
