# 21-1 安装 Tailwind CSS

> 课程：慕课实战《真实高质量低代码商业项目》第 21 章 · 第 1 节
> 课程项目（Nuxt 3 + Tailwind v3）：`/Users/tylerzzheng/projects/lego-fork/lego-admin`
> 我的真实项目（Nuxt 4 + Tailwind v4 + monorepo）：`packages/craft-admin/`
> 差异标注分三类就近说明：
>
> - `⚠️ Nuxt 4 差异`：仅源自 Nuxt 3 → 4 的目录/约定变化
> - `⚠️ 依赖版本差异`：源自第三方库的大版本演进（本节是 Tailwind v3 → v4）
> - `⚠️ Monorepo 差异`：源自 craft-admin 作为 pnpm workspace 子包带来的不同
>
> 与第 20 章保持一致：相同的部分不再写「无差异」。

---

## 0. craft-admin 实测信息（第 21、22 章共用基准）

`packages/craft-admin/` 由 `npx nuxi@latest init craft-admin --packageManager pnpm` 生成并接入 monorepo，实测依赖版本：

| 依赖             | 版本       | 备注                                                                  |
| ---------------- | ---------- | --------------------------------------------------------------------- |
| `nuxt`           | `^4.4.8`   | 课程是 Nuxt `^3.10.1`                                                 |
| `vue`            | `^3.5.35`  | 课程是 `^3.4.15`                                                      |
| `vue-router`     | `^5.1.0`   | **课程是 `^4.2.5`**（API 对使用者基本一致，详见第 20-7/8 节）         |
| `@my-lego/shared` | `workspace:*` | monorepo 共享工具包，通过 `nuxt.config.ts` 的 `alias` 直连源码 |

初始目录（关键部分）：

```text
packages/craft-admin/
├─ app/
│  └─ app.vue          # Nuxt 4 唯一入口（含 isFunction demo、useState demo）
├─ public/             # favicon.ico、robots.txt
├─ eslint.config.mjs   # 复用根 base，Vue3+TS+antfu
├─ nuxt.config.ts      # 已配 devServer.port=3003 与 @my-lego/shared alias
├─ tsconfig.json       # 使用 .nuxt 下 4 个子工程的 project references
└─ package.json
```

`packages/craft-admin/nuxt.config.ts` 现状：

```ts
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3003 },
  alias: {
    '@my-lego/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
  },
})
```

> 💡 一句话差异：课程几乎所有约定目录（`assets/`、`pages/`、`components/` 等）放在**项目根**；craft-admin 全部下移到 **`app/`**。这是第 20 章就反复强调的根差异，第 21、22 章会一直适用。

---

## 1. 概述

### 1.1 第 21 章的开发思路转换

第 20 章是 Nuxt 的「基础知识」（自动导入、Pages、路由、中间件、数据获取、状态管理、Server、Middleware、Storage、配置、Plugin、Modules）。从第 21 章起，正式进入「**真实管理系统项目**」：

讲师明确说了三件事：

1. **不开发全部功能**，只挑典型功能在 Nuxt 里演示，剩下的留作练习。
2. **使用更新的技术**：例如不再用 Egg/Express，转向 Nuxt 自带的 Nitro Server。
3. **先不引入任何组件库**，从最底层的原始写法开始，再慢慢叠加 NuxtUI 等组件库。这样做的好处是「**解决方案不被工具/框架绑死，得到一套通用开发思想**」。

而要做底层 UI，第一件事就是选 CSS 方案。讲师选 **Tailwind CSS** —— 一个高度可定制、原子化的 CSS 框架。

### 1.2 本节产出

本节做两件事：

1. 在项目里**安装并启用 Tailwind CSS**；
2. 让 **WebStorm 内置的 Tailwind 支持**生效（讲师演示的是 VSCode 插件 + Tailwind v3 的"初装坑"，我用 WebStorm + Tailwind v4 的路径替代）。

完事后能在 `app/app.vue` 里直接写 `class="bg-red-500 flex"` 等原子类，并在 IDE 里得到补全与色块预览。

---

## 2. 知识点 + 演示复盘

### 2.1 为什么选 Tailwind（讲师推荐理由速记）

