# 21-3 使用 Layouts 创造两种布局

> 课程：慕课实战《真实高质量低代码商业项目》第 21 章 · 第 3 节
> 课程项目（Nuxt 3 + Tailwind v3）：`/Users/tylerzzheng/projects/lego-fork/lego-admin`
> 我的真实项目（Nuxt 4 + Tailwind v4 + monorepo）：`packages/craft-admin/`
> 差异标注：`⚠️ Nuxt 4 差异` / `⚠️ 依赖版本差异` / `⚠️ Monorepo 差异`。

---

## 1. 概述

21-2 末尾留了个问题：管理系统需要 **两种 UI 骨架**

- **管理后台主布局**：顶部 Header + 内容区（后续 21-17/18 还会加侧边栏 Sidebar），所有"业务页面"用这套。
- **认证布局**：登录 / 注册等页面，**没有 Header / 侧边栏**，只显示中央表单。

如果在每个 page 里手写"这是不是登录页 → 决定要不要 render Header"，代码会重复且耦合。Nuxt 提供 **Layouts** 约定专门解决这件事 —— 把"页面骨架"抽出来，每个 page 声明自己用哪套骨架即可。

### 本节产出

1. 在 `app/layouts/` 下创建两个布局：`default.vue`（主布局，含 Header）和 `auth.vue`（极简布局）。
2. 改造 `app/app.vue`，用 `<NuxtLayout>` 包住 `<NuxtPage />`，启用 Layouts 机制。
3. 创建 `app/pages/index.vue` 和 `app/pages/login.vue` 两个 page 验证效果。
4. 用 `definePageMeta({ layout: 'auth' })` 让 `login.vue` 切到极简布局。

最终效果：访问 `/` 看到带 Header 的主布局；访问 `/login` 看到极简布局。

> 💡 命名差异：课程的极简布局叫 `custom.vue`（讲师在视频里口误说成 "Customer"）。craft-admin 用更语义化的 **`auth.vue`** —— 这层布局本质是给「认证类页面」用的，名字直接说明意图，后续 signup、reset-password 等页面也能复用。文档主线用 `auth.vue`，但会在易错点里告诉你课程为什么用 `custom.vue`。

---

## 2. 知识点 + 演示复盘

### 2.1 Layouts 是什么

**约定**：`app/layouts/` 目录下的 `*.vue` 文件就是一个 Layout。文件名（不带扩展名）就是 Layout 的注册名。

**特殊文件名**：

- `default.vue` —— **默认 fallback**。任何 page 没有显式声明 layout 时都会用它。
- 其他文件名（`auth.vue` / `admin.vue` / `print.vue` …） —— 普通命名 layout，需要在 page 里用 `definePageMeta({ layout: '...' })` 显式启用。

**结构要求**：Layout 是个普通 Vue 组件，必须包含一个 `<slot />`（Nuxt 会把 page 内容塞到 slot 位置）。

**启用机制**：在 `app/app.vue` 里用 `<NuxtLayout>` 组件包住 `<NuxtPage />`：

```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

`<NuxtLayout>` 会读取**当前 page** 的 `definePageMeta({ layout })` 决定 render 哪个 layout 文件，没有声明则用 `default.vue`。

> ⚠️ Nuxt 4 差异（目录位置）
> 课程的 `layouts/` 在项目根目录；craft-admin 在 **`app/layouts/`** 下（Nuxt 4 把 `srcDir` 默认下移到 `app/`）。同理：
>
> - 课程：`app.vue` 在项目根 → craft-admin：`app/app.vue`
> - 课程：`pages/` 在项目根 → craft-admin：`app/pages/`

### 2.2 落地步骤

#### Step 1 创建 `app/layouts/default.vue`

```vue
<!-- packages/craft-admin/app/layouts/default.vue -->
<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-50">
    <!-- 临时 Header 占位（21-17 会做正式的 GlobalHeader 组件） -->
    <header class="bg-gray-800 text-white shadow">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold">craft-admin</h1>
        <nav class="text-sm text-gray-300">
          <NuxtLink to="/" class="hover:text-white">首页</NuxtLink>
        </nav>
      </div>
    </header>

    <!-- 业务页面内容渲染在这里 -->
    <main class="flex-1 mx-auto w-full max-w-7xl p-4">
      <slot />
    </main>
  </div>
