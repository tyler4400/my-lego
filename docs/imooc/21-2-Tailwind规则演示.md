# 21-2 Tailwind 规则演示

> 课程：慕课实战《真实高质量低代码商业项目》第 21 章 · 第 2 节
> 课程项目（Nuxt 3 + Tailwind v3）：`/Users/tylerzzheng/projects/lego-fork/lego-admin`
> 我的真实项目（Nuxt 4 + Tailwind v4 + monorepo）：`packages/craft-admin/`
> 差异标注沿用 21-1：`⚠️ Nuxt 4 差异` / `⚠️ 依赖版本差异` / `⚠️ Monorepo 差异`。相同的部分不写「无差异」。

---

## 1. 概述

21-1 把 Tailwind 装好，本节"把玩"它 —— **掌握 Tailwind 的通用命名规则**，为后面所有页面开发打好基础。

讲师挑了五类规则演示，足以覆盖 80% 日常需求：

1. **字体**：大小（`text-*`）、粗细（`font-*`）
2. **颜色**：11 段色板 + 「属性前缀-颜色名-色号」三段式命名
3. **方位（间距）**：`p-*` / `m-*` 系列 + `x/y/t/b/l/r` 方位修饰
4. **状态修饰符（variants）**：`hover:` / `focus:` / `dark:` 等
5. **响应式（mobile-first）**：`sm:` / `md:` / `lg:` / `xl:` / `2xl:` 断点前缀

