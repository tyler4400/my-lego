# SSR 接口前端组件集成
_Exported on 2026/1/11 at GMT+8 23:37:07 from Cursor (2.3.29)_

---

**User**

现在pages/:id/:uuid 接口 @packages/craft-backend/src/module/work/work.controller.ts:121-135 ，是一个SSR接口，那到数据库中的work数据来渲染成一个HTML。它的关键实现是 @packages/craft-backend/src/module/work/work.service.ts:228-247 。现在只写了结构代码，这里的逻辑是拿前端项目的组件来渲染成HTML并返回给用户。前端组件在另一个子项目：@packages/craft/src/components 。 因此这里是需要引用到前端的组件代码。

我的想法有两个。 
1. @packages/craft 项目新增一个build能力，可以把组件按库模式打包。 backend项目新增craft的本地依赖。
2. 在backend的@packages/craft-backend/tsconfig.json 中增加craft的path，如同引入@my-lego/shared项目一样，直接引入craft的源码，那backend打包部署的时候也会把它带上。

我更倾向于第一个方案。你是否还有更合适的方案或者想法，欢迎提出来，我们一起讨论技术方案。你先整理对项目有一个了解，然后如果对需求有任何疑问也一起提出来

---

**Cursor**

先不写代码，我先把现状摸清楚再和你一起定方案：我会快速阅读 `packages/craft` 的组件形态（是否 `.vue` SFC）、已有的“把组件配置渲染成 VNode/HTML”的工具，以及 `craft-backend` 的构建方式（tsc/webpack/esm/cjs）。确认这些后，再对你提的两种方案做可行性/风险评估，并给出我更推荐的落地方案与伪代码流程；最后我会列出几个需要你确认的关键问题（渲染数据结构、资源/CSS、路由/接口返回格式等）。

不错，关键点已经很清晰了：`craft` 组件是 `.vue` SFC，而 `craft-backend` 目前是 `nest build` + `tsc` 走 **CommonJS**。这意味着你提的“tsconfig path 直接引源码”方案（2）会立刻撞上 **后端无法编译/运行 `.vue`** 的硬墙；要么改后端构建链支持 Vue SFC（代价高），要么就必须先把前端组件“编译成可被 Node 引用的 JS 模块”（这更接近你方案 1）。接下来我会把组件映射/渲染数据结构再确认一下，看最合理的 SSR 入口应该长什么样。

我已经确认两点对方案选择影响很大：`craft` 的组件是 `.vue` SFC（后端 tsc 不能直接编译/执行），而 `craft-backend` 的 SSR 逻辑现在只是在服务端把 `components` 打印出来，并没有像前端编辑器那样真正用 `componentMap` 去循环渲染。下一步我会把前端编辑器的渲染写法（`EditorView.vue`）和后端的 `h5page.hbs`、`Work` 的 content 结构一起看一下，这样我们就能把 SSR 入口设计得既“可编译/可部署”，又和现有数据结构完全对齐。

### 我对现状的关键理解（决定方案可行性的约束）
- **`packages/craft/src/components` 是 `.vue` SFC**（例如 `LText.vue/LImage.vue`），而 `craft-backend` 是 `nest build` + **tsc(CommonJS)**。因此 **后端无法直接通过 tsconfig path 引入 `.vue` 源码并参与编译/部署**（会卡在 `.vue` 解析、CSS/资源导入、以及 ESM/CJS 互操作上）。
- 前端真实渲染方式在 `EditorView.vue` 里已经写清楚了：本质是

  - **循环 `components`**
  - 用 **`<component :is="componentMap[comp.name]" v-bind="comp.props" />`** 渲染

  后端 `getPageData` 目前只是 `template: <p>{{components}}</p>`，还没接上这套逻辑。
- `craft-backend` 已经在用 `createSSRApp` + `renderToString`（来自 `vue/server-renderer`），说明 **SSR 技术栈方向是对的**，缺的是“可在 Node 侧引用的组件产物 + 渲染入口”。

---

### 对你两个方案的评估
- **方案 2（后端 tsconfig path 直引 craft 源码）**：我不建议  
  - **硬伤**：`.vue` SFC 后端 tsc 不会编译；即使加 path，Nest 构建链也不会帮你处理 Vue SFC/CSS。
  - **除非**：你愿意把后端构建体系升级成能打包 `.vue`（例如引入 Vite/webpack + Vue plugin 做 server bundle），但这其实就演变成“做一个 SSR bundle 构建步骤”，复杂度和维护成本都更高。
- **方案 1（craft 新增 build 能力，按库模式打包，backend 作为本地依赖）**：可行且是我更认可的大方向  
  - 但我会把它再“收敛”一下：**不要把整个 craft app 当库**，而是提供一个**SSR 专用入口**，只导出“物料组件 + render 函数”，避免把 router/pinia/编辑器依赖卷进来。

---

### 我更推荐的落地形态（在方案 1 基础上的优化）
我建议两种实现路线，按长期收益排序：

#### 方案 1A（改动最小）：在 `@my-lego/craft` 内新增 `ssr` 子入口 + library build
- **目标**：产出 `@my-lego/craft/ssr`，后端只依赖它，不碰前端 app 入口。
- **优点**：不搬目录、不拆包，上手快。
- **风险/注意**：要处理 **ESM/CJS 输出** 和 **类型声明(d.ts)**，保证 Nest(CommonJS) 能稳定引用。

#### 方案 1B（更干净/可扩展）：抽一个新包 `@my-lego/materials`（物料）+ 可选 `@my-lego/renderer`
- **目标**：把 `LText/LImage/...` 这类“运行时物料”从 app 中解耦出来，前端编辑器和后端 SSR 都依赖同一个物料包。
- **优点**：长期维护最舒服；后面你加更多端（H5 预览、站点生成、截图服务）会非常顺。
- **成本**：需要移动组件文件与少量 import 路径调整。

---

### 详细伪代码/流程（以 方案 1A 为例）
#### craft 侧（产出可被 Node 引用的 SSR 入口）
1) 新建 SSR 专用组件映射（避免引用 pinia/store）
```ts
// packages/craft/src/ssr/component-map.ts
import LText from '@/components/LText.vue'
import LImage from '@/components/LImage.vue'

export const componentMap = { LText, LImage } as const
export type ComponentName = keyof typeof componentMap
```

2) 新建“把 DB 里的 components 渲染成 HTML”的纯函数（不用 template，直接 render function）
```ts
// packages/craft/src/ssr/render-work.ts
import { createSSRApp, h, defineComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { componentMap } from './component-map'

type ComponentData = { id: string; name: keyof typeof componentMap; props: Record<string, any> }

export const renderWorkToHtml = async (components: ComponentData[]) => {
  const Page = defineComponent({
    name: 'LegoH5Page',
    setup() {
      return () =>
        h('div', { class: 'lego-page' },
          (components ?? []).map((comp) => {
            const Comp = componentMap[comp.name]
            if (!Comp) return null
            return h(Comp as any, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
    },
  })

  const app = createSSRApp(Page)
  const html = await renderToString(app)
  return { html /* 可扩展：css/head/bodyStyle */ }
}
```

