<template>
  <div class="create-component-list">
    <div
      v-for="(item, index) in list"
      :key="index"
      class="component-item"
      @click="() => $emit('onItemClick', item)"
    >
      <LText v-bind="item" />
    </div>
  </div>
</template>
<script setup lang="ts">
import LText from '@/components/LText.vue'

defineProps<{ list: any[] }>()

defineEmits<{
  (e: 'onItemClick', item: any): void
}>()
</script>

<style scoped>
.component-item {
  width: 100px;
  margin: 0 auto 15px;
}
</style>