</template>
```

> 💡 视频里讲师在 `default.vue` 直接用了 `<GlobalHeader />`、`<Sidebar />` 等还没创建的组件 —— 这是因为他的课程项目是从已完成的源码倒着讲的。craft-admin 是从零写，**21-3 阶段先用上面的临时 Header**，到 21-17 / 21-18 节再抽离成 `GlobalHeader` 组件并补侧边栏。

#### Step 2 创建 `app/layouts/auth.vue`（课程叫 `custom.vue`）

```vue
<!-- packages/craft-admin/app/layouts/auth.vue -->
<template>
  <!-- 极简布局：不渲染任何骨架，由 page 自己掌控全屏内容 -->
  <slot />
</template>
```

> 💡 这个文件可以更短 —— Nuxt 允许 layout 里只写一个 `<slot />`，连外层 `<div>` 都不需要。
> 但如果你想给认证页统一加个背景（如渐变背景、品牌色），可以在外层包一个 `<div class="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50">`。这里先保持极简，21-10 写注册页时再决定要不要加。

#### Step 3 改造 `app/app.vue` 启用 Layouts

把 craft-admin 当前的 `app/app.vue`（21-1/21-2 阶段的 demo 内容）改写为：

```vue
<!-- packages/craft-admin/app/app.vue -->
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
```

要点：

- **保留 `<NuxtRouteAnnouncer />`** —— 这是 Nuxt 默认模板生成的无障碍组件（路由变化时向屏幕阅读器播报），删掉无副作用但会损失可访问性。
- **删掉之前的 `useState` / `isFunction` demo** —— 这些只是 21-1 验证 Tailwind 时的临时代码，不再需要。
- `<NuxtPage />` **必须**放在 `<NuxtLayout>` 内层 —— 这是讲师视频中强调的关键点。如果反着写（`<NuxtPage><NuxtLayout/></NuxtPage>`）会报错。

> ⚠️ Nuxt 4 差异（vue-router 版本顺带说一下）
> 课程 vue-router 是 `^4.2.5`；craft-admin 是 `^5.1.0`。`<NuxtLayout>` / `<NuxtPage>` / `<NuxtLink>` 的对外 API 完全一致，使用层不需要任何改动 —— 第 20 章已经反复验证过了。

#### Step 4 创建两个 page 验证

`app/pages/` 目录之前**还不存在**（第 20 章在 hello-nuxt 创建过，craft-admin 是新项目）。**创建顶层目录后必须重启 dev server**。

```vue
<!-- packages/craft-admin/app/pages/index.vue -->
<template>
  <div class="rounded-lg bg-white p-8 shadow-xs">
    <h2 class="text-2xl font-bold text-gray-800">Welcome to craft-admin</h2>
    <p class="mt-4 text-gray-500">这是管理系统首页，应该看到上方的 Header。</p>
  </div>
</template>
```

```vue
<!-- packages/craft-admin/app/pages/login.vue -->
<script setup lang="ts">
// 关键：通过 definePageMeta 切换到 auth 布局
definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50">
    <div class="w-full max-w-md rounded-xl bg-white p-8 shadow">
      <h1 class="text-center text-2xl font-bold text-gray-800">用户登录</h1>
      <p class="mt-2 text-center text-sm text-gray-500">这是极简认证布局，没有 Header</p>
      <!-- 21-9 / 21-10 才会真正写表单，先放占位 -->
    </div>
  </div>