3) 配置 `vite build` 以“库模式”输出 **ESM + CJS**（给后端用 CJS，未来也能给其它端用 ESM）
- 输出形态建议：`dist/ssr/index.js`（import）+ `dist/ssr/index.cjs`（require）+ `dist/ssr/*.d.ts`

4) `package.json` 增加 `exports`，暴露 `@my-lego/craft/ssr`

#### backend 侧（调用 renderWorkToHtml）
```ts
// work.service.ts (伪代码)
const { renderWorkToHtml } = await import('@my-lego/craft/ssr') // 或静态 import（取决于你最终输出的 cjs/es 方案）

const { html } = await renderWorkToHtml(work.content.components)
return { html, title: work.title, desc: work.desc }
```

#### 模板（h5page.hbs）可选增强
- 如果后续要补样式：`<style>{{{css}}}</style>` 或 `<link rel="stylesheet" href="/static/lego-h5.css">`

---

### 我需要你确认的几个关键问题（确认后我再开始写代码）
- **数据结构**：`work.content` 是否已稳定为 `{ components: ComponentData[] }`？是否还会有 `page/bodyStyle`（背景色、页面宽高、meta 等）？
- **是否需要“交互/水合”**：H5 页面只要静态 HTML（纯 SSR）就行，还是需要挂载客户端 JS 做点击跳转等交互？
- **CSS 期望**：你希望 H5 的样式“接近编辑器预览”，还是先接受“主要靠内联 style（来自 props）+ 少量全局样式”？
- **部署方式**：线上是“整仓构建并携带 workspace 包”，还是“只部署 craft-backend 子目录”？（这决定我们把 SSR 产物放在依赖里还是复制进 backend 的 dist/static）

你如果倾向继续按方案 1，我建议优先选 **1A（在 craft 内做 `@my-lego/craft/ssr` 子入口）**：最少改动也最贴合你现有想法。你确认上面 4 个问题后，我再给出最终技术方案定稿（包含目录结构、build 脚本、产物形态），并等你明确“确认”后再开始实施编码。

```typescript
// packages/craft/src/ssr/component-map.ts
import LText from '@/components/LText.vue'
import LImage from '@/components/LImage.vue'

export const componentMap = { LText, LImage } as const
export type ComponentName = keyof typeof componentMap
```

```typescript
// packages/craft/src/ssr/render-work.ts
import { createSSRApp, h, defineComponent } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { componentMap } from './component-map'

type ComponentData = { id: string; name: keyof typeof componentMap; props: Record<string, any> }

export const renderWorkToHtml = async (components: ComponentData[]) => {
  const Page = defineComponent({
    name: 'LegoH5Page',
    setup() {
      return () =>
        h('div', { class: 'lego-page' },
          (components ?? []).map((comp) => {
            const Comp = componentMap[comp.name]
            if (!Comp) return null
            return h(Comp as any, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
    },
  })

  const app = createSSRApp(Page)
  const html = await renderToString(app)
  return { html /* 可扩展：css/head/bodyStyle */ }
}
```

```typescript
// work.service.ts (伪代码)
const { renderWorkToHtml } = await import('@my-lego/craft/ssr') // 或静态 import（取决于你最终输出的 cjs/es 方案）

const { html } = await renderWorkToHtml(work.content.components)
return { html, title: work.title, desc: work.desc }
```

---

**User**

我总体同意你的方案。先回答你的问题：
1. 数据结构。目前work.content的数据结构如同 @packages/craft/src/stores/editor.ts:9-50 。后面应该还会新增为page/bodyStyle（背景色、页面宽高、meta 等），我们目前不用管这些新增的，后面再进行扩展。
2. 关于交互， 目前不需要，但后面需求会有需要，需要可扩展。我们下次功能就会做到。你也可以告诉我考虑到后面需要交互，我们目前的设计有什么异同。
3.  样式主要靠内联 style（来自 props）+ 少量全局样式。
4. 部署方式后面会采用docker部署，前后端应该是各自部署，前端是nginx。 我的想法是每次build的时候，先构建前端SSR产物，产物放到@packages/craft-backend/static 目录，在build backend的时候自动会被带上，成为静态服务的一部分。但是感觉这可能不是最优方案，我还需要你的建议。

你先解决上述问题，然后如果没有疑问，再出技术方案

---

**Cursor**

我先把你说的“把 SSR 产物放到 `craft-backend/static` 并随 backend 一起进镜像”这条链路验证一下：重点是后端现在怎么暴露静态资源、views 模板如何引用静态文件，以及我们把 SSR 运行时代码放到哪里最合适（public static vs 私有 runtime bundle）。我先把 `app.module.ts`/静态服务配置读出来，再给出建议与最终技术方案。

Nice，这里发现一个对“把产物丢进 `craft-backend/static`”很关键的点：后端确实通过 `ServeStaticModule` 暴露了 `/static/*`，但当前配置里 **`/static` 的 rootPath 似乎也指向了运行时 upload 目录**（而不是随代码发布的 `dist/craft-backend/static`）。我再把 `static-assets.utils.ts` 看一下确认路径逻辑，然后基于实际行为给你部署建议。

### 逐条回应你刚才 4 点（并补充我这边的关键发现）

- **1）数据结构**：OK。我们先把 SSR 入口设计成只依赖 `content.components: Array<{ id; name; props }>`，并预留可选参数（后续扩展 `bodyStyle/meta` 时不破坏接口）。

- **2）交互/可扩展（水合）**：现在不需要交互，但**要为下次“SSR + Hydration”留钩子**。设计上我建议“同一套页面组件树复用在 server 和 client”：
  - **现在（纯 SSR）**：后端 `renderToString(createPageApp(components))` → 返回 `html`
  - **以后（Hydration）**：模板里注入 `window.__LEGO_DATA__ = components` + 引入客户端 bundle；客户端用同一个 `createPageApp(components)`，`createSSRApp(Page).mount('#app')` 直接水合（DOM 复用）
  - **所以现在的异同点**：现在只需要“server renderer 模块”；以后要额外产出“client entry + 静态资源（js/css）”，并在 `h5page.hbs` 多插入 2 段脚本（数据注入 + entry 引用）。我们现在把接口返回结构预留 `dataJson/scriptSrc/cssHref` 字段即可平滑升级。

- **3）样式（内联 + 少量全局）**：可行，但要注意一个细节：你现有 `LText.vue` 里有 **`<style scoped>`**。这类样式在 SSR 下要生效，通常需要**把构建产物里的 CSS 文件一并带到页面里**（`<link rel="stylesheet">`），否则只能靠 props 内联样式，`scoped` 那些规则会丢失。  
  结论：**我们按你的要求做“内联为主 + 额外引一个很小的全局 CSS（或构建输出的 CSS）”。**

