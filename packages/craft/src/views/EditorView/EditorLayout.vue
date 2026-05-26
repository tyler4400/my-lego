<template>
  <div class="editor-layout">
    <EditorHeader />
    <main class="editor-layout__content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import EditorHeader from './components/EditorHeader.vue'
</script>

<style scoped>
.editor-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f0f2f5;
}

.editor-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