</template>
```

#### Step 5 启动验证

```bash
pnpm --filter @my-lego/craft-admin dev
```

- 访问 [http://localhost:3003/](http://localhost:3003/) —— 看到 Header + Welcome 卡片
- 访问 [http://localhost:3003/login](http://localhost:3003/login) —— 看到全屏渐变背景 + 居中卡片，**没有 Header**

这就证明：

- 默认页面（`index.vue`）走 `default.vue` 布局（约定 fallback）
- `login.vue` 通过 `definePageMeta({ layout: 'auth' })` 走 `auth.vue` 布局

### 2.3 `definePageMeta` 的几种 layout 用法（讲师只演示了第 1 种）

`definePageMeta` 是 Nuxt 提供的「**编译时**」元数据声明 macro（注意：不是运行时函数，编译器会把它提取出来挂到路由元数据上）。除了 `layout`，还能挂 middleware、keepalive、pageTransition、validate 等。

| 写法                                                | 含义                                                | 何时用                              |
| --------------------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| `definePageMeta({ layout: 'auth' })`                | 指定具名 layout（**讲师演示**）                     | 大多数场景                          |
| `definePageMeta({ layout: false })`                 | 该页面**不使用任何 layout**，连 default 都不套      | 全屏特殊页（如 print 预览、错误页） |
| `definePageMeta({ layout: 'default' })`             | 显式声明 default（多余但无害）                      | 团队规范要求页面必须声明 layout 时  |
| 不写 `layout`                                       | 使用 `default.vue`（如有）                          | 默认行为                            |

> 💡 **运行时切换 layout** 也是可能的，但 21-3 用不到，列在 §4.2 关键 API 速查里。

### 2.4 一个细节：Layout 切换时的过渡

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  // 21-3 用不到，但顺带知道：可以给 layout 切换加过渡动画
  layoutTransition: { name: 'layout', mode: 'out-in' },
})
</script>
```

要让过渡生效还需在全局 CSS 写对应的 `.layout-enter-active` / `.layout-leave-active` 等类。本节不展开。

---

## 3. 三维差异速查表

### 3.1 Nuxt 3 → Nuxt 4 差异

| 项目          | 课程（Nuxt 3）               | craft-admin（Nuxt 4）                    |
| ------------- | ---------------------------- | ---------------------------------------- |
| Layouts 目录  | `layouts/default.vue` 等     | `app/layouts/default.vue` 等             |
| Pages 目录    | `pages/`                     | `app/pages/`                             |
| `app.vue`     | 项目根 `app.vue`             | `app/app.vue`                            |
| `<NuxtLayout>` / `<NuxtPage>` API | 与 Nuxt 4 完全一致           | 与 Nuxt 3 完全一致（用法无变化）         |
| `definePageMeta` | 编译时 macro，自动导入       | 同左                                     |
| vue-router 版本 | 4.x                          | 5.x（layout 相关 API 使用层无感知）      |

### 3.2 依赖版本差异

本节不涉及第三方库版本差异（Layout 是 Nuxt 自身约定）。Tailwind v3 / v4 在 layout 内的 class 写法差异已在 21-2 §3.2 列过 —— 上面 `default.vue` 用了 `shadow-xs`（v4 的 `shadow-sm` 等价物），如果你直接复制课程代码会看到 `shadow-sm`，按 21-2 表格替换即可。

### 3.3 Monorepo 上下文差异

本节几乎不涉及 monorepo 特殊处理。唯一一处：

| 维度             | 单仓项目          | craft-admin（pnpm workspace）                          |
| ---------------- | ----------------- | ------------------------------------------------------ |
| 启动 dev server  | `npm run dev`     | `pnpm --filter @my-lego/craft-admin dev`               |
| 新建 `app/layouts/` 或 `app/pages/` 后 | 自动热加载        | 同左（无差异）—— 但**创建顶层目录后建议手动重启一次**  |

> 💡 未来若 `@my-lego/shared` 里要放共享的 Layout 组件（理论上可以，但目前没必要），需要在 `nuxt.config.ts` 用 `components.dirs` 或 `extends` 注册。21-3 用不到。

---

## 4. 易错点 + 关键 API 速查

### 4.1 易错点 Checklist

1. **`default.vue` 拼错就废了**。文件名是约定，必须**全小写 + 单数**：`default.vue`，不是 `Default.vue` / `defaults.vue` / `defualt.vue`（最后一个是典型拼写错）。
2. **`<NuxtPage />` 必须在 `<NuxtLayout>` 里层**。反过来写不会自动报错但 layout 不渲染，容易 debug 半天。
3. **新建 `app/layouts/` 或 `app/pages/` 顶层目录后要重启 dev server**。Nuxt 启动时扫描目录是带缓存的；新建顶层目录后路由/布局可能不被识别，重启一次最稳。
4. **`definePageMeta` 是 macro，不是函数**。
   - 参数必须是**静态字面量对象**，不能写成 `definePageMeta({ layout: someVariable })`（编译时无法分析）。
   - 不能 `import { definePageMeta }`（已是全局自动导入）。
   - 不要写两个 `definePageMeta` —— 后一个会覆盖前一个，但 IDE 不会提示。
