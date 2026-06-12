<template>
  <!-- 极简布局：不渲染任何骨架，由 page 自己掌控全屏内容 -->
  <slot />
</template>
<!--
 这个文件可以更短 —— Nuxt 允许 layout 里只写一个 <slot />，连外层 <div> 都不需要。
  但如果你想给认证页统一加个背景（如渐变背景、品牌色），可以在外层包一个 <div class="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">。
  这里先保持极简，21-10 写注册页时再决定要不要加。
-->
