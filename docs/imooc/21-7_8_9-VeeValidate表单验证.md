# 21-7_8_9 VeeValidate 表单验证

> 课程：慕课实战《真实高质量低代码商业项目》第 21 章 · 第 7、8、9 节合并
> 课程项目（Nuxt 3 + vee-validate@4.12）：`/Users/tylerzzheng/projects/lego-fork/lego-admin`
> 我的真实项目（Nuxt 4 + vee-validate@4.15 + monorepo）：`packages/craft-admin/`
> 差异标注：`⚠️ Nuxt 4 差异` / `⚠️ 依赖版本差异` / `⚠️ Monorepo 差异`。

---

## 1. 概述

21-5/21-6 用 `reactive` + Zod 跑通了校验。但字段一多，手动给每个字段挂 ref + 写错误 binding + 写动态 class 会让 page 越写越乱。本节三个视频是一次完整的「**表单层重构**」：

- **21-7**：引入 [VeeValidate](https://vee-validate.logaretm.com/v4/) 的 `useForm` + `defineField`，先用手写正则当 rule，让"中枢神经"跑起来。
- **21-8**：用 `toTypedSchema(userLoginSchema)` 把 Zod schema 接进 `useForm`；完成 `handleSubmit` 包裹 + `errors` + `meta` + `isSubmitting`。
- **21-9**：把 input 抽成全局组件 `ValidateInput`，组件内用 `useField(() => props.name)` 与外层 `useForm` 联动；处理 blur 不触发校验的细节。

**演进路径**：
`(21-5/6) reactive + safeParse` → `(21-7) useForm + 手写 rule` → `(21-8) useForm + Zod` → `(21-9) useField + 抽组件`

> 🧭 craft-admin 全程**不引入 HyperUI**，手写简洁表单（见 21-2 的决定），直到 21-16 引入 Nuxt UI。

### 本节产出

1. 装 `@vee-validate/nuxt` + `vee-validate` + `@vee-validate/zod`，在 `nuxt.config.ts` 注册模块
2. 改造 `app/pages/login.vue`：`useForm` + `toTypedSchema(userLoginSchema)` + `handleSubmit` + `isSubmitting`
3. 新建 `app/components/ValidateInput.vue` 全局组件（基于 `useField`）
4. `login.vue` 最终瘦身到只声明 schema、提交逻辑、两个 `<ValidateInput>`

---

## 2. 知识点 + 演示复盘

### 2.1 为什么选 VeeValidate

| 方案                  | 代表           | 痛点                                                |
| --------------------- | -------------- | --------------------------------------------------- |
| **组件式**            | Ant Design Form、ElForm | 强耦合框架；自定义样式/属性不方便；换框架要重学    |
| **Composition API 式** | VeeValidate、react-hook-form | 灵活、与 UI 解耦、与 Zod 等校验库正交         |

VeeValidate 选 **Composition API 式**：你完全控制 template / class / 事件，VeeValidate 只管"中枢神经"（字段值、校验状态、错误、提交流程）。

### 2.2 安装与注册

> ⚠️ 依赖版本差异（craft-admin 用 Nuxt 模块）
>
> - 课程：`npm install vee-validate @vee-validate/zod`，再手动 `import { useForm } from 'vee-validate'`。
> - craft-admin：用官方 [`@vee-validate/nuxt`](https://nuxt.com/modules/vee-validate) 模块（自动导入组件、检测 zod 并暴露 `toTypedSchema`）。

```bash
pnpm --filter @my-lego/craft-admin add @vee-validate/nuxt vee-validate @vee-validate/zod
```

在 `nuxt.config.ts` 的 `modules` 注册（craft-admin 实际配置，给组件改了带 `Vee` 前缀的名，避免与未来其它库的 `Form`/`Field` 自动导入冲突）：

```ts
// packages/craft-admin/nuxt.config.ts（节选，其余 css/vite/alias 保持不变）
export default defineNuxtConfig({
  modules: [
    ['@vee-validate/nuxt', {
      autoImports: true,
      componentNames: {
        Form: 'VeeForm',
        Field: 'VeeField',
        ErrorMessage: 'VeeErrorMessage',
      },
    }],
  ],
})
```

> 💡 我们用的是 **Composition API 式**（`useForm`/`useField`），其实用不到 `<VeeForm>`/`<VeeField>` 这些组件。`componentNames` 重命名只是预防性配置，留着无害。

> ⚠️ Nuxt 4 差异
>
> - `@vee-validate/nuxt@4.15` 的 peerDependencies 标的是 `nuxt ^3.13`，但**实测可用于 Nuxt 4**。`pnpm install` 可能给 peer 警告，运行无碍；要消警告可在根 `package.json` 配 `pnpm.peerDependencyRules.allowedVersions`。
> - 模块开了 `autoImports` 后，`useForm` / `useField` 等理论上可以不写 import。但 craft-admin 的 `login.vue` 仍**显式 `import { useForm } from 'vee-validate'`** —— 更利于 IDE 跳转和类型，两种方式都行。

### 2.3 21-7 第一阶段：`useForm` + `defineField` + 手写 rule

> 💡 这是过渡阶段，21-8 接 Zod 后会被替换。craft-admin 可以**直接跳到 21-8**，这里仅帮助理解 VeeValidate 机制。

```vue
<!-- 21-7 过渡版（理解用，template 在前）-->
<template>
  <pre>values: {{ values }}</pre>
  <pre>errors: {{ errors }}</pre>

  <form @submit.prevent>
    <input v-model="email" v-bind="emailAttrs" type="text" placeholder="email">
    <input v-model="password" v-bind="passwordAttrs" type="password" placeholder="password">
  </form>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'empty' })

const { defineField, values, errors } = useForm({
  validationSchema: {
    // 手写正则当 rule（21-8 换成 Zod schema）
    email: (value: string) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return regex.test(value) ? true : 'Invalid email'
    },
  },
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password', {
  validateOnModelUpdate: false, // 改成 blur 时校验
})
</script>
```

**关键 API（21-7）**：

- `useForm({ validationSchema })` —— 创建表单。`validationSchema` 可是手写对象，也可是 Zod / Yup schema（21-8 接入）。
- `defineField(name, options?)` —— 返回 `[fieldValue, fieldAttrs]`：`fieldValue` 用 `v-model` 绑 input；`fieldAttrs` 用 `v-bind` 绑（含 blur/input 事件，VeeValidate 据此触发校验）。
- `values` / `errors` —— 全表单响应式快照 / 错误对象（`errors.email` 是字符串）。
- `validateOnModelUpdate: false` —— 从"输入即校验"改为"blur 才校验"。

### 2.4 21-8 第二阶段：接 Zod + `handleSubmit` + `isSubmitting`

把手写 rule 换成 21-5 在 `shared/` 里定义的 `userLoginSchema`。

```vue
<!-- 21-8 阶段（template 在前）-->
<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="handleLogin"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">用户登录</h1>

      <div>
        <input
          v-model="email"
          v-bind="emailAttrs"
          type="text"
          placeholder="输入邮箱地址"
          class="w-full rounded-lg p-3 text-sm border"
          :class="errors.email ? 'border-red-500' : 'border-gray-200'"
        >
        <span v-if="errors.email" class="mt-1 text-xs italic text-red-500">{{ errors.email }}</span>
      </div>

      <div>
        <input
          v-model="password"
          v-bind="passwordAttrs"
          type="password"
          placeholder="输入密码"
          class="w-full rounded-lg p-3 text-sm border"
          :class="errors.password ? 'border-red-500' : 'border-gray-200'"
        >
        <span v-if="errors.password" class="mt-1 text-xs italic text-red-500">{{ errors.password }}</span>
      </div>

      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {{ isSubmitting ? 'Loading...' : '登录' }}
      </button>

      <pre class="text-xs text-gray-400">meta: {{ meta }}</pre>
    </form>
  </div>
</template>

<script setup lang="ts">
import { userLoginSchema } from '#shared/validators/user'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

definePageMeta({ layout: 'empty' })

const { defineField, values, errors, handleSubmit, isSubmitting, meta } = useForm({
  validationSchema: toTypedSchema(userLoginSchema),
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

// handleSubmit 包裹提交逻辑：校验通过后才会调到回调
const handleLogin = handleSubmit(async () => {
  // values 已是强类型 { email: string; password: string }（toTypedSchema 推断）
  try {
    const data = await $fetch('/api/users/login', { method: 'POST', body: values })
    console.log('登录成功', data)
  }
  catch (error) {
    console.error('登录失败', error)
  }
})
</script>
```

要点：

- `form` 上的 `@submit` 直接绑 `handleLogin`，**不要写 `@submit.prevent`** —— `handleSubmit` 内部已 preventDefault。
- 回调里**不用手写 safeParse**，VeeValidate 已校验。
- `handleSubmit(async () => {...})` 回调可以接 `values` 参数，也可以像 craft-admin 这样直接引用外层解构出的 `values`（两种等价）。
- `isSubmitting` 异步提交期间为 `true`，绑到按钮 `:disabled` 防重复点击 + `disabled:opacity-75`。

> ⚠️ Nuxt 4 / Monorepo 差异
>
> - schema：`import { userLoginSchema } from '#shared/validators/user'`（Nuxt 4 项目级 `shared/`，见 21-5）。
> - `import { toTypedSchema } from '@vee-validate/zod'`；`import { useForm } from 'vee-validate'`（显式 import）。
> - page 在 `app/pages/login.vue`，布局 `empty`，块顺序 template→script。

`meta` 含整体表单状态（`valid` / `dirty` / `touched` / `pending` / `initialValues`），调试时 `<pre>{{ meta }}</pre>` 很直观。

### 2.5 21-9 第三阶段：抽 `ValidateInput` 全局组件

两个 input 高度重复，抽成组件。

```vue
<!-- packages/craft-admin/app/components/ValidateInput.vue（template 在前）-->
<template>
  <div>
    <input
      v-model="value"
      :type="type"
      :placeholder="placeholder"
      class="w-full rounded-lg p-3 text-sm border"
      :class="errorMessage ? 'border-red-500' : 'border-gray-200'"
      @blur="handleChange"
    >
    <span v-if="errorMessage" class="mt-1 text-xs italic text-red-500">{{ errorMessage }}</span>

    <!-- 调试时可打开看单字段 meta -->
    <!-- <pre class="text-xs">{{ meta }}</pre> -->
  </div>
</template>

<script setup lang="ts">
interface InputProps {
  name: string
  placeholder?: string
  type?: string
}

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  placeholder: '',
})

// useField 靠 Vue 的 provide / inject 与外层 useForm 共享同一个表单上下文（拿到 schema、值、错误等）
// meta 暂未使用，保留并禁用 lint 提示
// eslint-disable-next-line unused-imports/no-unused-vars
const { value, errorMessage, handleChange, meta } = useField(() => props.name)
</script>
```

**关键 API**：

- `useField(() => props.name)` —— **必须用回调返回 name**（不能直接传字符串），这样 `props.name` 变化时 useField 才取到最新值。
- `value` —— 字段值，`v-model` 绑 input。
- `errorMessage` —— 单字段错误（v4 是 string | undefined）。
- `handleChange` —— 手动触发校验（见下面 blur 细节）。
- `meta` —— 单字段状态（touched/dirty/valid/pending）。

> ⚠️ **blur 不触发校验的细节**
> useField 默认在"值变化"时校验。但初次进入页面 input 是空的，blur 离开时值还是空 → 值没变 → 不触发。
> 解决：input 上手动绑 `@blur="handleChange"` 主动触发。

#### 重写 `login.vue`（最终版，对齐 craft-admin 实际代码）

```vue
<!-- packages/craft-admin/app/pages/login.vue（21-9 最终版）-->
<template>
  <div class="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="handleLogin"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">用户登录</h1>

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
import { userLoginSchema } from '#shared/validators/user'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'

definePageMeta({ layout: 'empty' })

const { values, handleSubmit, isSubmitting, meta } = useForm({
  validationSchema: toTypedSchema(userLoginSchema),
})

const handleLogin = handleSubmit(async () => {
  console.log('valid', values)
  try {
    const data = await $fetch('/api/users/login', { method: 'POST', body: values })
    console.log('登录成功', data)
  }
  catch (error) {
    console.error('登录失败', error)
  }
})
</script>
```

> 💡 craft-admin 实际代码里 button 暂未加 `:disabled="isSubmitting"`，只用它切换文案。**建议加上** `:disabled="isSubmitting"` + `disabled:opacity-75` 防重复提交（21-8 示例里有，按需补）。
>
> 最终 page 从 21-5 的 ~80 行瘦到 ~30 行。加字段只需多一行 `<ValidateInput name="xxx" />` + 在 Zod schema 添字段。21-10 注册页直接复用。

> ⚠️ Nuxt 4 差异
> 课程 `components/ValidateInput.vue` 在项目根；craft-admin 在 **`app/components/ValidateInput.vue`**，Nuxt 自动注册为全局组件（`<ValidateInput>` 直接用）。**新建 `app/components/` 目录后重启 dev server。**

### 2.6 21-9 末尾预告

注册页（21-10）与登录极相似（多 confirmPwd 字段）。`ValidateInput` + Zod schema + useForm 脚手架已就绪，写注册基本是复制 + 改字段。

---

## 3. 三维差异速查表

### 3.1 Nuxt 3 → Nuxt 4 差异

| 项目                        | 课程（Nuxt 3）              | craft-admin（Nuxt 4）                  |
| --------------------------- | --------------------------- | -------------------------------------- |
| `login.vue` 位置             | `pages/login.vue`            | `app/pages/login.vue`                   |
| `ValidateInput.vue` 位置     | `components/ValidateInput.vue` | `app/components/ValidateInput.vue`      |
| 布局                         | `custom`                     | `empty`                                |
| schema 来源                  | `~/validators/user`          | `#shared/validators/user`              |
| 安装方式                     | `npm install` + 手动 import  | `@vee-validate/nuxt` 模块（auto-import） |
| Vue 文件块顺序               | 随意                         | eslint 强制 `template → script`         |

### 3.2 依赖版本差异

| 维度                 | 课程 vee-validate@4.12       | craft-admin vee-validate@4.15                          |
| -------------------- | ----------------------------- | ------------------------------------------------------- |
| 核心 API             | 一致（4.x 无破坏性变更）       | 一致                                                    |
| Nuxt 模块            | 未用                          | `@vee-validate/nuxt`（componentNames 重命名为 Vee*）    |
| `errors.email`       | 字符串                        | 字符串（一致）                                          |
| Zod 适配             | `@vee-validate/zod` + `toTypedSchema` | 同上                                            |
| 兼容 zod v4          | 课程 zod 只有 v3              | **`@vee-validate/zod@4.15+` 兼容 zod v4**（必须 ≥4.15） |

### 3.3 Monorepo / shared 差异

| 维度                 | 单仓项目                       | craft-admin                                                          |
| -------------------- | ------------------------------ | -------------------------------------------------------------------- |
| Schema 来源          | `~/validators/user`            | `#shared/validators/user`（与 server 端用同一份，见 21-5）            |
| `ValidateInput` 复用 | admin 项目内                    | 暂放 `app/components/`；它依赖 vee-validate 上下文 + Tailwind，耦合度高，先不上升到 `@my-lego/shared` |

---

## 4. 易错点 + 关键 API 速查

### 4.1 易错点 Checklist

1. **`useField` 必须传回调**：`useField(() => props.name)`，传字符串会失去响应式。
2. **`form` 上别写 `@submit.prevent`**：`handleSubmit` 已 preventDefault。
3. **`errors.email` / `errorMessage` 在 v4 是 string**，不是数组。课程老写法 `errors.email[0]` 在 v4 会取到字符串首字符。
4. **blur 不校验**：useField 监听值变化，空进空出不触发，需 `@blur="handleChange"`。
5. **新建 `app/components/` 后重启 dev server**。
6. **`@vee-validate/zod` 要 ≥ 4.15** 才兼容 zod v4，否则 `toTypedSchema is not a function`。
7. **`name` 必须等于 schema 的 key**：`<ValidateInput name="email">` 对应 schema 的 `email`，否则错误绑不上、提交时该字段 undefined。
8. **别忘 `toTypedSchema`**：直接传 Zod schema 也能跑（duck typing），但**丢类型推断**，`handleSubmit` 回调里 `values` 会是 `any`，浪费了 monorepo 的强类型红利。
9. **`@vee-validate/nuxt` 的 peer 警告**：对 Nuxt 4 标 `peer ^3.13`，警告无碍。

### 4.2 关键 API 速查

| API                                | 作用                                | 调用位置               |
| ---------------------------------- | ----------------------------------- | ---------------------- |
| `useForm({ validationSchema })`    | 创建表单中枢                        | page `<script setup>`  |
| `defineField(name, options?)`      | page 中挂字段，返回 `[value, attrs]` | useForm 内            |
| `useField(() => name)`             | 子组件中挂字段                       | 子组件 `<script setup>` |
| `handleSubmit(cb)`                 | 包裹提交，校验通过才执行            | useForm 内            |
| `errors.field` / `errorMessage`    | 错误（**字符串**）                  | template / setup      |
| `values`                           | 全表单值快照                        | useForm 返回          |
| `meta`（form / field 级）           | touched/dirty/valid/pending         | useForm / useField    |
| `isSubmitting` / `isValidating`    | 异步提交 / 校验中                   | useForm 返回          |
| `setFieldValue` / `setFieldError`  | 编程式设值 / 设错（21-11 回填用）    | useForm 返回          |
| `resetForm()`                      | 重置表单                            | useForm 返回          |
| `toTypedSchema(zodSchema)`         | Zod → vee-validate 接口 + 类型推断   | from `@vee-validate/zod` |
| `@blur="handleChange"` (useField)  | 手动触发单字段校验                  | template 事件          |

### 4.3 与课程相比，本节**改写**了什么

- 安装：`@vee-validate/nuxt` 模块（含 componentNames 重命名）替代手动 import
- schema 来源：`#shared/validators/user`（沿用 21-5 的 Nuxt 4 shared 决策）
- 布局：`empty`（课程 `custom`）
- 错误：`errors.email`（v4 字符串，非 v3 数组）
- 所有 Vue 文件 template 在前（eslint block-order）
- 不引入 HyperUI，手写表单

---

## 5. 本节产出 checklist（动手时对照）

### 5.1 21-7（可选过渡，可跳过直接 21-8）

- [ ] `pnpm --filter @my-lego/craft-admin add @vee-validate/nuxt vee-validate @vee-validate/zod`
- [ ] `nuxt.config.ts` 的 `modules` 加 `@vee-validate/nuxt`（带 componentNames）
- [ ] 重启 dev server
- [ ] （可选）用 `useForm` + `defineField` + 手写正则跑一遍，理解机制

### 5.2 21-8（接 Zod + 提交）

- [ ] `toTypedSchema(userLoginSchema)`（schema from `#shared/validators/user`）
- [ ] `useForm` 解构 `handleSubmit`、`isSubmitting`、`meta`
- [ ] `handleSubmit(async () => $fetch(...))` 包裹提交，`form @submit="handleLogin"`（无 `.prevent`）
- [ ] button 文案用 `isSubmitting`，建议补 `:disabled="isSubmitting"` + `disabled:opacity-75`
- [ ] 测试：空表单显示错误；合法值控制台 `登录成功`
- [ ] WebStorm 验证：`values` 类型是 `{ email: string; password: string }`

### 5.3 21-9（抽组件）

- [ ] 新建 `packages/craft-admin/app/components/ValidateInput.vue`（`useField(() => props.name)` + `@blur="handleChange"`，template 在前）
- [ ] **重启 dev server**
- [ ] `login.vue` 换成 `<ValidateInput name="email" />` `<ValidateInput name="password" type="password" />`，删掉 defineField/errors 等
- [ ] 浏览器验证：blur 行为正常、错误实时更新、提交整体校验、按钮 loading