5. **课程命名陷阱 `custom.vue`**。讲师在视频里读作 "Customer"，实际文件名是 `custom.vue`（去掉 -er）。craft-admin 用语义化的 `auth.vue` 避免误解，但如果你跟着课程视频敲，**写错成 `customer.vue` 会找不到布局**。
6. **`<slot />` 漏写**。Layout 里没有 `<slot />` 的话，page 内容根本不会被渲染（dev tools 也不会报错，只是页面空白）。
7. **想给单个页面"无 layout"** 用 `definePageMeta({ layout: false })`，不是 `layout: ''` 或 `layout: null`。
8. **layout 名是文件名（kebab-case）**。如果文件叫 `myAuth.vue`，在 page 里要写 `layout: 'my-auth'`，不是 `myAuth`。这与 middleware 的命名规则一致。

### 4.2 关键 API 速查

| API                                              | 作用                                | 调用位置                              |
| ------------------------------------------------ | ----------------------------------- | ------------------------------------- |
| `<NuxtLayout>`                                   | layout 渲染槽，包住 `<NuxtPage />`  | `app/app.vue`                         |
| `<NuxtLayout name="auth">` (prop)                | 在 `app.vue` 强制使用某 layout（覆盖 page 声明） | `app/app.vue`             |
| `<NuxtPage />`                                   | 渲染当前路由匹配的 page 组件        | `app/app.vue`（包在 `<NuxtLayout>` 内） |
| `definePageMeta({ layout: 'auth' })`             | page 静态指定 layout                | page 文件 `<script setup>`            |
| `definePageMeta({ layout: false })`              | page 显式不使用 layout              | 同上                                  |
| `setPageLayout('auth')`                          | **运行时**切换 layout（少用）         | 任意 `<script setup>` 或 composable    |
| `definePageMeta({ layoutTransition: {...} })`    | 配置 layout 切换过渡动画            | page 文件                             |

### 4.3 与课程相比，本节**改写**了什么

- 课程 layout 命名 `custom.vue` → craft-admin 改为 **`auth.vue`**（语义化）。
- 课程 `default.vue` 内引用了未创建的 `<GlobalHeader />` `<Sidebar />` → craft-admin 用临时 inline Header，21-17 / 21-18 再抽组件。
- 课程的 `app.vue` 删除了 `<NuxtRouteAnnouncer />` → craft-admin **保留**（无障碍）。
- 课程没有 `<NuxtLoadingIndicator />` —— 课程项目源码里的 `app.vue` 是有的，视频里没演示。craft-admin 也先不加，21-13 / 21-14 处理登录状态时再考虑。

---

## 5. 本节产出 checklist（动手时对照）

- [ ] 新建 `packages/craft-admin/app/layouts/default.vue`（含临时 Header + `<slot />`）
- [ ] 新建 `packages/craft-admin/app/layouts/auth.vue`（只有 `<slot />`）
- [ ] 改写 `packages/craft-admin/app/app.vue` 为 `<NuxtLayout><NuxtPage /></NuxtLayout>` 形态（保留 `<NuxtRouteAnnouncer />`）
- [ ] 新建 `packages/craft-admin/app/pages/index.vue`（默认布局首页）
- [ ] 新建 `packages/craft-admin/app/pages/login.vue`，在 `<script setup>` 里写 `definePageMeta({ layout: 'auth' })`
- [ ] **重启 dev server**：`pnpm --filter @my-lego/craft-admin dev`
- [ ] 访问 `/` 验证 default 布局生效（Header 可见）
- [ ] 访问 `/login` 验证 auth 布局生效（Header 不可见、全屏渐变）
- [ ] WebStorm 检查：layout 名在 `definePageMeta({ layout: '...' })` 处应有字符串补全（Nuxt 4 + WebStorm 2024.2+ 支持 layout name 类型推断）
