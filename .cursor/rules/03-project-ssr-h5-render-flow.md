## Rule: H5 页面 SSR + Hydration 流程（Vite manifest 驱动）（2026-01）

> 目的：让大模型/协作者**快速理解当前项目已落地的 H5 成品页 SSR（服务端渲染）+ Hydration（客户端水合）链路**，并在后续改动时不破坏关键契约。  
> 覆盖范围（代码事实）：  
> - 后端：`packages/craft-backend/src/module/work/work.controller.ts`、`packages/craft-backend/src/module/work/workToH5.service.ts`、`packages/craft-backend/views/h5page.hbs`  
> - 前端（SSR 子模块）：`packages/craft/src/ssr/*`  
> - 构建配置：`packages/craft/vite.h5.config.ts`、`packages/craft/vite.ssr.config.ts`  
> - 全局约束（路由前缀/版本、静态资源策略）：`packages/craft-backend/src/main.ts`、`packages/craft-backend/src/common/static/*`

---

### 1) 一句话总览（必须与代码一致）

- **构建期**：`@my-lego/craft` 产出两类产物：
  - **SSR server lib**：`dist-ssr/index.cjs`（后端通过 `@my-lego/craft/ssr` 引入）
  - **H5 client assets**：`static/lego-h5/`（给浏览器执行 hydration 的 `clientEntry-*.js` + `*.css` + `.vite/manifest.json`）
- **请求期**：`GET /{PREFIX}/{VERSION}/work/pages/:id/:uuid` → 后端查库拿 `work.content` → `renderWorkToHTML()` 渲染 HTML → HBS 模板注入 HTML/数据/JS/CSS
- **浏览器期**：`clientEntry.ts` 读取 `window.__LEGO_PAGE_DATA__` → `createPageApp(content).mount('#app')` 完成 hydration

---

### 2) 真实路由与前缀/版本规则（非常容易踩坑）

后端（`@my-lego/craft-backend`）在 `src/main.ts` 中启用了：

- **全局前缀**：env `PREFIX`（默认 `/api`）
- **URI 版本**：env `VERSION`（可能是 `v1`；也可能为空，空则使用 `VERSION_NEUTRAL`）

因此 H5 成品页的真实路径是：

- `GET /{PREFIX}/{VERSION}/work/pages/:id/:uuid`

> 重要：这不是“纯静态站点路由”，它属于 Nest Controller 路由，同样会被全局 prefix/version 影响。

---

### 3) 构建产物契约（Vite manifest 驱动注入，必须严格一致）

#### 3.1 H5 客户端入口（manifest 的 entry key 是“代码契约”）

后端从 Vite manifest 中寻找固定 key（代码事实）：

- `H5_MANIFEST_ENTRY_KEY = 'src/ssr/clientEntry.ts'`

因此以下内容必须保持一致：

- `packages/craft/vite.h5.config.ts`
  - `rollupOptions.input` 指向 `./src/ssr/clientEntry.ts`
  - `base: '/static/lego-h5/'`（影响 `<script src>`/`<link href>` 的 URL 前缀）
- `packages/craft-backend/src/module/work/workToH5.service.ts`
  - `H5_STATIC_PREFIX = '/static/lego-h5/'`
  - `H5_MANIFEST_ENTRY_KEY = 'src/ssr/clientEntry.ts'`

> 结论：**改入口路径/文件名/目录结构**时，必须同步修改 Vite config 与后端 `H5_MANIFEST_ENTRY_KEY`，否则 hydration 资源会注入失败。

#### 3.2 manifest 的物理位置（构建后由后端读取）

后端读取 manifest 的绝对路径（代码事实）：

- `manifestAbsPath = resolvePackagedStaticRootPath()/lego-h5/.vite/manifest.json`

其中 `resolvePackagedStaticRootPath()` 指向“随构建产物发布的静态目录”（dist 内的 static）。

---

### 4) SSR（服务端渲染）执行链路（Node 侧）

#### 4.1 Controller → Service → SSR → 模板渲染

- Controller：`WorkController.renderH5Page()`
  - 读取 `:id/:uuid`
  - `pageData = workToH5Service.getPageData(id, uuid)`
  - `res.render('h5page', pageData)` 输出 HTML

- Service：`WorkToH5Service.getPageData()`
  - DB 查询：仅允许 `status = Published`
  - SSR：`renderWorkToHTML(work.content)` → 返回 `{ html }`
  - Hydration 资源解析：`getH5ClientAssets()`（读取 manifest，并**进程内缓存**）
  - 安全注入 JSON：`payloadJson = createSafeJson(work.content)`

#### 4.2 SSR 渲染函数（`@my-lego/craft/ssr`）

- `renderWorkToHTML(content)`
  - `app = createPageApp(content)`（内部用 `createSSRApp`）
  - `html = renderToString(app)`

> 注意：此处渲染逻辑不依赖浏览器环境；只能使用可在 Node 侧执行的代码（Vue SSR 约束）。

---

### 5) HBS 模板注入契约（必须遵守，否则会出现“渲染/水合/安全”问题）

模板：`packages/craft-backend/views/h5page.hbs`

