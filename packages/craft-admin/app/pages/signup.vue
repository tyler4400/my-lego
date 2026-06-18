<!-- packages/craft-admin/app/pages/signup.vue -->
<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="handleSignup"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">
        注册成为会员
      </h1>
      <p class="text-center text-sm text-gray-500">
        输入以下信息完成注册
      </p>

      <ValidateInput name="email" placeholder="输入电子邮箱地址" />
      <ValidateInput name="password" type="password" placeholder="输入密码" />
      <ValidateInput name="confirmPwd" type="password" placeholder="再次输入密码" />

      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500">
          已经有账户了？
          <NuxtLink to="/login" class="underline">
            登录
          </NuxtLink>
        </p>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-75"
        >
          {{ isSubmitting ? '读取中...' : '注册' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { userSignupSchema } from '#shared/validators/user'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

definePageMeta({ layout: 'empty' })

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(userSignupSchema),
  // validateOnMount: true,
})

const handleSignup = handleSubmit(async (values) => {
  // values 强类型 { email; password; confirmPwd }
  console.log('signup values', values)
  // 21-11 接后端 /api/users/signup
})
</script>
