<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- 临时 Header 占位（21-17 会做正式的 GlobalHeader 组件） -->
    <header class="bg-gray-800 text-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">
          craft-admin
        </h1>
        <nav class="text-sm text-gray-300">
          <NuxtLink to="/" class="hover:text-white">
            首页
          </NuxtLink>
        </nav>
      </div>
    </header>

    <!-- 业务页面内容渲染在这里 -->
    <main class="flex-1 mx-auto w-full max-w-7xl p-4">
      <slot />
    </main>
  </div>
</template>
