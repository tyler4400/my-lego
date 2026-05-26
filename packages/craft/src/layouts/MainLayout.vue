<template>
  <div class="main-layout">
    <AppHeader />
    <main class="main-layout__content">
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import AppHeader from './AppHeader.vue'
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #fff;
}

.main-layout__content {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style>
