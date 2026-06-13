<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit.prevent="handleLogin"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">
        用户登录
      </h1>

      <!-- email -->
      <div>
        <input
          v-model="formData.email"
          type="text"
          placeholder="输入邮箱地址"
          class="w-full rounded-lg p-3 text-sm border"
          :class="emailError ? 'border-red-500' : 'border-gray-200'"
        >
        <span v-if="emailError" class="mt-1 text-xs italic text-red-500">
          {{ emailError[0] }}
        </span>
      </div>

      <!-- password -->
      <div>
        <input
          v-model="formData.password"
          type="password"
          placeholder="输入密码"
          class="w-full rounded-lg p-3 text-sm border"
          :class="passwordError ? 'border-red-500' : 'border-gray-200'"
          autocomplete="current-password"
        >
        <span v-if="passwordError" class="mt-1 text-xs italic text-red-500">
          {{ passwordError[0] }}
        </span>
      </div>

      <button
        type="submit"
        class="w-full rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600"
      >
        登录
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { UserLoginType } from '#shared/validators/user'
// 关键：通过 definePageMeta 切换到 empty 布局
import { userLoginSchema } from '#shared/validators/user'
import { z } from 'zod'

definePageMeta({
  layout: 'empty',
  // 21-3 用不到，但顺带知道：可以给 layout 切换加过渡动画. 要让过渡生效还需在全局 CSS 写对应的 .layout-enter-active / .layout-leave-active 等类。本节不展开。
  // layoutTransition: { name: 'layout', mode: 'out-in' },
})

const formData = reactive<UserLoginType>({ email: '', password: '' })

const emailError = ref<string[]>()
const passwordError = ref<string[]>()

const handleLogin = async () => {
  const result = userLoginSchema.safeParse(formData)
  if (!result.success) {
    const tree = z.treeifyError(result.error)
    emailError.value = tree.properties?.email?.errors
    passwordError.value = tree.properties?.password?.errors
    return
  }
  emailError.value = undefined
  passwordError.value = undefined
  console.log('valid', result.data)

  try {
    const data = await $fetch('/api/users/login', {
      method: 'POST',
      body: formData,
    })
    console.log('登录成功', data)
  }
  catch (error) {
    console.error('登录失败', error)
  }
}
</script>