最后讲师演示了 **从 [HyperUI](https://www.hyperui.dev/) 直接拷贝写好的 Tailwind UI 模板**，为下节课的「两种布局」做铺垫。

> 💡 一句话总览：**Tailwind 类名 = 属性前缀 - 值（- 色号）**，外层套 `状态/断点:` 前缀做修饰。理解这个三层结构，写 Tailwind 就只是「查文档拼接类名」的体力活。

---

## 2. 知识点 + 演示复盘

> 本节几乎所有代码都在 `packages/craft-admin/app/app.vue` 上演示，跟着改即可。

### 2.1 文档作为唯一可信源

讲师强调：**遇到任何不会的 CSS 属性，直接到 [tailwindcss.com/docs](https://tailwindcss.com/docs) 搜索**。文档左侧把类名分成 Layout / Flexbox & Grid / Spacing / Sizing / Typography / Backgrounds / Borders / Effects / Filters / Tables / Transitions / Transforms / Interactivity / SVG / Accessibility 等大类。

WebStorm 写代码时，鼠标悬停任何 Tailwind 类，会显示对应真实 CSS，等价于内嵌一份"个性化文档"。

### 2.2 字体（Typography）

#### 字体大小 `text-*`

| 类名         | font-size | line-height | 折算 px |
| ------------ | --------- | ----------- | ------- |
| `text-xs`    | 0.75rem   | 1rem        | 12 / 16 |
| `text-sm`    | 0.875rem  | 1.25rem     | 14 / 20 |
| `text-base`  | 1rem      | 1.5rem      | 16 / 24 |
| `text-lg`    | 1.125rem  | 1.75rem     | 18 / 28 |
| `text-xl`    | 1.25rem   | 1.75rem     | 20 / 28 |
| `text-2xl`   | 1.5rem    | 2rem        | 24 / 32 |
| `text-3xl`   | 1.875rem  | 2.25rem     | 30 / 36 |
| …            | …         | …           | …       |
| `text-9xl`   | 8rem      | 1           | 128     |

> 💡 注意 `text-` 这个前缀**既是字号也是字色**的前缀，Tailwind 通过"第二段是数字还是颜色名"区分语义。`text-xl` 是大小、`text-red-500` 是颜色，写时 IDE 不会混淆。

#### 字体粗细 `font-*`

`font-thin` (100) / `font-light` (300) / `font-normal` (400) / `font-medium` (500) / `font-semibold` (600) / `font-bold` (700) / `font-extrabold` (800) / `font-black` (900)。

```vue
<!-- packages/craft-admin/app/app.vue -->
<template>
  <div class="p-8">
    <!-- 字号 2xl + 加粗 -->
    <h1 class="text-2xl font-bold">Hello Tailwind</h1>
  </div>
</template>
```

### 2.3 颜色（Color）

#### 三段式命名

任何与颜色相关的属性都是 **属性前缀-颜色名-色号** 三段：

```text
bg-red-300        background-color
text-blue-700     color
border-gray-200   border-color
ring-emerald-500  ring-color
fill-orange-400   SVG fill
shadow-slate-500  box-shadow color
divide-zinc-100   分割线颜色
```

#### 11 段色号

每个颜色都有 11 个色号：`50 / 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 / 950`。数字越大越深，500 通常是"主色"。

#### 演示

```vue
<template>
  <div class="bg-red-300 text-blue-700 p-8">
    <h1 class="text-2xl font-bold">Hello Tailwind</h1>
  </div>
</template>
```

WebStorm 在 class 里写 `bg-red-` 时，会列出 50 ~ 950 全部色号，每个前面带色块预览。

> ⚠️ 依赖版本差异
> Tailwind v3 用 sRGB（hex）定义颜色；**Tailwind v4 改用 OKLCH 颜色空间**。
>
> - 视觉上几乎一样（在不支持 OKLCH 的旧浏览器有 fallback），`bg-red-300` 的"红"在两版本里看着没区别。
> - 但**精确值不同**。课程演示用的 `bg-red-300` 在 v3 是 `#fca5a5`，在 v4 是 `oklch(0.808 0.114 19.571)`。日常开发无所谓，做精细 UI 还原时要留意。
> - v4 把所有色板都暴露为 CSS 变量：`var(--color-red-300)`。你在自定义 CSS 里直接引用即可。

### 2.4 方位（Spacing：padding / margin）

#### 方位修饰符

`p` 表示 padding、`m` 表示 margin，后面接方位字母：

| 类名前缀 | 作用                  | 等价 CSS                          |
| -------- | --------------------- | --------------------------------- |
| `p-*`    | 四个方向 padding      | `padding`                         |
| `px-*`   | **横向** (left+right) | `padding-inline`                  |
| `py-*`   | **纵向** (top+bottom) | `padding-block`                   |
| `pt-*`   | 上                    | `padding-top`                     |
| `pb-*`   | 下                    | `padding-bottom`                  |
| `pl-*`   | 左                    | `padding-left` *(v4: `padding-inline-start`)* |
| `pr-*`   | 右                    | `padding-right` *(v4: `padding-inline-end`)*  |
| `m-*`    | 四个方向 margin       | `margin`                          |
| `mx-*` / `my-*` / `mt-*` / `mb-*` / `ml-*` / `mr-*` | 同 padding 规则 | 略 |

#### 取值

Tailwind 间距是 `0 → 96` 的预设刻度（每 `1` 等于 `0.25rem` = `4px`）：

```text
p-0    → 0
p-0.5  → 0.125rem (2px)
p-1    → 0.25rem  (4px)
p-2    → 0.5rem   (8px)
p-4    → 1rem     (16px)
p-5    → 1.25rem  (20px)
p-8    → 2rem     (32px)
p-12   → 3rem     (48px)
p-96   → 24rem    (384px)
```

#### 演示

```vue
<template>
  <div class="bg-red-300 px-5 my-6 p-8">
    <h1 class="text-2xl font-bold text-blue-700">Hello Tailwind</h1>
  </div>
</template>
```

效果：背景红、左右 padding 20px、上下 margin 24px、内边距 32px、标题大号蓝粗体。

> ⚠️ 依赖版本差异（取值上限放开 + 任意值）
>
> - Tailwind v3：超出 `96` 必须改 `tailwind.config.js` 扩展 `spacing`。
> - Tailwind v4：**动态间距**。`p-100`、`p-128` 等只要数字合理都直接生效（v4 把所有 spacing 改成 `calc(var(--spacing) * n)` 计算）。
> - 两版本都支持**任意值**（arbitrary values）：`p-[37px]`、`mt-[1.5rem]`、`text-[#3b82f6]`。

### 2.5 状态修饰符（Variants）

Tailwind 的一大创新：**在类名前加 `状态:` 前缀**，几乎所有 CSS 伪类都能直接套。

```text
hover:text-green-700       :hover 时变绿
focus:ring-2               :focus 时显示 ring
disabled:opacity-50        :disabled 时半透明
dark:bg-zinc-900           暗黑模式下变深灰
group-hover:text-red-500   父元素 hover 时
peer-checked:text-blue-500 兄弟 checkbox 选中时
```

#### 演示

```vue
<template>
  <div class="bg-red-300 p-8">
    <h1 class="text-2xl font-bold text-blue-700 hover:text-green-700">
      Hello Tailwind
    </h1>
  </div>
</template>
```

鼠标移到 `h1` 上，文字从蓝变绿。

> ⚠️ 依赖版本差异（v4 新增的实用 variant）
>
> - `not-*:` 反向修饰，例：`not-hover:opacity-50`
> - `nth-*:` 通用 nth-child，例：`nth-3:text-red-500`
> - `in-*:` 父级 has 替代，例：`in-data-active:bg-blue-100`
> - 21-2 课程没用，先记在这里 —— 未来写复杂交互时很省事。

### 2.6 响应式（Responsive，Mobile-First）

Tailwind 的响应式策略是 **mobile-first**：默认样式应用到**所有尺寸**，断点前缀只在"该断点及以上"生效。

#### 断点

| 前缀  | 起始宽度（min-width） | 设备目标       |
| ----- | --------------------- | -------------- |
| 无    | 0                     | 手机（默认）   |
| `sm:` | 640px                 | 大手机/小平板  |
| `md:` | 768px                 | 平板           |
| `lg:` | 1024px                | 笔记本         |
| `xl:` | 1280px                | 桌面           |
| `2xl:` | 1536px                | 大屏           |

#### 演示

```vue
<template>
  <!-- 默认（手机）：6xl 巨大；≥lg 桌面端：xl 中等 -->
  <h1 class="text-6xl lg:text-xl font-bold">
    Hello Tailwind
  </h1>
</template>
```

把浏览器拖窄到 < 1024px，标题变巨大；拖宽到 ≥ 1024px，标题变小。这就是讲师所说的"先写手机端样式，再用断点前缀覆盖大屏"。

> 💡 经验：**断点前缀只覆盖更大的尺寸，不会缩小**。如果你想"只在中等屏幕显示某样式"，可组合：`md:block xl:hidden`（中屏显示，大屏隐藏）。

> ⚠️ 依赖版本差异（v4 新增 max-* 断点）
> Tailwind v4 加了**反向断点** `max-sm:` / `max-md:` 等（max-width 语义，"在该断点**以下**生效"）。这让"只针对手机"的写法不再需要 `xxx md:hidden` 组合：直接写 `max-md:xxx` 就行。

### 2.7 直接复用 HyperUI 模板

讲师推荐 [HyperUI](https://www.hyperui.dev/)：纯 Tailwind 写的代码片段库（Alert、Forms、Login、Hero、Cards、Buttons、Stats、Footer 等都齐全），可视化预览 + 一键复制。

> ⚠️ 依赖版本差异（这是 21-2 最大的实际坑）
> HyperUI 公开的代码片段**大多还是 Tailwind v3 风格**。直接拷到 craft-admin（v4）里，多数能工作，但有几个常见 class 已经在 v4 改名/改语义，需要手动替换。我整理在 §3.2。

#### 演示（讲师做法）

讲师在 HyperUI → Forms → Login 找了一个登录表单代码片段，整段复制粘贴到他课程项目的 `pages/login.vue`：

```vue
<!-- 课程：pages/login.vue -->
<template>
  <section class="bg-white">
    <div class="lg:grid lg:min-h-screen lg:grid-cols-12">
      <!-- HyperUI 提供的 Tailwind v3 写法（节选）-->
      <main class="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
        <form class="mt-8 grid grid-cols-6 gap-6">
          <input
            type="email"
            class="mt-1 w-full rounded-md border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
          />
          <button class="inline-block shrink-0 rounded-md border border-blue-600 bg-blue-600 px-12 py-3 text-sm font-medium text-white transition hover:bg-transparent hover:text-blue-600 focus:outline-none focus:ring active:text-blue-500">
            登录
          </button>
        </form>
      </main>
    </div>
  </section>
</template>
```

讲师强调，这种 UI 模板对**不是设计师**的同学非常友好 —— 不用自己调样式，直接拿能用的高质量代码片段。

#### craft-admin 阶段先不写

21-2 是规则演示，**还没创建 pages 目录**。讲师演示用的 `pages/login.vue` 是上一节 21-1 之前就已经存在的。craft-admin 这边等 21-3 学完 Layouts、21-10 之前要做注册页时，再正式落地登录页。

但 HyperUI 模板的 **v3 → v4 兼容性问题**，21-3 之后会反复遇到，先把替换规则写在 §3.2，到时直接对照。

### 2.8 下节预告：两种布局

讲师在视频末尾点了下一节（21-3）的主题：

- **管理后台页面**：有 Header + 侧边栏的"主布局"；
- **认证页面**：登录/注册等，只显示中央表单的"空布局"。

这两种"骨架"在 Nuxt 里靠 `app/layouts/` 实现，21-3 会讲。

---

## 3. 三维差异速查表

### 3.1 Nuxt 3 → Nuxt 4 差异

> 本节几乎不涉及 Nuxt 自身路径变化（演示只在 `app.vue` 改 class）。唯一相关的：课程的 `pages/login.vue` 在 craft-admin 里是 `app/pages/login.vue`，等到了 21-3 再落地。

### 3.2 依赖版本差异：Tailwind v3 → v4 的 class 重命名 / 行为变化

下表是 21-2 演示内容里**真的会踩到**的差异（不全列 v4 的所有变化，只挑后续 HyperUI 拷贝时高频用到的）：

| v3 写法                       | v4 写法                              | 说明                                                                 |
| ----------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `shadow-sm`                   | `shadow-xs`                          | v4 把 shadow 整体重命名，每档"小一号"                                  |
| `shadow` （无后缀）           | `shadow-sm`                          | 同上                                                                 |
| `shadow-md`                   | `shadow-md`                          | 不变                                                                 |
| `drop-shadow-sm`              | `drop-shadow-xs`                     | 与 shadow 同理                                                       |
| `blur-sm`                     | `blur-xs`                            | 与 shadow 同理                                                       |
| `rounded-sm`                  | `rounded-xs`                         | 与 shadow 同理                                                       |
| `outline-none`                | `outline-hidden`                     | v4 重命名（语义更准确：隐藏 outline 不等于 none）                    |
| `ring`                        | `ring-3`                             | v4 把 `ring` 默认 width 从 3px 改为 1px；想还原 v3 视觉用 `ring-3`     |
| `ring-{color}`（无 width）    | `ring-1 ring-{color}` 或 `ring-{color}` | v4 默认 ring color 从 `blue-500` 变为 `currentColor`，建议显式写       |
| `flex-shrink-0`               | `shrink-0`                           | v4 取掉了 `flex-` 前缀                                               |
| `flex-grow-0`                 | `grow-0`                             | 同上                                                                 |
| `overflow-ellipsis`           | `text-ellipsis`                      | v4 重命名                                                            |
| `decoration-slice`            | `box-decoration-slice`               | v4 加回 `box-` 前缀（CSS 规范一致）                                  |
| `bg-opacity-50`               | `bg-black/50` 或 `bg-{color}/50`     | v4 推荐 `颜色/透明度` 语法；v3 的 `bg-opacity-*` 已废弃               |
| `placeholder-gray-400`        | `placeholder:text-gray-400`          | v4 改用 variant，placeholder 颜色用 `placeholder:` 前缀 + 文字色      |

> 💡 上面这些写法**讲师在视频里没有特别提**，但只要你从 HyperUI / TailwindFlex / Tailwind Components 这类社区库复制代码，就会遇到。下节课开始就有 login 表单，先存档备用。
>
> 偷懒做法：HyperUI 复制完后跑 `npx @tailwindcss/upgrade` 在 craft-admin 里执行，会自动改写所有过时类名（仅 v3 → v4 一次性迁移，平时不用跑）。

### 3.3 Monorepo 上下文差异

本节纯演示，几乎不涉及。唯一一点：

| 维度        | 单仓项目     | craft-admin（pnpm workspace）                                  |
| ----------- | ------------ | -------------------------------------------------------------- |
| 修改文件路径 | `app.vue`    | `packages/craft-admin/app/app.vue`（多两层路径，IDE 跳转无碍）   |

---

## 4. 易错点 + 关键 API 速查

### 4.1 易错点 Checklist

1. **色号写错**。Tailwind 没有 `bg-red-1000`，只到 `950`；也没有 `bg-red-150`，色号是固定的 11 级。
2. **`px` ≠ `p-x`**。`px-5` 是 `padding-inline: 1.25rem`；想写"5 像素的 padding"应该写 `p-[5px]`（任意值语法）。
3. **断点是 min-width，不是 max-width**。`sm:text-xl` 是 **≥640px 生效**，不是"小屏才生效"。想要"小屏才生效"用 v4 新增的 `max-sm:`。
4. **mobile-first 思维**。默认写小屏样式，往大屏覆盖；不要反着写"先桌面，再用 `sm:` 缩"。
5. **HyperUI 拷过来的代码**先按 §3.2 表格替换 `shadow-*`、`outline-none`、`ring`、`flex-shrink-*` 等过时类，否则视觉会有微妙差异。
6. **`focus:outline-none` 的可访问性陷阱**。HyperUI 大量用 `focus:outline-none focus:ring`，v4 推荐改 `focus:outline-hidden focus:ring-3`（语义+视觉等价）。
7. **暗黑模式默认策略变了**。v3 默认 `media`（跟随系统）；v4 默认 `media`，但**自定义触发**需在 CSS 写 `@custom-variant dark (&:where(.dark, .dark *));` 而不是改 `tailwind.config.js`。21-2 暂不涉及，先记一下。

### 4.2 关键 class 命名规则速查（**记住这张就能猜对 80% 的类名**）

| 维度   | 模板                                 | 例子                                  |
| ------ | ------------------------------------ | ------------------------------------- |
| 字体大小 | `text-{xs/sm/base/lg/xl/2xl…9xl}`  | `text-2xl`                            |
| 字体粗细 | `font-{thin…black}`                | `font-bold`                           |
| 颜色   | `{属性}-{颜色}-{50…950}`           | `bg-red-300` / `text-blue-700`        |
| 透明度 | `{颜色}/{50…100}`                  | `bg-black/50` / `text-red-500/80`     |
| 间距   | `{p/m}{方位}-{0…96}` 或任意值       | `px-5` / `my-6` / `p-[37px]`          |
| 状态   | `{状态}:` 前缀 + 类名               | `hover:bg-blue-500`                   |
| 断点   | `{sm/md/lg/xl/2xl}:` 前缀 + 类名     | `lg:text-xl` / `max-md:hidden` (v4)   |
| 任意值 | `{类名}-[{任意 CSS 值}]`            | `w-[42%]` / `bg-[#3b82f6]`            |
| CSS 变量 | `{属性}-(--{变量名})` (v4 专有)    | `bg-(--brand-color)`                  |

### 4.3 与课程相比，本节**省略或改写**了什么

- 课程对 `/_tailwind/` 颜色面板的演示 —— craft-admin 用 v4 + Vite 没这页面，省略（21-1 已说明）。
- 课程的"VSCode 插件预览色块" —— 替换为"WebStorm 内置预览色块"。
- 课程在 `pages/login.vue` 演示 HyperUI 复用 —— craft-admin 还没建 pages，先把 HyperUI v3→v4 兼容表格存好，等 21-10 写注册页时用。

---

## 5. 本节产出 checklist（动手时对照）

- [ ] 打开 [tailwindcss.com/docs](https://tailwindcss.com/docs)，过一遍左侧分类（不用每个都看，混个脸熟）。
- [ ] 在 `packages/craft-admin/app/app.vue` 上轮流试这些 class，浏览器验证：
  - [ ] 字号：`text-base` / `text-2xl` / `text-6xl`
  - [ ] 颜色：`bg-red-300` / `text-blue-700` / `border border-emerald-500`
  - [ ] 间距：`p-8` / `px-5` / `my-6` / `p-[37px]`
  - [ ] 状态：`hover:text-green-700` / `focus:outline-hidden`
  - [ ] 响应式：`text-6xl lg:text-xl`，拖动浏览器宽度验证
- [ ] 收藏 [HyperUI](https://www.hyperui.dev/)（或同类：[Tailwind UI Free](https://tailwindui.com/components/preview)、[Flowbite](https://flowbite.com/)）。
- [ ] 把本文 §3.2 的「v3 → v4 命名替换表」截图或加书签，HyperUI 复制代码时对照查。