- **4）部署/产物放哪（你提的 static 方案）**：我建议把“server 运行时代码”和“public 静态资源”分开处理：
  - **推荐**：
    - **server renderer（给 Node 执行的 JS 模块）**：作为 `craft-backend` 的依赖（workspace 本地依赖），或复制到后端 `dist` 的**非 public 目录**里（不走 `/static`）
    - **client 资源（未来 hydration 用的 js/css）**：放 `/static/...`（这部分放 `craft-backend/static` 非常合理）
  - **原因**：`/static` 是公开可访问、带强缓存策略的；把“后端执行的 renderer 代码”放进去没有必要，还会引入缓存/暴露/版本对齐问题。
  - **关键发现（会直接影响你 static 方案是否能跑）**：目前 `StaticAssetsModule` 里 `/static` 的 `rootPath` **看起来误用了运行时 upload 目录**，而不是“随代码发布的 `dist/.../static`”。代码里已经有 `resolvePackagedStaticRootPath()`，但没用上。  
    - 这意味着：**即使你把产物放进 `packages/craft-backend/static`，运行时也可能根本不会从那个目录对外提供**（需要先把这块配置对齐）。

---

### 我建议的技术方案（定稿版，基于你偏好的方案 1A）

#### 核心目标
- 在 `@my-lego/craft` 内新增一个 **SSR 专用子入口**：`@my-lego/craft/ssr`
- 该入口输出的是**已编译的 Node 可执行模块**（不让后端去碰 `.vue` 源码）
- 后端 `WorkService.getPageData()` 只负责取数据并调用 renderer，拿到 `html` 后 `res.render('h5page', ...)`

#### 产物拆分（为“下次要交互”提前铺路）
- **Server bundle（必须）**：`renderWorkToHtml(components)` 或 `createPageApp(components)`  
- **Client bundle（暂时可不做，但结构要预留）**：`hydrateEntry.js` + `style.css`（未来放 `/static/lego-h5/...`）

#### 构建/依赖方式（推荐顺序）
- **后端依赖 craft 的 SSR 子入口（workspace 本地依赖）**  
  - `craft` build 产出 `dist-ssr/server/index.cjs`（确保后端 CommonJS 能 `require`）
  - `craft` 的 `package.json exports` 暴露 `./ssr`，同时提供 `require` 指向 `.cjs`
  - `craft-backend` 里直接 `import/require '@my-lego/craft/ssr'`

#### 后端静态资源（CSS/未来 hydration）承载
- 修正 `StaticAssetsModule`：`/static` 应该指向 **packaged static root**（`resolvePackagedStaticRootPath()`），`/static/upload` 指向 runtime upload root（现在这块已经对了）
- 然后你“把 CSS/客户端产物拷贝进 `packages/craft-backend/static/lego-h5/*`，随 nest build 带进 dist”这条链路就成立

---

### 需要你确认的 2 个决策点（确认后我就可以开始给出更细的伪代码到文件级改动清单）
- **A. renderer 放置策略**（二选一，我推荐 1）  
  - **(推荐)** `craft-backend` 直接依赖 `@my-lego/craft/ssr`（renderer 不走 `/static`）  
  - (备选) renderer 也复制进 `craft-backend/dist` 某个私有目录，再用绝对路径动态加载（实现更绕）
- **B. scoped CSS 的处理**  
  - **(推荐)** 保留 scoped，构建输出的 CSS 作为静态资源 `<link>` 引入  
  - (备选) 把组件 scoped 样式迁移为全局 CSS（改动更大，但运行时更直观）

你回复确认 **A/B** 的选择后，我会给出**最终“技术方案文档级”的步骤清单 + 伪代码（到模块/文件粒度）**，并等你明确说“可以开始实现”再进入编码。

---

**User**

后端静态资源服务我已经修复，/static和/static/upload是有两个静态服务@packages/craft-backend/src/common/static/static-assets.module.ts @packages/craft-backend/src/common/static/static-assets.module.ts:124 。

1. render放置策略，选择直接依赖即可。不走static。
2. 保留 scoped，构建输出的 CSS 作为静态资源 <link> 引入。

我决定我们这次直接把水合也做上， 代码直接放在client端，构建成srr产物， 然后在后端依赖。 这样是否server bundle和client bundle可以使用同一套或类似了。

如果没有问题，就先给我更细的伪代码，我确认之后再给到文件夹的改动清单。我自己来修改代码。 如果还有需要敲定的， 我们就先继续讨论

---

**Cursor**

### 结论：SSR + 水合这次一起做没问题，但**必须是“两份产物”**，只是**共享同一套源码/同一个 `createPageApp`**
你说的“代码放在 client 端，构建成 SSR 产物，然后后端依赖”，这里有个概念要拆开：

- **Server bundle（Node 执行）**：负责 `renderToString()`，必须能在 Node 环境跑，通常是一个“库入口”（`@my-lego/craft/ssr`）。
- **Client bundle（浏览器执行）**：负责 `hydrate`（挂载并复用 SSR DOM），是静态资源（JS/CSS），通过 `/static/...` 引入。

它们**不能合成同一个 bundle**（运行环境不同），但可以做到：
- **共用同一套组件、同一套渲染树、同一个 `createPageApp(content)`**  
- 仅在 server/client 各自入口里做很薄的一层包装（server 调 `renderToString`，client 调 `mount`）

---

### 细化伪代码（到模块/函数级）

#### 1）共享层（server/client 共用）：`createPageApp`
目标：给定 DB 的 `components`，生成一棵稳定的 Vue 组件树（SSR 输出与客户端 hydration 输出一致）。

```ts
type ComponentData = {
  id: string
  name: 'LText' | 'LImage' | string
  props: Record<string, any>
}

type WorkContent = {
  components: ComponentData[]
  // 未来扩展：page/bodyStyle/meta...
}

const componentMap = {
  LText: LTextComponent,
  LImage: LImageComponent,
} as const

const createPageApp = (content: WorkContent) => {
  const components = content?.components ?? []

  // 注意：这里用 createSSRApp，server/client 都用同一套，客户端会自动走 hydration
  const app = createSSRApp({
    name: 'LegoH5Root',
    setup() {
      return () => {
        return h(
          'div',
          { class: 'lego-h5-page' },
          components.map((comp) => {
            const Comp = componentMap[comp.name as keyof typeof componentMap]
            if (!Comp) return null // 未知物料直接跳过，避免 SSR 崩
            return h(Comp as any, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
      }
    },
  })

  return app
}
```

#### 2）Server 入口：`renderWorkToHtml`
目标：后端调用一个函数拿到 SSR HTML（以及未来可选的 head/css/script 信息）。

```ts
const renderWorkToHtml = async (content: WorkContent) => {
  const app = createPageApp(content)
  const html = await renderToString(app)

  return {
    html,                 // 注入到 hbs 的 {{{html}}}
    // 未来扩展：
    // headTags: string,
    // bodyStyle: string,
  }
}
```

#### 3）Client 入口：`hydrate`
目标：浏览器拿到服务端注入的数据，用同一套 `createPageApp` 挂载到 `#app` 完成水合。

```ts
declare global {
  interface Window {
    __LEGO_PAGE_DATA__?: WorkContent
  }
}

const hydrate = () => {
  const content = window.__LEGO_PAGE_DATA__
  if (!content || !Array.isArray(content.components)) return

  const app = createPageApp(content)

  // createSSRApp 在客户端 mount 会执行 hydration（要求 DOM 结构一致）
  app.mount('#app')
}

hydrate()
```

