<template>
  <div
    class="edit-wrapper"
    :class="{ active }"
    @click="() => onItemClick(id)"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
export interface EditWrapperProps {
  active: boolean
  id: string
}

defineOptions({
  name: 'EditWrapper',
})

const { active, id } = defineProps<EditWrapperProps>()

const emit = defineEmits<{
  (e: 'setActive', id: string): void
}>()

function onItemClick(id: string) {
  emit('setActive', id)
}
</script>

<style scoped>
.edit-wrapper {
  padding: 0;
  cursor: pointer;
  border: 1px solid transparent;
  user-select: none;
}
.edit-wrapper:hover {
  border: 1px dashed #ccc;
}
.edit-wrapper.active {
  border: 1px solid #1890ff;
  user-select: none;
  z-index: 1500;
}
</style>