讲师在 [tailwindcss.com](https://tailwindcss.com) 首页过了一遍 Tailwind 的卖点，浓缩成一句话：**不用离开 HTML 就能写完一套现代化样式**。具体优势：

- **原子化样式类**：每个类只做一件事（`text-sm` 只改字号、`bg-red-500` 只改背景色），通过组合得到任意样式。
- **高度可定制**：用同样的 HTML 结构，只换 class 就能产出完全不同的视觉风格。
- **性能优化**：自动扫描项目中真正用到的类名，最终产物只包含被引用的样式，文件体积极小。
- **Mobile First 响应式**：内置 `sm:` `md:` `lg:` `xl:` 等断点前缀，写一遍就能适配多尺寸。
- **状态变量**：`hover:` `focus:` `disabled:` `dark:` 直接当前缀用，无需写 `:hover` 选择器。
- **完整覆盖现代 CSS**：Grid、Transform、Filter、动画、暗黑模式都内置。

### 2.2 安装 Tailwind（课程与 craft-admin 的两条路径对照）

> ⚠️ 依赖版本差异（本节核心）
>
> - 课程用 **Tailwind v3**，通过社区维护的 Nuxt 模块 `@nuxtjs/tailwindcss@^6.11.4` 安装。
> - craft-admin 用 **Tailwind v4**，按 [Tailwind 官方 Nuxt 安装指南](https://tailwindcss.com/docs/installation/framework-guides/nuxt)用 `@tailwindcss/vite` 官方 Vite 插件安装。
>
> 为什么换？`@nuxtjs/tailwindcss` 在 Tailwind v4 时代未发布稳定版（v7 长期停留在 beta），Nuxt 团队和 Tailwind 官方都推荐改用 `@tailwindcss/vite`。两种做法在「写 class、出样式」这件事上是等价的，区别只在安装方式和配置文件。

#### 课程做法（Tailwind v3 + @nuxtjs/tailwindcss）—— 仅作对照

```bash
# 课程演示：lego-fork/lego-admin 项目根目录
npm install @nuxtjs/tailwindcss
```

```ts
// 课程：lego-fork/lego-admin/nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'nuxt-mongoose',
    '@nuxtjs/tailwindcss', // 把模块加进数组即可
  ],
  // ...
})
```

讲师同时**删掉了** `assets/style.css` 里原本的全局 CSS：

```css
/* 课程项目 lego-admin/assets/style.css，演示前的内容（已被讲师删除） */
body {
  background-color: blue;
}
```

启动后会看到终端输出 `Using Tailwind CSS …`，并暴露一个 **`/_tailwind` 调试页面**（可看色板、间距、字体等所有 token）。

#### craft-admin 做法（Tailwind v4 + @tailwindcss/vite，**推荐**）

**Step 1 安装依赖**

```bash
# 必须在 craft-admin 目录下安装到当前 workspace，不要装到根
pnpm --filter @my-lego/craft-admin add tailwindcss @tailwindcss/vite

# 或者 cd 到子包后再装
cd packages/craft-admin
pnpm add tailwindcss @tailwindcss/vite
```

> ⚠️ Monorepo 差异
> 在 pnpm workspace 里**禁止**直接 `cd` 后跑 `npm install`（会绕过 workspace 解析）。
> 优先用根 `pnpm --filter` 指定子包安装；或者 `cd` 进去后用 `pnpm add`（pnpm 会自己识别 workspace）。

**Step 2 创建样式入口**

新建 `packages/craft-admin/app/assets/css/main.css`：

```css
/* packages/craft-admin/app/assets/css/main.css */
@import "tailwindcss";
```

> ⚠️ 依赖版本差异
>
> - Tailwind v3（课程）需要写三行：`@tailwind base; @tailwind components; @tailwind utilities;`
> - Tailwind v4（craft-admin）一行 `@import "tailwindcss";` 就够了。这是 v4 的「**CSS-first**」设计：所有 theme 配置都用 CSS 里的 `@theme {}` 块写，不再需要 `tailwind.config.js`。

> ⚠️ Nuxt 4 差异
>
> - Nuxt 3（课程）：CSS 入口放在项目根 `assets/`，引用路径 `~/assets/css/main.css`（此处 `~` 指项目根）。
> - Nuxt 4（craft-admin）：CSS 入口放在 `app/assets/`，引用路径 `~/assets/css/main.css`（此处 `~` 指 `app/`，因为 Nuxt 4 把 `srcDir` 默认改成 `app/` 了）。

**Step 3 修改 `nuxt.config.ts`**

```ts
// packages/craft-admin/nuxt.config.ts
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  devServer: { port: 3003 },

  // 把 Tailwind 入口 CSS 加到 css 数组
  css: ['~/assets/css/main.css'],

  // 把 @tailwindcss/vite 注册为 Vite 插件
  vite: {
    plugins: [tailwindcss()],
  },

  alias: {
    '@my-lego/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
  },
})
```

> ⚠️ 依赖版本差异
>
> - 课程在 `modules: ['@nuxtjs/tailwindcss']` 注册（Nuxt module 形态）。
> - craft-admin 在 `vite.plugins` 注册（Vite plugin 形态），并且配 `css` 数组指向入口 CSS。
> - 课程额外配的 `tailwindcss: { exposeConfig: true }` 在 v4 **完全不需要**（CSS-first 后 IntelliSense 直接读 CSS）。

**Step 4 启动并验证**

```bash
pnpm --filter @my-lego/craft-admin dev
# 或：cd packages/craft-admin && pnpm dev
```

打开 [http://localhost:3003](http://localhost:3003)。修改 `app/app.vue` 验证：

```vue
<!-- packages/craft-admin/app/app.vue -->
<script lang="ts" setup>
import { isFunction } from '@my-lego/shared'

console.log('isFunction', isFunction('123'))

const user = useState('user', () => ({
  name: 'admin',
  age: 18,
}))
</script>

<template>
  <div class="bg-amber-100 min-h-screen p-8">
    <ul class="flex gap-4 text-lg">
      <li class="text-red-500">Home</li>
      <li class="text-blue-500">About</li>
      <li class="text-emerald-500">Contact</li>
    </ul>
    <pre class="mt-6 rounded bg-white p-4 shadow">{{ user }}</pre>
  </div>
</template>
```

刷新页面：背景变浅黄、`ul` 横向排列、三个 `li` 不同颜色 —— Tailwind 生效。

> ⚠️ 依赖版本差异
> 课程项目装完 `@nuxtjs/tailwindcss` 后能访问 [http://localhost:3000/\_tailwind/](http://localhost:3000/_tailwind/) 查看色板/间距/字体的可视化面板。
> craft-admin 用的是 `@tailwindcss/vite` 官方插件，**没有 `/_tailwind` 页面**。如果你想要可视化面板，可参考社区方案：
>
> - 自己写一个 Nuxt page 把 `@theme` 里的 token 列出来；
> - 用 [tailwind-config-viewer](https://github.com/rogden/tailwind-config-viewer)（v4 兼容性参考其 issue 跟踪）。
>
> 实际日常开发里，IDE 的 Tailwind 智能提示 + Tailwind 官网文档已经足够，`/_tailwind` 面板可有可无。

### 2.3 WebStorm 的 Tailwind 支持（替换课程里的 VSCode 插件流程）

讲师在视频里用的是 VSCode + 「Tailwind CSS IntelliSense」插件，并花了大段时间解释「插件首次装完为什么没补全」这个 v3 时代的坑：他用的 `@nuxtjs/tailwindcss` 默认**不会生成实体的 `tailwind.config.js`**，所以插件读不到配置；必须在 `nuxt.config.ts` 里加 `tailwindcss: { exposeConfig: true }`，重启后 `.nuxt/tailwind/` 下才会出现配置文件。

**WebStorm + Tailwind v4 的体验完全不同**，简单很多：

1. **不需要装任何插件**。WebStorm 自带 Tailwind CSS Language Server。
2. **不需要 `tailwind.config.js`**。Tailwind v4 是 CSS-first 配置，WebStorm 的 Language Server 直接通过 `@import "tailwindcss"` 这一行检测项目。
3. **不需要 `exposeConfig`**。原本是给 IntelliSense 插件「凑」配置文件的，v4 时代不存在这个需求。

#### Step 1 触发条件检查（通常自动生效）

WebStorm 自动启用 Tailwind 支持需要满足两个条件：

1. 当前项目的 `package.json` 里有 `tailwindcss` 依赖 —— 上一步 `pnpm add` 已经满足。
2. 项目里存在一个 CSS 文件包含 `@import "tailwindcss";` 指令 —— `app/assets/css/main.css` 已经满足。

两条都满足后，重启或刷新 WebStorm 项目，回到 `app/app.vue` 写 `class="bg-"`，应该立刻看到补全（带色块预览）。

#### Step 2 Monorepo 下可能需要的手动配置

WebStorm 在 monorepo 根打开时偶尔会找不到子包的 Tailwind 依赖（取决于版本）。如果 Step 1 没自动生效，到设置里手动指定：

```text
Settings (Preferences on macOS)
  → Languages & Frameworks
    → Style Sheets
      → Tailwind CSS
```

可以在这里：

- 把 `Language Server` 字段指向项目里的 `@tailwindcss/language-server`（如果你想用比 WebStorm bundled 更新的版本，可在子包装 `pnpm add -D @tailwindcss/language-server`，然后填 `packages/craft-admin/node_modules/@tailwindcss/language-server/bin/tailwindcss-language-server`）；
- 在 `Configuration` 区域调整补全的 HTML 属性列表、experimental 正则等高级选项（一般不需要动）。

> ⚠️ Monorepo 差异
> 课程是单仓项目，VSCode 直接打开项目根，插件自动工作。
> craft-admin 在 monorepo 根 (`/Users/tylerzzheng/projects/lego/my-lego`) 里。WebStorm 如果以 monorepo 根作为项目根打开，建议确认两点：
>
> 1. WebStorm 版本 ≥ 2024.1（更早版本对 v4 支持不全）；
> 2. 必要时手动指定 Language Server 路径（见上）。

#### 验证

在 `app/app.vue` 的 template 里输入 `class="bg-`，应当看到：

- 自动补全列出 `bg-red-500`、`bg-blue-300` 等；
- 颜色类前面有色块预览；
- 鼠标悬停某个 class 时显示对应的真实 CSS（`background-color: oklch(...)` 之类）。

---

## 3. 三维差异速查表

### 3.1 Nuxt 3 → Nuxt 4 差异（目录/路径）

| 项目          | 课程（Nuxt 3）              | craft-admin（Nuxt 4）                          |
| ------------- | --------------------------- | ---------------------------------------------- |
| `srcDir`      | 项目根                      | 项目根下的 `app/`                              |
| CSS 入口位置  | `assets/style.css`          | `app/assets/css/main.css`                      |
| `~` 别名指向 | 项目根                      | `app/`                                         |
| `nuxt.config` | 在项目根                    | 在子包根（`packages/craft-admin/`，仍然在 srcDir 外） |

### 3.2 依赖版本差异（Tailwind v3 → v4 + 安装方式）

| 项目              | 课程（Tailwind v3 + @nuxtjs/tailwindcss）              | craft-admin（Tailwind v4 + @tailwindcss/vite）   |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------ |
| 安装命令          | `npm i @nuxtjs/tailwindcss`                            | `pnpm add tailwindcss @tailwindcss/vite`         |
| 注册入口          | `modules: ['@nuxtjs/tailwindcss']`                     | `vite: { plugins: [tailwindcss()] }`             |
| CSS 入口语法      | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";`                         |
| 主题配置位置      | `tailwind.config.js` 的 `theme.extend`                 | CSS 入口里的 `@theme { … }` 块（**CSS-first**） |
| 内容扫描配置      | `tailwind.config.js` 的 `content: [...]`               | 自动扫描 + CSS 里的 `@source "..."` 指令         |
| 是否需要 PostCSS  | 隐式依赖（模块帮你装）                                 | 不需要（Vite 插件直接编译）                      |
| IntelliSense      | 需 `exposeConfig: true` 生成 `tailwind.config.js`      | 开箱即用，读 CSS 入口                            |
| 可视化变量页      | `/_tailwind/`                                          | 没有原生页面                                     |

### 3.3 Monorepo 上下文差异

| 维度          | 单仓项目（课程）         | craft-admin（pnpm workspace）                                                                                  |
| ------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 安装命令      | `npm install xxx`        | `pnpm --filter @my-lego/craft-admin add xxx`                                                                   |
| 启动命令      | `npm run dev`            | `pnpm --filter @my-lego/craft-admin dev`                                                                       |
| 端口          | Nuxt 默认 `3000`         | 已在 `nuxt.config.ts` 锁定 `3003`（避开 craft 5173 / backend 3000）                                            |
| IDE 配置位置 | 项目根 `.vscode/`        | WebStorm `Settings → Languages & Frameworks → Style Sheets → Tailwind CSS`（必要时指定 Language Server 路径）     |
| 共享代码      | 不涉及                   | `@my-lego/shared` 通过 `alias` 直连 `../shared/src/index.ts`，Tailwind 默认**不扫**该路径，需要时显式 `@source` |

> 💡 **未来章节会用到的 `@source` 指令**：当你在 `@my-lego/shared` 里写组件并用到 Tailwind class 时（暂时还没有），需要在 `main.css` 加一行：
>
> ```css
> @import "tailwindcss";
> @source "../../../shared/src/**/*.{ts,vue}";
> ```
>
> 21-1 阶段还没有这个需求，等真正在 shared 包里写带样式的组件时再加。

---

## 4. 易错点 + 关键 API 速查

### 4.1 易错点 Checklist

1. **不要 `@nuxtjs/tailwindcss` + Tailwind v4 同时装**。该模块对 v4 的官方支持仍是 beta（最后更新停在 2025-09），会出现 `Cannot start nuxt: tailwindcss as a PostCSS plugin` 之类的报错。craft-admin 只装 `tailwindcss` + `@tailwindcss/vite` 两个包。
2. **CSS 入口路径必须写对**。`css: ['~/assets/css/main.css']` 在 Nuxt 4 里 `~` 指向 `app/`，文件得放在 `app/assets/css/main.css`；课程把 `assets/` 放项目根，复刻时不要被误导。
3. **新建 `app/assets/` 后必须重启 dev server** 一次。Nuxt 启动时扫描约定目录是带缓存的，新建顶层目录或新增模块/插件都要重启。
4. **WebStorm 没补全**：先确认 `package.json` 里有 `tailwindcss` 依赖、CSS 入口里有 `@import "tailwindcss";`、WebStorm 版本 ≥ 2024.1；都对的情况下还不行，到 `Settings → Languages & Frameworks → Style Sheets → Tailwind CSS` 手动指定 Language Server 路径。
5. **`@tailwindcss/vite` 必须调用为函数**：写 `plugins: [tailwindcss()]`，**不能**写成 `plugins: [tailwindcss]`（少了括号会 Vite 报错 "is not a function"）。
6. **不要在根目录跑 `pnpm add tailwindcss`**。这会装到根 `package.json`，对子包没用，反而可能引入版本冲突。
7. monorepo 中若 packages/craft 与 packages/craft-admin 使用不同 Vite 版本，nuxt.config.ts 里 vite.plugins: [tailwindcss()] 可能出现 Plugin 类型不兼容。解决：根目录 pnpm.overrides 统一 vite 版本。

### 4.2 关键 API / 配置速查

| 项目                                              | 作用                              | 落点                                          |
| ------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| `@import "tailwindcss";`                          | 一行引入 Tailwind v4 所有 base/utilities | `app/assets/css/main.css`                     |
| `@theme { --color-brand: #f97316; }`              | CSS-first 主题定制（v4 取代 config）     | `app/assets/css/main.css`                     |
| `@source "../shared/**/*.{vue,ts}";`              | 显式添加 Tailwind 内容扫描路径           | `app/assets/css/main.css`                     |
| `css: ['~/assets/css/main.css']`                  | Nuxt 加载全局 CSS                  | `nuxt.config.ts`                              |
| `vite: { plugins: [tailwindcss()] }`              | 注册 `@tailwindcss/vite` 插件          | `nuxt.config.ts`                              |
| Settings → … → Tailwind CSS                       | WebStorm 中可指定 Language Server 路径 | WebStorm IDE 设置                              |
| `pnpm --filter <pkg> add <dep>`                   | 指定子包安装依赖                  | terminal                                      |

### 4.3 与课程相比，本节**省略**了什么

- 课程演示了 `/_tailwind/` 可视化面板 —— v4 + Vite 插件方案下没有等价物，可跳过。
- 课程为了 IntelliSense 工作配的 `exposeConfig: true` —— v4 不需要，跳过。
- 课程没有 monorepo 上下文，所以不涉及 `--filter` 与 `@source` —— craft-admin 阶段先记住 `--filter`，`@source` 等真正写到 shared 包样式时再加。

---

## 5. 本节产出 checklist（动手时对照）

- [ ] `pnpm --filter @my-lego/craft-admin add tailwindcss @tailwindcss/vite`
- [ ] 新建 `packages/craft-admin/app/assets/css/main.css`，写入 `@import "tailwindcss";`
- [ ] 修改 `packages/craft-admin/nuxt.config.ts`：`import tailwindcss from '@tailwindcss/vite'`、加 `css` 数组、加 `vite.plugins`
- [ ] 重启 dev：`pnpm --filter @my-lego/craft-admin dev`
- [ ] 在 `app/app.vue` 加 `class="bg-amber-100 flex"` 等，浏览器验证生效
- [ ] WebStorm 验证：在 class 里输入 `bg-`，能看到补全 + 色块预览；若没有，到 `Settings → Languages & Frameworks → Style Sheets → Tailwind CSS` 检查 Language Server 设置