---

### 后端如何把“SSR + 水合需要的东西”拼成完整 HTML

#### 4）后端：`getPageData()` 需要返回的字段（建议）
你当前 `h5page.hbs` 已经有 `title/desc/bodyStyle/html`，这次我们加上：

- **`payloadJson`**：`window.__LEGO_PAGE_DATA__` 的 JSON（要安全注入）
- **`cssHrefs`**：CSS 链接数组（来自 client build manifest）
- **`scriptSrc`**：客户端 entry 脚本地址（同样来自 manifest）

伪代码：

```ts
const safeJsonForHtmlScript = (val: unknown) => {
  // 防止 </script> 注入 & 少数情况下的 HTML 解析问题
  return JSON.stringify(val).replace(/</g, '\\u003c')
}

let cachedClientAssets: null | { scriptSrc: string; cssHrefs: string[] } = null

const getClientAssets = () => {
  if (cachedClientAssets) return cachedClientAssets

  // 读取 /static/lego-h5/manifest.json（manifest 由 client build 生成）
  const manifest = readJson('/abs/path/to/packaged/static/lego-h5/manifest.json')

  // 假设 client entry 是 src/ssr/client-entry.ts
  const entry = manifest['src/ssr/client-entry.ts']

  cachedClientAssets = {
    scriptSrc: `/static/lego-h5/${entry.file}`,
    cssHrefs: (entry.css ?? []).map((cssFile: string) => `/static/lego-h5/${cssFile}`),
  }

  return cachedClientAssets
}

const getPageData = async (id: number, uuid: string) => {
  const work = await findPublishedWorkOrThrow(id, uuid)

  const content = work.content as WorkContent
  const { html } = await renderWorkToHtml(content)
  const { scriptSrc, cssHrefs } = getClientAssets()

  return {
    title: work.title,
    desc: work.desc,
    bodyStyle: '', // 目前先空；未来扩展 page/bodyStyle 时再填
    html,

    payloadJson: safeJsonForHtmlScript(content),
    scriptSrc,
    cssHrefs,
  }
}
```

#### 5）模板 `h5page.hbs` 需要的结构（伪代码）
```hbs
<head>
  <title>{{title}}</title>
  <meta name="description" content="{{desc}}">
  {{#each cssHrefs}}
    <link rel="stylesheet" href="{{this}}">
  {{/each}}
</head>

<body style="{{bodyStyle}}">
  <div id="app">{{{html}}}</div>

  <script>
    window.__LEGO_PAGE_DATA__ = {{{payloadJson}}};
  </script>

  <script type="module" src="{{scriptSrc}}"></script>
</body>
```

---

### 构建产物与依赖关系（你选的策略下的最稳实现）

#### 6）`@my-lego/craft` 需要产出两类东西
- **server renderer（给后端依赖，不走 `/static`）**
  - 形态：`@my-lego/craft/ssr` 导出 `renderWorkToHtml`（以及可选 `createPageApp`/类型）
  - 建议输出：**ESM + CJS 双格式**（避免 Nest(CJS) 引用摩擦；否则后端用 `await import()` 也行）
- **client assets（给浏览器加载，走 `/static/lego-h5/*`）**
  - 形态：构建到一个目录，包含 `assets/*.js`、`assets/*.css`、`manifest.json`

#### 7）关于“这次就做水合”的一个关键点
- **你必须在后端能拿到 client build 的 manifest**，才能把正确的 hash 文件名注入 `h5page.hbs`
- 所以你要么：
  - **(推荐)** 构建阶段把 `craft` 的 client dist **复制**到 `craft-backend/static/lego-h5/`（随 `nest build` 带进镜像）
  - 或者后端静态服务直接指向 `craft` 的 client dist（Docker 多容器/多挂载时不太优雅）

---

### 我还需要你敲定的 3 个小点（确认后我再给“文件级改动清单”）
- **A）静态资源子目录名**：用 `/static/lego-h5/` 可以吗？（manifest 与 assets 都放这下面）
- **B）client entry 的 key**：你希望 manifest 里以哪个 entry 作为注入基准？（例如 `src/ssr/client-entry.ts`）
- **C）后端引用 server renderer 的方式**：
  - 你更想要 **CJS 可 `require`** 的产物（更直观），还是接受后端用 `await import('@my-lego/craft/ssr')`（更省配置）？

你确认 A/B/C 后，我会把上面的伪代码进一步“落到文件/目录结构 + 每个文件职责 + build 命令与产物路径”的清单，你照着改就能一次跑通 SSR + hydration。

```typescript
type ComponentData = {
  id: string
  name: 'LText' | 'LImage' | string
  props: Record<string, any>
}

type WorkContent = {
  components: ComponentData[]
  // 未来扩展：page/bodyStyle/meta...
}

const componentMap = {
  LText: LTextComponent,
  LImage: LImageComponent,
} as const

const createPageApp = (content: WorkContent) => {
  const components = content?.components ?? []

  // 注意：这里用 createSSRApp，server/client 都用同一套，客户端会自动走 hydration
  const app = createSSRApp({
    name: 'LegoH5Root',
    setup() {
      return () => {
        return h(
          'div',
          { class: 'lego-h5-page' },
          components.map((comp) => {
            const Comp = componentMap[comp.name as keyof typeof componentMap]
            if (!Comp) return null // 未知物料直接跳过，避免 SSR 崩
            return h(Comp as any, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
      }
    },
  })

  return app
}
```

```typescript
const renderWorkToHtml = async (content: WorkContent) => {
  const app = createPageApp(content)
  const html = await renderToString(app)

  return {
    html,                 // 注入到 hbs 的 {{{html}}}
    // 未来扩展：
    // headTags: string,
    // bodyStyle: string,
  }
}
```

```typescript
declare global {
  interface Window {
    __LEGO_PAGE_DATA__?: WorkContent
  }
}

const hydrate = () => {
  const content = window.__LEGO_PAGE_DATA__
  if (!content || !Array.isArray(content.components)) return

  const app = createPageApp(content)

  // createSSRApp 在客户端 mount 会执行 hydration（要求 DOM 结构一致）
  app.mount('#app')
}

hydrate()
```

