<!-- packages/craft-admin/app/pages/login.vue -->
<script setup lang="ts">
// 关键：通过 definePageMeta 切换到 empty 布局
definePageMeta({
  layout: 'empty',
  // 21-3 用不到，但顺带知道：可以给 layout 切换加过渡动画. 要让过渡生效还需在全局 CSS 写对应的 .layout-enter-active / .layout-leave-active 等类。本节不展开。
  layoutTransition: { name: 'layout', mode: 'out-in' },
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-emerald-50">
    <div class="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 class="text-center text-2xl font-bold text-gray-800">
        用户登录
      </h1>
      <p class="mt-2 text-center text-sm text-gray-500">
        这是极简认证布局，没有 Header
      </p>
      <!-- 21-9 / 21-10 才会真正写表单，先放占位 -->
    </div>
  </div>
</template>
