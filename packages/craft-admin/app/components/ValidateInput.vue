<template>
  <div>
    <input
      v-model="value"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-lg p-3 text-sm border"
      :class="errorMessage ? 'border-red-500' : 'border-gray-200'"
      @blur="handleChange"
    >
    <span v-if="errorMessage" class="mt-1 text-xs italic text-red-500">
      {{ errorMessage }}
    </span>

    <!-- 调试时可打开看单字段 meta -->
    <!-- <pre class="text-xs">{{ meta }}</pre> -->
  </div>
</template>

<script setup lang="ts">
interface InputProps {
  name: string
  placeholder?: string
  type?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  placeholder: '',
})

// useField靠 Vue 的 provide / inject 共享同一个 form 上下文对象，获得schema等信息
// eslint-disable-next-line unused-imports/no-unused-vars
const { value, errorMessage, handleChange, meta } = useField(() => props.name) // 必须用回调函数返回 name（不能直接传字符串），这样 props.name 变化时 useField 才能取到最新值。
</script>