```typescript
const safeJsonForHtmlScript = (val: unknown) => {
  // 防止 </script> 注入 & 少数情况下的 HTML 解析问题
  return JSON.stringify(val).replace(/</g, '\\u003c')
}

let cachedClientAssets: null | { scriptSrc: string; cssHrefs: string[] } = null

const getClientAssets = () => {
  if (cachedClientAssets) return cachedClientAssets

  // 读取 /static/lego-h5/manifest.json（manifest 由 client build 生成）
  const manifest = readJson('/abs/path/to/packaged/static/lego-h5/manifest.json')

  // 假设 client entry 是 src/ssr/client-entry.ts
  const entry = manifest['src/ssr/client-entry.ts']

  cachedClientAssets = {
    scriptSrc: `/static/lego-h5/${entry.file}`,
    cssHrefs: (entry.css ?? []).map((cssFile: string) => `/static/lego-h5/${cssFile}`),
  }

  return cachedClientAssets
}

const getPageData = async (id: number, uuid: string) => {
  const work = await findPublishedWorkOrThrow(id, uuid)

  const content = work.content as WorkContent
  const { html } = await renderWorkToHtml(content)
  const { scriptSrc, cssHrefs } = getClientAssets()

  return {
    title: work.title,
    desc: work.desc,
    bodyStyle: '', // 目前先空；未来扩展 page/bodyStyle 时再填
    html,

    payloadJson: safeJsonForHtmlScript(content),
    scriptSrc,
    cssHrefs,
  }
}
```

```plaintext
<head>
  <title>{{title}}</title>
  <meta name="description" content="{{desc}}">
  {{#each cssHrefs}}
    <link rel="stylesheet" href="{{this}}">
  {{/each}}
</head>

<body style="{{bodyStyle}}">
  <div id="app">{{{html}}}</div>

  <script>
    window.__LEGO_PAGE_DATA__ = {{{payloadJson}}};
  </script>

  <script type="module" src="{{scriptSrc}}"></script>
</body>
```

---

**User**

A确认。
B确认。
C。 require

前端水合js可以输出一条console.log，方便观察确认以及日后添加业务代码。

客户端水合代码，能否也可以直接放到client的ssr构建产物中，这样在server端import引入后，渲染注入hbs。 就像引入createPageApp方法一样。 否则还需要手动或脚本来拷贝水合代码？

---

**Cursor**

### 结论：**水合代码不能只靠 server `require` 同一个产物来“顺便注入”**，但你可以做到**不需要手写拷贝脚本**
原因很简单：水合代码要在**浏览器**执行，必须以 `<script src="...">`（或 inline script）形式出现在 HTML 里；server `require()` 进来只是让它在 **Node** 里可用/可执行，并不会自动变成浏览器脚本。

---

### 你问的“能否把水合代码也放进 ssr 构建产物里，然后 server import 后渲染注入 hbs？”
可以做，但我不建议，分两种情况：

- **1）你指的是“把水合源码也导出（例如导出 `hydrate()`）”**  
  - 这只是在 Node 侧拿到了一个函数，**浏览器不会执行它**，除非你把它“再变成字符串注入到 `<script>` 里”。  
  - 这会变成“运行时拼脚本字符串”，可维护性/安全性都一般。

- **2）你指的是“把浏览器可执行的 bundle（打包后的 js）当字符串读取并 inline 注入 hbs”**  
  - 技术上可行（后端读文件内容，`{{{inlineJs}}}` 塞进 `<script>`），但不推荐：HTML 变巨大、缓存困难、CSP 更难配、也不利于后续拆包/按需加载。

**更推荐的做法**：仍然产出 client bundle（静态资源），但通过构建配置让它**直接输出到** `craft-backend/static/lego-h5/`，这样**无需额外拷贝脚本**。

---

### 推荐实现（满足你 A/B/C + 不用手动拷贝）
#### 1）`craft` 产出两份东西（共享同一套 `createPageApp` 源码）
- **server library（CJS，可被后端 `require`）**：导出 `renderWorkToHtml()`、可选导出 `createPageApp()`/类型
- **client bundle（静态资源）**：带 hash 的 `assets/*.js`、`assets/*.css`、以及 `manifest.json`

#### 2）关键点：client bundle 的 `outDir` 直接指向后端静态目录
也就是把 Vite 的 client build 输出目录设为类似：
- `../craft-backend/static/lego-h5/`

这样你 `pnpm -r build` 时：
- `craft` 先把 client 产物落到后端的 `static/lego-h5`
- `nest build` 会把 `craft-backend/static/**` 作为 assets 拷贝进 `dist/.../static/**`
- 线上访问就是 `/static/lego-h5/...`

**这不算“拷贝脚本”，而是“构建直接输出到目标目录”**，最省事、最稳。

---

### 客户端水合入口加 `console.log`（你要的观察点）
client entry 里加一条即可：

```ts
console.log('[lego-h5] hydration entry loaded')
```

以及 mount 前后也可以再加一条，比如：

```ts
console.log('[lego-h5] hydrating...', window.__LEGO_PAGE_DATA__)
```

---

### 你确认一下 2 个小细节（我就认为方案完全敲定）
- **1）构建顺序**：根目录 `build` 里是否保证 `craft` 的 build 先跑（至少先产出 `static/lego-h5/manifest.json`），再跑 `craft-backend build`？（用 pnpm filter 或 run-s/r 分阶段最稳）
- **2）manifest 的 entry key**：我们用你确认的 `src/ssr/client-entry.ts` 作为 manifest 的 key；后端按这个 key 找到 `file/css` 注入到 `h5page.hbs`。

只要这两点 OK，你这次做 SSR + Hydration 的工程结构就是“共享核心渲染逻辑 + 双产物 + client 产物直出到 backend static”，后续加交互也会非常顺滑。

```typescript
console.log('[lego-h5] hydration entry loaded')
```

```typescript
console.log('[lego-h5] hydrating...', window.__LEGO_PAGE_DATA__)
```

---

**User**

那还是你的推荐实现来。
1.  我不确定根目录的build @package.json:7 是否会按顺序执行。我觉得最好我们改造一下backend的构建脚，让其build的时候先构建前端srr产物。
2. ok的。

我不喜欢require('@my-lego/craft/ssr')的写法， 也可以按照backend的的通用写法使用import吧， SSR构建产物使用import写法是ok的吧？

如果没问题，你按上面的计划出改动清单，我照着修改代码。 注意要按照步骤来， 我照着抄写就可以好， 记得写好注释。 有问题的话，我们继续讨论

---

**Cursor**

### 关于 `import`（不用 `require`）是否 OK
可以。`craft-backend` 虽然最终编译成 CommonJS，但你在 TS 里用

- `import { renderWorkToHtml } from '@my-lego/craft/ssr'`

是完全 OK 的：编译后会变成 `require()` + 解构。关键是 **`@my-lego/craft/ssr` 必须提供 CJS 产物**（我们会在 `exports.require` 指向 `.cjs`）。

---

### 改动清单（按步骤照抄即可）

> 目标：一次性打通 **SSR + Hydration**  
> - server：后端 `import` 调 `renderWorkToHtml(content)` 得到 `html`  
> - client：`/static/lego-h5/*` 加载入口 JS，`console.log` + `mount('#app')` 水合  
> - CSS：保留 `.vue <style scoped>`，由 client build 输出 CSS 并在 `h5page.hbs` 里 `<link>` 引入  
> - 构建：`craft-backend build` 先触发 `craft` 的 `build:h5` + `build:ssr`

---

## 1）`packages/craft`：新增 SSR 目录（共享逻辑 + client entry）

新增目录：`src/ssr/`