- **SSR HTML 必须三花括号**：`{{{html}}}`
  - 避免 `<div>` 等被转义成纯文本
- **payload JSON 必须三花括号 + 安全 JSON**：`window.__LEGO_PAGE_DATA__ = {{{payloadJson}}};`
  - `payloadJson` 只能来自 `createSafeJson()` 或等价的“可安全注入 `<script>` 的 JSON 字面量”实现
  - 禁止直接把未处理的字符串拼进 `<script>`（容易脚本提前闭合/XSS）
- **JS/CSS 只能由 manifest 注入**（hash 文件名不可写死）
  - `<script type="module" src="{{scriptSrc}}"></script>`
  - `{{#each cssHrefs}}<link rel="stylesheet" href="{{this}}">{{/each}}`

---

### 6) Hydration（客户端水合）执行链路（浏览器侧）

入口：`packages/craft/src/ssr/clientEntry.ts`

- 全局变量契约：
  - `window.__LEGO_PAGE_DATA__`（类型 `WorkContent`）
  - `content.components` 必须是数组，否则跳过 hydration（代码事实：`isArray` 校验）
- 复用同一套 App 创建逻辑：
  - `app = createPageApp(content)`
  - `app.mount('#app')`

> 说明：这里复用 `createPageApp()` 的意义是“SSR 与 CSR 使用完全相同的组件树创建逻辑”，降低 hydration mismatch 的概率。

---

### 7) 静态资源访问限制（/static 的 Origin 校验，高频 403 根因）

后端在 `src/main.ts` 中显式把 `StaticOriginAllowMiddleware` 挂载到了 Express 的 `/static`：

- 若配置了 `STATIC_ALLOWED_ORIGINS`（非空），则 `/static/*` 仅允许来自该 allowlist 的请求
- 若未配置/为空，则完全放开

并且该中间件策略是“尽力而为”（代码事实）：

- 优先使用 `Origin` 头
- `Origin` 不存在则尝试 `Referer`
- 两者都没有则放行（避免误伤）

> 高频问题：SSR 页面能打开，但 CSS/JS 403 → 表现为“页面没样式/没水合”。  
> 排查关键点：确认 `STATIC_ALLOWED_ORIGINS` 是否包含你打开 SSR 页面的来源（例如 `http://localhost:3000` 或前端域名）。

---

### 8) 改动清单（改哪里必须同步哪里）

- **改 `clientEntry` 路径/文件名**：
  - 同步改：`vite.h5.config.ts` 的 `rollupOptions.input`
  - 同步改：`WorkToH5Service.H5_MANIFEST_ENTRY_KEY`
- **改静态前缀（`base`/`H5_STATIC_PREFIX`）**：
  - 同步改：`vite.h5.config.ts` 的 `base`
  - 同步改：`WorkToH5Service.H5_STATIC_PREFIX`
  - 同步改：`h5page.hbs` 中引用方式（若从模板侧拼接发生变化）
- **改注入全局变量名（`__LEGO_PAGE_DATA__`）**：
  - 同步改：`h5page.hbs` 注入脚本
  - 同步改：`clientEntry.ts` 读取逻辑与类型声明
- **新增/改组件名**：
  - 必须确保 `work.content.components[].name` 对应 `componentMap` 的 key
  - 否则 SSR/CSR 都会渲染为 `null`（页面缺块但不一定报错）

---

### 9) 常见故障定位（按症状快速定位）

- **报错 `manifest.json 资源不存在`**：
  - 没有执行 `pnpm -F @my-lego/craft run build:h5`
  - 或静态产物未被拷贝到 dist（打包发布场景）
- **SSR 页面有内容，但 hydration 不生效**：
  - 检查 `view-source` 是否注入了 `window.__LEGO_PAGE_DATA__`
  - 检查 `scriptSrc` 是否 200（浏览器 Network）
  - 检查 `STATIC_ALLOWED_ORIGINS` 是否导致 `/static/lego-h5/*` 403
- **更新了 H5 client 构建，但线上仍旧引用旧 hash**：
  - `WorkToH5Service.getH5ClientAssets()` 有进程内缓存
  - 需要重启后端进程，或提供显式的缓存失效机制（当前实现：重启即可）

---

### 10) 关键文件索引（改动入口）

- 后端渲染入口：
  - `packages/craft-backend/src/module/work/work.controller.ts`
  - `packages/craft-backend/src/module/work/workToH5.service.ts`
  - `packages/craft-backend/views/h5page.hbs`
- 前端 SSR 子模块（被后端复用）：
  - `packages/craft/src/ssr/createPageApp.tsx`
  - `packages/craft/src/ssr/renderWorkToHTML.ts`
  - `packages/craft/src/ssr/clientEntry.ts`
  - `packages/craft/src/ssr/types.ts`
- 构建配置：
  - `packages/craft/vite.h5.config.ts`
  - `packages/craft/vite.ssr.config.ts`
- 全局路由/静态策略：
  - `packages/craft-backend/src/main.ts`
  - `packages/craft-backend/src/common/static/static-origin-allow.middleware.ts`
  - `packages/craft-backend/src/common/static/static-assets.utils.ts`


