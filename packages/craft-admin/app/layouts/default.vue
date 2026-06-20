<template>
  <div class="min-h-screen flex flex-col">
    <GlobalHeader />

    <!-- 左右两栏：左侧定宽 Sidebar，右侧 flex-1 内容区 -->
    <div class="flex flex-1">
      <aside class="w-62.5 border-r border-gray-200 dark:border-gray-700 px-2 pt-3">
        <Sidebar />
      </aside>
      <main class="flex-1 bg-gray-50 dark:bg-gray-800 px-4 pt-5 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
</script>