#### 1.1 新建 `src/ssr/types.ts`
```ts
export type ComponentData = {
  /** 数据库里的组件 id（uuid） */
  id: string
  /** 组件名：必须能映射到 componentMap */
  name: string
  /** 组件 props：用于 v-bind */
  props: Record<string, any>
}

export type WorkContent = {
  /** 画布组件列表 */
  components: ComponentData[]
  /** 未来扩展：page/bodyStyle/meta...（先不做） */
}
```

#### 1.2 新建 `src/ssr/component-map.ts`
> 注意：这里**不要**从 `stores/editor.ts` 引 `componentMap`（会把 pinia/编辑器依赖带进 SSR）。

```ts
import LText from '@/components/LText.vue'
import LImage from '@/components/LImage.vue'

export const componentMap = {
  LText,
  LImage,
} as const
```

#### 1.3 新建 `src/ssr/create-page-app.ts`
```ts
import { createSSRApp, defineComponent, h } from 'vue'
import type { WorkContent } from './types'
import { componentMap } from './component-map'

/**
 * 共享的“创建页面 App”方法
 * - server 侧：renderToString(createPageApp(content))
 * - client 侧：createPageApp(content).mount('#app')（Hydration）
 */
export const createPageApp = (content: WorkContent) => {
  const components = content?.components ?? []

  const Root = defineComponent({
    name: 'LegoH5Root',
    setup() {
      return () => {
        return h(
          'div',
          { class: 'lego-h5-page' },
          components.map((comp) => {
            const Comp = (componentMap as any)[comp.name]
            if (!Comp) return null
            return h(Comp, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
      }
    },
  })

  return createSSRApp(Root)
}
```

#### 1.4 新建 `src/ssr/render-work-to-html.ts`
```ts
import { renderToString } from 'vue/server-renderer'
import type { WorkContent } from './types'
import { createPageApp } from './create-page-app'

/** 仅在 Node 侧使用：把 work.content 渲染成 HTML */
export const renderWorkToHtml = async (content: WorkContent) => {
  const app = createPageApp(content)
  const html = await renderToString(app)
  return { html }
}
```

#### 1.5 新建 `src/ssr/client-entry.ts`
> 你要求的 `console.log`：加在这里最直观。后续加业务代码也在这里扩展。

```ts
import type { WorkContent } from './types'
import { createPageApp } from './create-page-app'

declare global {
  interface Window {
    __LEGO_PAGE_DATA__?: WorkContent
  }
}

console.log('[lego-h5] client entry loaded')

const handleHydrate = () => {
  const content = window.__LEGO_PAGE_DATA__
  if (!content || !Array.isArray(content.components)) {
    console.log('[lego-h5] no page data, skip hydration')
    return
  }

  console.log('[lego-h5] hydrating...', content)

  const app = createPageApp(content)
  app.mount('#app')
}

handleHydrate()
```

#### 1.6 新建 `src/ssr/index.ts`
```ts
export type { WorkContent, ComponentData } from './types'
export { createPageApp } from './create-page-app'
export { renderWorkToHtml } from './render-work-to-html'
```

---

## 2）`packages/craft`：新增两套 Vite 构建配置 + scripts

你需要两个 build：
- **h5(client)**：输出到 `packages/craft-backend/static/lego-h5/`，带 `manifest.json`
- **ssr(server lib)**：输出 CJS，可被后端 `import` 使用

### 2.1 新建 `vite.h5.config.ts`（client build）
要点：
- `outDir` 指到后端静态目录（避免拷贝脚本）
- `manifest: true`
- `rollupOptions.input` 指向 `src/ssr/client-entry.ts`
- `base` 建议设成 `/static/lego-h5/`（保证资源路径稳定）

```ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  base: '/static/lego-h5/',
  build: {
    outDir: fileURLToPath(new URL('../craft-backend/static/lego-h5', import.meta.url)),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/ssr/client-entry.ts', import.meta.url)),
    },
  },
})
```

### 2.2 新建 `vite.ssr.config.ts`（server lib build）
要点：
- lib mode 打包 `src/ssr/index.ts`
- 输出 **CJS**（后端偏好）
- `vue` / `vue/server-renderer` 建议 external（避免重复打包，且与后端版本一致）

```ts
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-ssr',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/ssr/index.ts', import.meta.url)),
      name: 'CraftSsr',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external: ['vue', 'vue/server-renderer'],
    },
  },
})
```

### 2.3 修改 `packages/craft/package.json`
新增 scripts + exports（让后端能 `import '@my-lego/craft/ssr'`）。

```json
{
  "scripts": {
    "build:h5": "vite build -c vite.h5.config.ts",
    "build:ssr": "vite build -c vite.ssr.config.ts"
  },
  "exports": {
    "./ssr": {
      "require": "./dist-ssr/index.cjs"
    }
  }
}
```

> 说明：你只要求 `require` 友好（C），所以这里先只配 `require`。后续如果要 ESM/types，我们再补 `import/types`（或加 d.ts 产出）。

---

## 3）`packages/craft-backend`：让 backend build 先构建 craft 产物（不依赖根 build 顺序）

### 3.1 修改 `packages/craft-backend/package.json`
- 添加 workspace 依赖：保证拓扑关系清晰（也利于 IDE 解析）
- 改 `build`：先跑 craft 的 `build:h5` 与 `build:ssr`，再 `nest build`

```json
{
  "dependencies": {
    "@my-lego/craft": "workspace:*"
  },
  "scripts": {
    "build": "pnpm --filter @my-lego/craft run build:h5 && pnpm --filter @my-lego/craft run build:ssr && nest build"
  }
}
```

---

## 4）`craft-backend`：读取 client manifest，注入 hbs（CSS + JS + 数据）

### 4.1 新增一个 helper（建议放在 `src/common/ssr/` 之类）
职责：
- 读取 `static/lego-h5/manifest.json`
- 找到 entry（key 就是你确认的 `src/ssr/client-entry.ts`）
- 返回 `{ scriptSrc, cssHrefs }`
- 做进程内缓存（避免每次请求都读文件）

伪代码核心逻辑（你照着写成 TS 文件即可）：
```ts
// 关键点：manifest 路径用 resolvePackagedStaticRootPath() + 'lego-h5/manifest.json'
const ENTRY_KEY = 'src/ssr/client-entry.ts'

// 返回值：
// scriptSrc: /static/lego-h5/xxx.js
// cssHrefs: ['/static/lego-h5/xxx.css', ...]
```

### 4.2 修改 `views/h5page.hbs`
- 循环插入 css
- 注入 `window.__LEGO_PAGE_DATA__`
- 加载 client script（type="module"）

（示意）
```hbs
{{#each cssHrefs}}
<link rel="stylesheet" href="{{this}}">
{{/each}}

<script>
  window.__LEGO_PAGE_DATA__ = {{{payloadJson}}};
</script>
<script type="module" src="{{scriptSrc}}"></script>
```

### 4.3 修改 `WorkService.getPageData()`
- 用 `import { renderWorkToHtml } from '@my-lego/craft/ssr'`
- `payloadJson` 用安全 stringify（至少替换 `<` 防 `</script>` 注入）
- 调 helper 得到 `scriptSrc/cssHrefs`
- 返回给 `h5page.hbs`

