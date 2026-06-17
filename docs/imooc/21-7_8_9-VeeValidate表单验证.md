# 21-7_8_9 VeeValidate 表单验证

> 课程：慕课实战《真实高质量低代码商业项目》第 21 章 · 第 7、8、9 节合并
> 课程项目（Nuxt 3 + vee-validate@4.12）：`/Users/tylerzzheng/projects/lego-fork/lego-admin`
> 我的真实项目（Nuxt 4 + vee-validate@4.15 + monorepo）：`packages/craft-admin/`
> 差异标注：`⚠️ Nuxt 4 差异` / `⚠️ 依赖版本差异` / `⚠️ Monorepo 差异`。

---

## 1. 概述

21-5/21-6 用 `reactive` form data + Zod 跑通了客户端 + 服务端校验。但讲师指出：**当表单字段变多（5+），手动给每个字段挂 ref + 写错误 binding + 写动态 class 会让 page 越写越乱**。本节三个视频是一次完整的「**表单层重构**」：

- **21-7**：引入 [VeeValidate](https://vee-validate.logaretm.com/v4/) 的 `useForm` + `defineField`，第一次接入。先用一段自己写的正则当 validation rule，先让"中枢神经"跑起来。
- **21-8**：装 `@vee-validate/zod`，用 `toTypedSchema(userLoginSchema)` 把 21-5 写好的 Zod schema 接进 useForm。完成 `handleSubmit` 包裹 + `errors` 对象 + `meta` 状态 + `isSubmitting` 按钮 disable + `disabled:opacity-75` Tailwind。
- **21-9**：把 input 抽象成全局组件 `ValidateInput`，每个组件内用 `useField(() => props.name)` 与外层 `useForm` 联动。处理 blur 时不触发校验的细节（手动绑 `@blur="handleChange"`）。

**整体演进路径**：
`(21-5/6) 手动 reactive + safeParse` → `(21-7) useForm + 手写 rules` → `(21-8) useForm + Zod` → `(21-9) useField + 抽组件`

### 本节产出

1. 安装 `vee-validate` + `@vee-validate/zod`（craft-admin 用 `@vee-validate/nuxt` 模块，自动导入）
2. 改造 `login.vue`：`useForm` + `toTypedSchema(userLoginSchema)` + `handleSubmit` + `isSubmitting`
3. 新建 `app/components/ValidateInput.vue` 全局组件（基于 `useField`）
4. `login.vue` 最终瘦身到只声明 schema、`handleSubmit` 提交逻辑、两个 `<ValidateInput>` 标签

---

## 2. 知识点 + 演示复盘

### 2.1 为什么选 VeeValidate

讲师对比了两类表单方案：

| 方案                  | 代表           | 痛点                                                |
| --------------------- | -------------- | --------------------------------------------------- |
| **组件式**            | Ant Design Form、ElForm | 强耦合框架；自定义样式/属性不方便；换框架要重学    |
| **Composition API 式** | VeeValidate、react-hook-form、formkit | 灵活、与 UI 框架解耦、与 Zod 等校验库正交 |

VeeValidate 选 **Composition API 式**：你完全控制 template / class / 事件，VeeValidate 只管"中枢神经"（每个字段的值、校验状态、错误信息、提交流程）。

### 2.2 安装

> ⚠️ 依赖版本差异（推荐用 Nuxt 模块）
>
> - 课程用 `npm install vee-validate @vee-validate/zod`，再手动 `import { useForm } from 'vee-validate'`。
> - craft-admin 推荐用官方 [`@vee-validate/nuxt`](https://nuxt.com/modules/vee-validate) 模块：自动导入 `useForm` / `useField` / `Form` / `Field` / `ErrorMessage` 组件，且自动检测 zod 并暴露 `toTypedSchema`。
>
> 两种方式都能用，**Nuxt 模块写法更简洁**，下面采用模块方式。

```bash
pnpm --filter @my-lego/craft-admin add @vee-validate/nuxt vee-validate @vee-validate/zod
```

> 💡 三个包都装：
>
> - `@vee-validate/nuxt` —— Nuxt 模块（auto-import + zod 集成）
> - `vee-validate` —— 核心库（被模块依赖，但显式装一份避免版本漂移）
> - `@vee-validate/zod` —— Zod 适配器，提供 `toTypedSchema`

#### 修改 `nuxt.config.ts` 注册模块

```ts
// packages/craft-admin/nuxt.config.ts
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3003 },

  modules: ['@vee-validate/nuxt'],   // ← 新增

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  alias: {
    '@my-lego/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
  },
})
```

可选配置（如想避免 Form/Field 组件自动导入冲突，把它们重命名）：

```ts
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
```

> ⚠️ Nuxt 4 差异
>
> - `@vee-validate/nuxt` 当前版本 `4.15.x` 在 peerDependencies 标的是 `nuxt ^3.13.2`，但**实测可用于 Nuxt 4**（官方已确认兼容，新版本 peer 会更新）。如果 `pnpm install` 警告 peer 不匹配，加 `package.json` 的 `pnpm.peerDependencyRules.allowedVersions` 忽略即可，运行时无问题。
> - Nuxt 4 自动 import 会把 `vee-validate` 的 composables 注入 `app/` 下的 `<script setup>`，不需要手写 import。

### 2.3 21-7 第一阶段：`useForm` + `defineField` + 手写 rule

> 💡 这一阶段是讲师特意为了让你理解"VeeValidate 是怎么运作的"做的过渡，**21-8 接入 Zod 后这段代码会被彻底替换**。这里给出对应代码但不建议长时间保留。

```vue
<!-- packages/craft-admin/app/pages/login.vue（21-7 阶段过渡版）-->
<script setup lang="ts">
definePageMeta({ layout: 'auth' })

// useForm 是整个表单的"中枢神经"
const { defineField, values, errors } = useForm({
  validationSchema: {
    // 手写正则当 rule（21-8 会换成 Zod schema）
    email: (value: string) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return regex.test(value) ? true : 'Invalid email'
    },
  },
})

// 把字段挂到 form 上，拿到响应式 value 和 attrs（含 blur/input 事件等）
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password', {
  // 改成 blur 时校验，而不是 v-model 更新时校验
  validateOnModelUpdate: false,
})
</script>

<template>
  <pre>values: {{ values }}</pre>
  <pre>errors: {{ errors }}</pre>

  <form @submit.prevent>
    <input v-model="email" v-bind="emailAttrs" type="text" placeholder="email">
    <input v-model="password" v-bind="passwordAttrs" type="password" placeholder="password">
  </form>
</template>
```

**关键 API（21-7 阶段）**：

- `useForm({ validationSchema })` —— 创建表单。`validationSchema` 可以是手写对象（每个 key 一个 rule 函数），也可以是 Zod / Yup 的 schema（21-8 接入）。
- `defineField(name, options?)` —— 把字段挂到表单上。返回 `[fieldValue, fieldAttrs]`：
  - `fieldValue` —— 响应式 ref，用 `v-model` 绑定到 input。
  - `fieldAttrs` —— 一组属性对象（含 `onBlur` / `onInput` 等事件），用 `v-bind="emailAttrs"` 绑到 input，VeeValidate 用它在合适时机触发校验。
- `values` —— 全表单的响应式快照对象。
- `errors` —— 错误对象，结构 `{ [fieldName]: string | undefined }`，**每个字段只取第一条错误**（这是 v3 写法 `[0]` 与 v4 一行字符串的区别之一）。
- `validateOnModelUpdate: false` —— 默认 input 输入时即时校验；设为 false 后改为只在 blur 时校验。

### 2.4 21-8 第二阶段：接 Zod + `handleSubmit` + `isSubmitting`

把 21-7 那段手写 rule 替换掉，用 21-5 在 shared 里定义的 `userLoginSchema`。

```vue
<!-- packages/craft-admin/app/pages/login.vue（21-8 阶段）-->
<script setup lang="ts">
import { userLoginSchema } from '@my-lego/shared'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({ layout: 'auth' })

const { defineField, errors, handleSubmit, isSubmitting, meta } = useForm({
  // 接入 Zod schema
  validationSchema: toTypedSchema(userLoginSchema),
})

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

// handleSubmit 包裹真正的提交逻辑：校验通过后才会调到回调
const onLogin = handleSubmit(async (values) => {
  // values 已经是强类型 { email: string; password: string }（toTypedSchema 推断出来）
  try {
    const data = await $fetch('/api/users/login', {
      method: 'POST',
      body: values,
    })
    console.log('login ok:', data)
  } catch (err: any) {
    console.error('login fail:', err.data)
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="onLogin"
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
        <span v-if="errors.email" class="mt-1 text-xs italic text-red-500">
          {{ errors.email }}
        </span>
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
        <span v-if="errors.password" class="mt-1 text-xs italic text-red-500">
          {{ errors.password }}
        </span>
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
```

#### `handleSubmit` 的工作流

```text
用户点击 submit
    ↓
VeeValidate 自动跑一遍所有字段的校验
    ↓
校验失败 → 直接更新 errors 对象，回调不调用
校验成功 → 调用回调，values 作为参数传入
```

注意：

- `form` 上的 `@submit` 直接绑 `onLogin`（**不要再写 `@submit.prevent`**）—— `handleSubmit` 内部已经处理了 `preventDefault`。
- 回调里**不再需要手写 safeParse**，VeeValidate 已经校验过。

#### `isSubmitting` 的作用

异步提交期间自动 `true`，回调 resolve 后变 `false`。绑到按钮 `:disabled` 防止重复点击。可以用 Tailwind 的 `disabled:opacity-75` 改变视觉状态。

> 💡 课程为了演示 `isSubmitting`，在回调里手动 `await new Promise(r => setTimeout(r, 2000))` 模拟 2 秒延时。真实项目里 `$fetch` 已经是异步的，不用加。

#### `meta` 对象

`useForm` 返回的 `meta` 包含整体表单状态：

| 字段           | 含义                       |
| -------------- | -------------------------- |
| `initialValues` | 初始值                     |
| `touched`       | 哪些字段被 focus 过        |
| `pending`       | 哪些字段正在异步校验       |
| `valid`         | 整个表单是否合法           |
| `dirty`         | 哪些字段被改过             |

`useForm` 还返回**单字段级**的状态对象（21-9 在 ValidateInput 内用）。

### 2.5 21-9 第三阶段：抽 `ValidateInput` 全局组件

讲师指出：21-8 完成后，两个 input 的代码高度重复（v-model、v-bind、动态 class、错误 span）—— 字段一多就更复杂。抽成组件。

#### 新建 `app/components/ValidateInput.vue`

```vue
<!-- packages/craft-admin/app/components/ValidateInput.vue -->
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

// useField 用回调函数返回 name，保证 props.name 变化时响应式跟随
const { value, errorMessage, handleChange, meta } = useField(() => props.name)
</script>

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
    <span v-if="errorMessage" class="mt-1 text-xs italic text-red-500">
      {{ errorMessage }}
    </span>

    <!-- 调试时可打开看单字段 meta -->
    <!-- <pre class="text-xs">{{ meta }}</pre> -->
  </div>
</template>
```

**关键 API**：

- `useField(() => props.name)` —— 单字段版的"中枢神经接入"。**必须用回调函数返回 name**（不能直接传字符串），这样 `props.name` 变化时 useField 才能取到最新值。
- `value` —— 字段值，`v-model` 绑到 input。
- `errorMessage` —— 单字段错误（v3 是字符串数组取第一条，v4 直接是字符串或 undefined）。
- `handleChange` —— **手动触发校验**的函数。看下面"blur 时校验不出"的细节。
- `meta` —— 单字段状态（touched / dirty / valid / pending），用法同 useForm 的 meta，只是范围缩到单字段。

> ⚠️ **关键细节：blur 时校验不触发的问题**
>
> useField 默认在 `v-model` 更新（值变化）时触发校验。但**初次进入页面 input 是空的，blur 离开时值还是空的 → 值没变 → 校验不触发**。视频里讲师演示了这个 bug。
>
> 解决：在 input 上手动绑 `@blur="handleChange"` 主动触发一次。
>
> 这与 21-7 的 `defineField('password', { validateOnModelUpdate: false })` 概念上是同一类问题，但 useField 和 defineField 解决方式不同。

#### 重写 `login.vue`（最终版）

```vue
<!-- packages/craft-admin/app/pages/login.vue（21-9 阶段，最终版）-->
<script setup lang="ts">
import { userLoginSchema } from '@my-lego/shared'
import { toTypedSchema } from '@vee-validate/zod'

definePageMeta({ layout: 'auth' })

const { handleSubmit, isSubmitting } = useForm({
  validationSchema: toTypedSchema(userLoginSchema),
})

const onLogin = handleSubmit(async (values) => {
  try {
    const data = await $fetch('/api/users/login', {
      method: 'POST',
      body: values,
    })
    console.log('login ok:', data)
  } catch (err: any) {
    console.error('login fail:', err.data)
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
    <form
      class="w-full max-w-md space-y-5 rounded-xl bg-white p-8 shadow"
      @submit="onLogin"
    >
      <h1 class="text-center text-2xl font-bold text-gray-800">用户登录</h1>

      <ValidateInput name="email" placeholder="输入邮箱地址" />
      <ValidateInput name="password" type="password" placeholder="输入密码" />

      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full rounded-lg bg-blue-500 px-5 py-3 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-75 disabled:cursor-not-allowed"
      >
        {{ isSubmitting ? 'Loading...' : '登录' }}
      </button>
    </form>
  </div>
</template>
```

**最终 page 代码量**：从 21-5 的 ~80 行 → 21-9 的 ~30 行。增加任意字段只需多一行 `<ValidateInput name="xxx" />` + 在 Zod schema 添字段。21-10 注册页能直接复用。

> ⚠️ Nuxt 4 差异
>
> - 课程的 `components/ValidateInput.vue` 在项目根；craft-admin 在 **`app/components/ValidateInput.vue`**。
> - Nuxt 自动导入约定：`app/components/` 下的 `.vue` 文件自动注册为全局组件。**新建 `app/components/` 目录后必须重启 dev server。**

### 2.6 21-9 末尾的预告

讲师在视频末提到：注册页和登录页极度相似（多一个 confirmPwd 字段），21-10 让你独立完成注册页作为练习。`ValidateInput` 组件 + Zod schema + useForm 已经把脚手架打好，写注册基本是复制 + 改字段名。

---

## 3. 三维差异速查表

### 3.1 Nuxt 3 → Nuxt 4 差异

| 项目                        | 课程（Nuxt 3）              | craft-admin（Nuxt 4）                  |
| --------------------------- | --------------------------- | -------------------------------------- |
| `login.vue` 位置             | `pages/login.vue`            | `app/pages/login.vue`                   |
| `ValidateInput.vue` 位置     | `components/ValidateInput.vue` | `app/components/ValidateInput.vue`      |
| 安装方式                     | `npm install vee-validate @vee-validate/zod` + 手动 import | `pnpm add @vee-validate/nuxt vee-validate @vee-validate/zod` + 在 `modules` 注册 |
| 是否需要 import composables   | 需要：`import { useForm } from 'vee-validate'` | 不需要：模块已 auto-import      |

### 3.2 依赖版本差异

| 维度                 | 课程 vee-validate@^4.12.5    | craft-admin vee-validate@^4.15.x                        |
| -------------------- | ----------------------------- | ------------------------------------------------------- |
| 整体 API             | 一致                          | 一致（4.x 系列没破坏性变更）                            |
| Nuxt 模块            | 课程没用                       | 用 `@vee-validate/nuxt` 模块                            |
| `errors.email` 类型  | 字符串（取第一条）             | 字符串（一致）                                          |
| `meta.touched` 类型  | `Partial<Record<Path, boolean>>` | 同上                                                    |
| Zod 适配             | `@vee-validate/zod` + `toTypedSchema` | 同上                                                    |
| 兼容 zod v4          | v3.x（课程时代 zod 只有 v3）   | **`@vee-validate/zod` 4.15+ 兼容 zod v4**（重要）       |

> ⚠️ 关键依赖兼容性
> `@vee-validate/zod@4.15+` 已支持 zod v4。如果你装到 `@vee-validate/zod@<4.15` 配 zod v4 会出现 `toTypedSchema is not a function` 之类的错。安装时显式指定 `^4.15.0` 最稳。

### 3.3 Monorepo 上下文差异

| 维度                 | 单仓项目                       | craft-admin（pnpm workspace）                                          |
| -------------------- | ------------------------------ | ---------------------------------------------------------------------- |
| Schema 来源          | `~/validators/user` 本地相对路径 | `@my-lego/shared` 跨子包 import（与 21-5/21-6 服务端用的**同一份 schema**） |
| `toTypedSchema` 调用 | 一样                            | 一样（适配器在 craft-admin 装）                                         |
| `ValidateInput` 复用 | 只在 admin 项目内               | 未来可以考虑上移到 `@my-lego/shared`，让 craft 编辑器也能用 —— 但当前阶段先放 craft-admin，UI 组件耦合度太高，移到 shared 前要先解 Tailwind / Nuxt 自动导入的依赖问题 |

---

## 4. 易错点 + 关键 API 速查

### 4.1 易错点 Checklist

1. **`useField` 必须传回调而不是字符串**。`useField(() => props.name)` 才能保持响应式，`useField(props.name)` 会失去 reactivity（重命名字段后 useField 不会重新订阅）。
2. **`form` 上的 `@submit` 不要写 `.prevent`**。`handleSubmit` 内部已 preventDefault；多写一层会让某些情况下行为异常（特别是浏览器原生表单校验提前介入）。
3. **`useForm` 的 `errors.email` 在 v4 是 string | undefined**，**不是数组**。v3 时代曾经返回过数组取 `[0]`，现已统一字符串。课程视频的 v3 写法 `errors.email[0]` 在 v4 会得到字符串的第一个字符 —— 容易踩。
4. **`useField` 的 `errorMessage` 同样是 string | undefined**。如果想拿全部错误（一字段多 rule 时），用 `errors`（数组），不是 `errorMessage`。
5. **blur 校验不出的"幽灵问题"**。useField 默认监听值变化触发校验；空 input 进入又空 input 离开不触发。需要 `@blur="handleChange"` 主动触发。defineField 通过 `validateOnModelUpdate: false` 控制，**两种 API 解决方式不同**。
6. **新建 `app/components/` 后必须重启 dev server**。Nuxt 启动时扫顶层目录有缓存。
7. **`@vee-validate/zod` 版本要和 zod 主版本匹配**。zod v4 ⇒ `@vee-validate/zod@^4.15`；zod v3 ⇒ 旧版可。pnpm 应显示 peer 警告，不要忽略。
8. **`name` 必须和 schema 的 key 一致**。`<ValidateInput name="email">` 必须对应 schema 里的 `email` 字段，否则错误绑不上、提交时该字段为 undefined。
9. **`toTypedSchema` 不要忘记调用**。直接传 Zod schema 给 `validationSchema` 也能跑（VeeValidate 会做 duck typing），但**没有 TypeScript 类型推断**。`handleSubmit((values) => ...)` 里的 `values` 类型就是 `any`，丢了 monorepo 的最大红利。
10. **`@vee-validate/nuxt` peer dep 警告**。当前模块版本对 Nuxt 4 标的是 `peer: ^3.13.2`，pnpm 会警告。运行无影响。如想消警告，用 `pnpm.peerDependencyRules.allowedVersions` 配置。

### 4.2 关键 API 速查

| API                                              | 作用                                | 调用位置                       |
| ------------------------------------------------ | ----------------------------------- | ------------------------------ |
| `useForm({ validationSchema })`                  | 创建表单中枢                        | page `<script setup>`          |
| `defineField(name, options?)`                    | 在 page 中挂字段，返回 `[value, attrs]` | useForm 上下文内              |
| `useField(() => name)`                           | 在子组件中挂字段，独立调用           | 子组件 `<script setup>`        |
| `handleSubmit(callback)`                         | 包裹提交回调；校验通过才执行        | useForm 上下文内              |
| `errors.fieldName`                               | 整表单的错误对象，**字符串**         | template / setup              |
| `values`                                         | 全表单值响应式快照                  | useForm 返回                  |
| `meta`（form 级）                                  | 表单整体 touched/dirty/valid/pending | useForm 返回                  |
| `meta`（field 级）                                 | 单字段 touched/dirty/valid/pending  | useField 返回                 |
| `isSubmitting`                                   | 是否正在异步提交                    | useForm 返回                  |
| `isValidating`                                   | 是否正在异步校验                    | useForm 返回                  |
| `setFieldValue(name, value)`                     | 编程式设值（21-10 用得到）           | useForm 返回                  |
| `setFieldError(name, msg)`                       | 编程式设错（21-10 服务端错误回填）    | useForm 返回                  |
| `resetForm()`                                    | 重置表单到 initialValues             | useForm 返回                  |
| `toTypedSchema(zodSchema)`                       | Zod schema 转 vee-validate 接口        | from `@vee-validate/zod`       |
| `validateOnModelUpdate: false`                   | defineField 选项：关闭 input 即时校验 | defineField 第二参             |
| `@blur="handleChange"` (useField)                | 手动触发单字段校验                  | template 事件                  |

### 4.3 与课程相比，本节**改写**了什么

- 安装方式：课程 `npm install vee-validate @vee-validate/zod` → craft-admin **`@vee-validate/nuxt` 模块 + auto-import**
- Schema 来源：课程 `~/validators/user` → craft-admin `@my-lego/shared`（沿用 21-5/21-6 的架构决策）
- 错误显示：课程 `errors.email[0]`（v3 数组语义） → craft-admin `errors.email`（v4 字符串）
- ValidateInput 中保留 `<pre>{{ meta }}</pre>` 注释 —— 调试方便
- 21-7 阶段的过渡代码**只在文档保留示例**，实际操作可跳过直接进入 21-8 阶段

---

## 5. 本节产出 checklist（动手时对照）

### 5.1 21-7 阶段（可选过渡，可跳过直接做 21-8）

- [ ] `pnpm --filter @my-lego/craft-admin add @vee-validate/nuxt vee-validate @vee-validate/zod`
- [ ] 在 `nuxt.config.ts` 的 `modules` 加 `'@vee-validate/nuxt'`
- [ ] 重启 dev server
- [ ] 把 `login.vue` 改成 useForm + defineField 写法（手写正则 rule）
- [ ] 浏览器验证：输入 email，看到 errors 实时变化
- [ ] 试 `validateOnModelUpdate: false`，验证从 input 即时校验变成 blur 才校验

### 5.2 21-8 阶段（接入 Zod + 提交）

- [ ] 改用 `toTypedSchema(userLoginSchema)` 替换手写 rule
- [ ] `useForm` 解构出 `handleSubmit`、`isSubmitting`、`meta`
- [ ] 用 `handleSubmit(async (values) => $fetch(...))` 包裹提交逻辑
- [ ] `form @submit="onLogin"`（**去掉 `.prevent`**）
- [ ] button 加 `:disabled="isSubmitting"` 和 `disabled:opacity-75 disabled:cursor-not-allowed`
- [ ] 测试：空表单 → 显示错误；合法值 → 看到 console `login ok`
- [ ] WebStorm 验证：`handleSubmit((values) => ...)` 里 `values` 类型是 `{ email: string; password: string }`（toTypedSchema 推断生效）

### 5.3 21-9 阶段（抽组件）

- [ ] 新建 `packages/craft-admin/app/components/ValidateInput.vue`
- [ ] 用 `useField(() => props.name)` 拿 value / errorMessage / handleChange / meta
- [ ] 加 `@blur="handleChange"` 解决 blur 不校验问题
- [ ] **重启 dev server**（新建 components 顶层目录）
- [ ] 在 `login.vue` 删掉两个 input 块，换成 `<ValidateInput name="email" />` `<ValidateInput name="password" type="password" />`
- [ ] 删掉 `login.vue` 里不再需要的 `defineField` / `errors` / `email` / `password` 等
- [ ] 浏览器验证：
  - [ ] 完整 blur 行为正常（空进入 → blur 离开 → 显示 required 错误）
  - [ ] 改字段值时错误实时更新
  - [ ] 提交时表单整体校验、按钮 disabled、loading 文案显示
- [ ] WebStorm 验证：`<ValidateInput name=` 时应能补全 schema 字段名（如 `email` `password`）—— 当前 v4 + nuxt module 还不一定完全支持，能跑通就行
