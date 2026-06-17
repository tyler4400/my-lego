<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="handleLogin"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">
        用户登录
      </h1>

      <ValidateInput name="email" placeholder="输入邮箱地址" />
      <ValidateInput name="password" type="password" placeholder="输入密码" />

      <button
        type="submit"
        class="w-full rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600"
      >
        {{ isSubmitting ? 'Loading...' : '登录' }}
      </button>
    </form>
    <pre>{{ meta }}</pre>
  </div>
</template>

<script setup lang="ts">
// 关键：通过 definePageMeta 切换到 empty 布局
import { userLoginSchema } from '#shared/validators/user'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

definePageMeta({
  layout: 'empty',
  // 21-3 用不到，但顺带知道：可以给 layout 切换加过渡动画. 要让过渡生效还需在全局 CSS 写对应的 .layout-enter-active / .layout-leave-active 等类。本节不展开。
  // layoutTransition: { name: 'layout', mode: 'out-in' },
})

const { values, handleSubmit, isSubmitting, meta } = useForm({
  validationSchema: toTypedSchema(userLoginSchema),
  // initialValues: {}
})

// handleSubmit 包裹真正的提交逻辑：校验通过后才会调到回调
const handleLogin = handleSubmit(async () => {
  // values 已经是强类型 { email: string; password: string }（toTypedSchema 推断出来）
  console.log('valid', values)

  try {
    const data = await $fetch('/api/users/login', {
      method: 'POST',
      body: values,
    })
    console.log('登录成功', data)
  }
  catch (error) {
    console.error('登录失败', error)
  }
})
</script>