---

### 最后确认（我认为没有阻塞了）
- 你要的：**backend 用 import、client entry 有 console.log、无需手动拷贝水合代码** —— 都能满足。
- 你接下来照这个清单改就能跑；如果你希望我把第 4 步的“manifest 解析 + payloadJson 安全注入”写成可直接复制的完整 TS 代码片段（含注释与类型），你说一声我再补上。

```typescript
export type ComponentData = {
  /** 数据库里的组件 id（uuid） */
  id: string
  /** 组件名：必须能映射到 componentMap */
  name: string
  /** 组件 props：用于 v-bind */
  props: Record<string, any>
}

export type WorkContent = {
  /** 画布组件列表 */
  components: ComponentData[]
  /** 未来扩展：page/bodyStyle/meta...（先不做） */
}
```

```typescript
import LText from '@/components/LText.vue'
import LImage from '@/components/LImage.vue'

export const componentMap = {
  LText,
  LImage,
} as const
```

```typescript
import { createSSRApp, defineComponent, h } from 'vue'
import type { WorkContent } from './types'
import { componentMap } from './component-map'

/**
 * 共享的“创建页面 App”方法
 * - server 侧：renderToString(createPageApp(content))
 * - client 侧：createPageApp(content).mount('#app')（Hydration）
 */
export const createPageApp = (content: WorkContent) => {
  const components = content?.components ?? []

  const Root = defineComponent({
    name: 'LegoH5Root',
    setup() {
      return () => {
        return h(
          'div',
          { class: 'lego-h5-page' },
          components.map((comp) => {
            const Comp = (componentMap as any)[comp.name]
            if (!Comp) return null
            return h(Comp, { key: comp.id, ...(comp.props ?? {}) })
          }),
        )
      }
    },
  })

  return createSSRApp(Root)
}
```

```typescript
import { renderToString } from 'vue/server-renderer'
import type { WorkContent } from './types'
import { createPageApp } from './create-page-app'

/** 仅在 Node 侧使用：把 work.content 渲染成 HTML */
export const renderWorkToHtml = async (content: WorkContent) => {
  const app = createPageApp(content)
  const html = await renderToString(app)
  return { html }
}
```

```typescript
import type { WorkContent } from './types'
import { createPageApp } from './create-page-app'

declare global {
  interface Window {
    __LEGO_PAGE_DATA__?: WorkContent
  }
}

console.log('[lego-h5] client entry loaded')

const handleHydrate = () => {
  const content = window.__LEGO_PAGE_DATA__
  if (!content || !Array.isArray(content.components)) {
    console.log('[lego-h5] no page data, skip hydration')
    return
  }

  console.log('[lego-h5] hydrating...', content)

  const app = createPageApp(content)
  app.mount('#app')
}

handleHydrate()
```

```typescript
export type { WorkContent, ComponentData } from './types'
export { createPageApp } from './create-page-app'
export { renderWorkToHtml } from './render-work-to-html'
```

```typescript
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  base: '/static/lego-h5/',
  build: {
    outDir: fileURLToPath(new URL('../craft-backend/static/lego-h5', import.meta.url)),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/ssr/client-entry.ts', import.meta.url)),
    },
  },
})
```

```typescript
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@my-lego/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist-ssr',
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/ssr/index.ts', import.meta.url)),
      name: 'CraftSsr',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external: ['vue', 'vue/server-renderer'],
    },
  },
})
```

```json
{
  "scripts": {
    "build:h5": "vite build -c vite.h5.config.ts",
    "build:ssr": "vite build -c vite.ssr.config.ts"
  },
  "exports": {
    "./ssr": {
      "require": "./dist-ssr/index.cjs"
    }
  }
}
```

```json
{
  "dependencies": {
    "@my-lego/craft": "workspace:*"
  },
  "scripts": {
    "build": "pnpm --filter @my-lego/craft run build:h5 && pnpm --filter @my-lego/craft run build:ssr && nest build"
  }
}
```

```typescript
// 关键点：manifest 路径用 resolvePackagedStaticRootPath() + 'lego-h5/manifest.json'
const ENTRY_KEY = 'src/ssr/client-entry.ts'

// 返回值：
// scriptSrc: /static/lego-h5/xxx.js
// cssHrefs: ['/static/lego-h5/xxx.css', ...]
```

```plaintext
{{#each cssHrefs}}
<link rel="stylesheet" href="{{this}}">
{{/each}}

<script>
  window.__LEGO_PAGE_DATA__ = {{{payloadJson}}};
</script>
<script type="module" src="{{scriptSrc}}"></script>
```

---

**User**


我完成SSR的部分时候会有如下报错：
For the code present, we get this error:
```
找不到模块“@my-lego/craft/ssr”或其相应的类型声明。
```
 @packages/craft-backend/src/module/work/work.service.ts:1-4 

这里报错的原因是缺少类型定义文件吧，是不是应该打包的时候也生成dts文件？

@packages/craft/src/ssr @packages/craft/vite.ssr.config.ts @packages/craft/package.json 

---

**Cursor**

我先快速定位这个报错是“类型声明缺失”还是“exports/产物路径不匹配导致 TS 根本找不到模块”。我会读一下你 `dist-ssr` 实际输出文件名约定（你现在用的是 `index.${format}`），再对照 `package.json exports` 的 `./dist-ssr/index.cjs`，以及后端 tsconfig 的 `moduleResolution` 行为，给出最小修改方案（通常是：修正输出文件名 + 增加 `.d.ts` 生成/声明）。

是的，**你现在这个报错本质上就是“后端 TS 找不到 `@my-lego/craft/ssr` 的类型声明”**（以及/或者没有把 `@my-lego/craft` 作为依赖被正确装进 backend 的 `node_modules`）。你现在的 SSR 产物已经存在（`packages/craft/dist-ssr/index.cjs`），`exports` 也指到了它，所以**运行时大概率没问题**；问题主要在 **TypeScript 类型解析**。

但注意：这个报错信息同时包含“找不到模块…或其相应的类型声明”，常见原因有两类：

- **(A) backend 没有安装/声明依赖**：`craft-backend/package.json` 没写 `@my-lego/craft: workspace:*`，IDE/tsc 可能根本找不到这个包。
- **(B) 包存在，但没有 `.d.ts`**：TS 能解析到 JS 入口，但没有类型声明，就报你看到的错误（尤其在 monorepo + exports 场景更常见）。

你问“是不是应该打包的时候也生成 dts？”——**对，应该生成**。最省事的方式是：给 `@my-lego/craft/ssr` 提供一个**手写的类型入口**（不必立刻上完整 dts build），或者用 `vite-plugin-dts` 自动生成。

下面给你两种方案，从“最快可用”到“更规范”排序。

---

### 方案 1（最快、改动最小，推荐先用）：手写 `.d.ts` 给 `./ssr` 子路径
你已经有 `src/ssr/types.ts`，所以可以在 `packages/craft` 根目录加一个 `ssr.d.ts`（或 `dist-ssr/index.d.ts` 也行），内容只需要声明导出的函数/类型即可。

你可以直接写：

```ts
declare module '@my-lego/craft/ssr' {
  export type ComponentData = {
    id: string
    name: string
    props: Record<string, any>
  }

  export type WorkContent = {
    components: ComponentData[]
  }

  export const renderWorkToHTML: (content: WorkContent) => Promise<{ html: string }>
}
```

然后在 `packages/craft/package.json` 的 `exports` 里补上 `types` 指向这个声明文件，例如：

```json
"exports": {
  "./ssr": {
    "types": "./ssr.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

这样 backend 的 TS 立刻就能识别 `@my-lego/craft/ssr`。

---

### 方案 2（更规范）：SSR build 同时产出 `d.ts`
用 `vite-plugin-dts` 或单独跑 `tsc --emitDeclarationOnly` 为 `src/ssr` 产出声明。

- **优点**：类型自动跟着代码走，不用手写维护
- **缺点**：需要加插件/配置（你现在在 ask mode，我就不直接改了，等你需要我可以给完整配置稿）

---

### 另外一个你需要确认的点（很可能也是你现在的根因之一）
你现在的 `craft-backend/tsconfig.json` 的 `paths` 只配了 `@my-lego/shared`，**没有任何 `@my-lego/craft` 的 paths**。这没问题，因为你走的是 workspace 包依赖，不需要 paths。

但前提是：**`craft-backend/package.json` 必须显式依赖 `@my-lego/craft`**，否则很多情况下 IDE/tsc 不会把它当成可解析模块（即使 monorepo 里有这个包）。

所以我建议你同时检查/补上：
- `packages/craft-backend/package.json` 增加：`"@my-lego/craft": "workspace:*"`

---

### 你现在最应该怎么做（按优先级）
1. **确认 backend 已声明依赖**：`craft-backend/package.json` 里有 `@my-lego/craft: workspace:*`
2. **按方案 1 加 `ssr.d.ts` + exports.types**（最快把报错消掉）
3. 后续再升级到方案 2 自动产出 dts（可选）

如果你把你现在 `packages/craft/src/ssr/index.ts` 的实际导出内容贴一下（6 行那个），我可以把上面 `ssr.d.ts` 精确到你当前的导出命名（你现在后端 import 的是 `renderWorkToHTML`，大小写要完全一致）。

```typescript
declare module '@my-lego/craft/ssr' {
  export type ComponentData = {
    id: string
    name: string
    props: Record<string, any>
  }

  export type WorkContent = {
    components: ComponentData[]
  }

  export const renderWorkToHTML: (content: WorkContent) => Promise<{ html: string }>
}
```

```json
"exports": {
  "./ssr": {
    "types": "./ssr.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

---

**User**

我想按方案2自动产出dts，应该怎么做？

---

**Cursor**

我会先确认一下 `craft` 里对 `.vue` 的类型声明（`env.d.ts` 是否有 `declare module '*.vue'`），以及你当前 `vite-plugin-dts` 的输出目录/文件名是否能被 `exports.types` 精准指到。确认后我给你一套“自动产出 dts + 后端可识别”的最小配置（两种实现：vite-plugin-dts 或 tsc emitDeclarationOnly，你选其一）。

你现在 **已经在自动产 dts 了**（`dist-ssr/types/ssr/index.d.ts` 已生成），只是 **`package.json exports` 没把 types 指到这个 dts**，所以 backend TS 仍然报“找不到模块或类型声明”。

### 你按“方案 2（自动产 dts）”需要做的最小改造

#### 1）把 dts 产物变成“一个稳定入口文件”：`dist-ssr/index.d.ts`
现在 dts 在：`dist-ssr/types/ssr/index.d.ts`  
更推荐让它最终落成：`dist-ssr/index.d.ts`（这样 `exports.types` 很直观）。

你有两种做法，选其一：

##### 做法 A（推荐）：调整 `vite-plugin-dts` 配置，直接在 `dist-ssr` 生成入口
把 `vite.ssr.config.ts` 里的 dts 配置改成类似这样（关键是 `outDir` + `insertTypesEntry`）：

```ts
dts({
  tsconfigPath: './tsconfig.app.json',
  rollupTypes: true,
  outDir: 'dist-ssr',
  include: ['src/ssr/index.ts'],
  insertTypesEntry: true,
})
```

- 目标效果：生成 `dist-ssr/index.d.ts`（或至少生成一个可作为入口的 d.ts 文件）

##### 做法 B（不依赖插件行为）：保持现状 + exports.types 指向当前文件
如果你不想折腾 dts 输出结构，就直接用现在的路径：

- `exports.types` 指向 `./dist-ssr/types/ssr/index.d.ts`

---

#### 2）在 `packages/craft/package.json` 的 `exports` 里补上 `types`
你现在是：

```json
"exports": {
  "./ssr": {
    "require": "./dist-ssr/index.cjs"
  }
}
```

改成（二选一，对应上面 A/B）：

- **对应做法 A（有 dist-ssr/index.d.ts）**：

```json
"exports": {
  "./ssr": {
    "types": "./dist-ssr/index.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

- **对应做法 B（保持当前 dts 目录结构）**：

```json
"exports": {
  "./ssr": {
    "types": "./dist-ssr/types/ssr/index.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

这样 backend 里的

```ts
import { renderWorkToHTML } from '@my-lego/craft/ssr'
```

就能同时拿到 **runtime（cjs）** + **types（d.ts）**。

---

### 额外提醒（你现在环境里确实还缺一个东西）
`packages/craft/env.d.ts` 目前只有：

- `/// <reference types="vite/client" />`

如果你 SSR 代码里 **直接 import 了 `.vue`**（例如 componentMap 引 `LText.vue`），通常还需要补：

```ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

否则 `vite-plugin-dts/tsc` 在某些情况下会对 `.vue` 类型推断不完整或报错（你现在能生成 dts，说明暂时没卡，但建议补齐，后面更稳）。

---

### 我建议你现在就选哪个？
- **想最稳、最省时间**：先用 **做法 B**（不动 dts 输出结构，只改 `exports.types`）。
- **想产物更“标准库”**：用 **做法 A**，让 dts 入口固定为 `dist-ssr/index.d.ts`。

你告诉我你选 A 还是 B，我再给你一份“最终应长什么样”的 `vite.ssr.config.ts` + `package.json exports` 的完整片段（带注释、可直接复制）。

```typescript
dts({
  tsconfigPath: './tsconfig.app.json',
  rollupTypes: true,
  outDir: 'dist-ssr',
  include: ['src/ssr/index.ts'],
  insertTypesEntry: true,
})
```

```json
"exports": {
  "./ssr": {
    "require": "./dist-ssr/index.cjs"
  }
}
```

```json
"exports": {
  "./ssr": {
    "types": "./dist-ssr/index.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

```json
"exports": {
  "./ssr": {
    "types": "./dist-ssr/types/ssr/index.d.ts",
    "require": "./dist-ssr/index.cjs"
  }
}
```

```typescript
import { renderWorkToHTML } from '@my-lego/craft/ssr'
```

```typescript
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

