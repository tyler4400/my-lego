## Rule: 前端路由守卫 + 鉴权 + 错误处理边界（2026-05）

> 目的：让大模型快速理解 `@my-lego/craft` 已落地的"路由守卫如何与 session store / httpHandler 协作"，并在新增页面 / 调整鉴权策略时不破坏既有契约。  
> 覆盖范围（代码事实）：`packages/craft/src/router/index.ts`、`packages/craft/src/router/guards.ts`、`packages/craft/src/stores/session.ts`、`packages/craft/src/handlers/httpHandler.ts`、`packages/craft/src/views/NotFoundView.vue`、`packages/craft/index.html`。

---

### 1) 文件职责分工（必须遵守）

| 文件 | 只做什么 | 不能做什么 |
|---|---|---|
| `router/index.ts` | 声明路由表（含 meta）、`declare module 'vue-router'` 扩展 meta 类型 | **不引入业务 store**、不写守卫逻辑 |
| `router/guards.ts` | 守卫实现：`beforeEach` + `afterEach`，导出 `setupRouterGuards(router)` | 不直接装配（不调用 `setupRouterGuards`） |
| `handlers/index.ts` | 在 `setupEventHandlers()` 中调用 `setupRouterGuards(router)` | 不写守卫具体逻辑 |
| `views/NotFoundView.vue` | 404 兜底页 UI | —— |

**装配链**：`main.ts` → `setupEventHandlers()` → `setupRouterGuards(router)` → 守卫注册到 router。

**为什么这么分**：router/index.ts 是声明式的"是什么"，guards.ts 是命令式的"怎么做"，关注点分离。

---

### 2) `meta` 字段类型与语义（必须与代码一致）

定义位于 `router/index.ts` 顶部（`declare module 'vue-router'`）：

```ts
interface RouteMeta {
  title?: string             // 浏览器 tab 标题
  requiresAuth?: boolean     // 未登录访问 → 跳登录页
  hideForLoggedIn?: boolean  // 已登录访问 → 跳 redirect 或首页
}
```

#### 2.1 当前路由表（代码事实）

| path | name | meta |
|---|---|---|
| `/` | `home` | `{ title: '首页', requiresAuth: true }` |
| `/editor` | `editor` | `{ title: '编辑器', requiresAuth: true }` |
| `/login` | `login` | `{ title: '登录', hideForLoggedIn: true }` |
| `/:pathMatch(.*)*` | `notFound` | `{ title: '页面未找到' }` |

#### 2.2 新增页面的 meta 选用

- **大多数业务页**：`requiresAuth: true`
- **登录页 / 注册页 / 密码找回页**：`hideForLoggedIn: true`
- **公开页（如 about / privacy）**：什么都不加（默认）
- **404 兜底**：放在路由表最后，path 用 `/:pathMatch(.*)*`

---

### 3) 守卫职责（beforeEach 三大判断分支）

`router/guards.ts` 的 `beforeEach` 按顺序处理三件事：

#### 3.1 兜底拉用户信息（刷新页面场景）

```ts
if (session.isLogin && !session.userInfo.id) {
  const [, err] = await session.fetchMe({ silentToast: true })
  if (err) {
    session.logout()
    message.warning('登录已过期，请重新登录')
    return { name: 'login', query: { redirect: to.fullPath } }
  }
}
```

**关键点**：
- 判断条件：`session.isLogin`（token 存在）且 `!session.userInfo.id`（userInfo 还没拉过，典型场景是用户刷新页面 / 直接打开 URL）
- **必须传 `silentToast: true`**：阻止 `http:unauthorized` notification 弹出（守卫已主动跳登录，不需要重复 UI）
- fetchMe 失败 → 守卫主动 `logout` + 跳登录，**不**等待用户点 notification

#### 3.2 鉴权拦截（未登录访问需鉴权页面）

```ts
if (to.meta.requiresAuth && !session.isLogin) {
  message.warning('请先登录后再访问该页面')
  return { name: 'login', query: { redirect: to.fullPath } }
}
```

#### 3.3 已登录拦截（已登录访问 login 等页面）

```ts
if (to.meta.hideForLoggedIn && session.isLogin) {
  message.info('您已登录')
  return (to.query.redirect as string) || '/'
}
```

**重要**：三个重定向分支**都要弹 message 提示**让用户知晓页面变化的原因，不能静默跳转。

---

### 4) afterEach 设置 document.title（必须用 afterEach 而非 beforeResolve）

```ts
const SITE_NAME = '海豹乐高'
const SITE_TAGLINE = '最创意的海报生成工具'

router.afterEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - ${SITE_NAME} - ${SITE_TAGLINE}`
    : `${SITE_NAME} - ${SITE_TAGLINE}`
})
```

**为什么用 afterEach**：
- `beforeEach`/`beforeResolve` 可以取消导航 → title 改了但路由没切，**不一致**
- `afterEach` 在导航 100% 确认完成后触发，零风险

**title 模板**：`{pageTitle} - {SITE_NAME} - {SITE_TAGLINE}`，与 `packages/craft/index.html` 默认 title 一致。无 `meta.title` 时退化为 `{SITE_NAME} - {SITE_TAGLINE}`。

---

### 5) 401 处理的边界（守卫 vs httpHandler）

这是一个**关键设计差异**，新加业务时必须区分：

| 触发来源 | 处理方 | 如何处理 |
|---|---|---|
| **守卫触发的 fetchMe 失败（含 401）** | `router/guards.ts` | 守卫主动 `logout` + 跳 login + `message.warning` |
| **业务调用触发的 401**（如用户在编辑器保存时 token 过期） | `handlers/httpHandler.ts` 的 `http:unauthorized` 订阅 | 弹 `notification.error` 含「去登录」按钮，等用户点击才 logout + 跳转 |

**为什么不统一**：
- 守卫场景下用户**正在切换页面**，没有正在做的事，直接强制跳转最干净
- 业务场景下用户**正在编辑/查看**，强制跳走会丢失未保存数据，留 notification 让用户**主动决定**

**实现机制**：
- 守卫调 `fetchMe({ silentToast: true })`，让 `http:unauthorized` handler 的 `if (config.silentToast) return` 命中，跳过 notification
- 业务方调 service 时**不传** silentToast，handler 正常弹 notification

---

### 6) 重定向 `redirect` query 的契约

登录跳转保留原路径，登录后回跳：

- 跳登录：`{ name: 'login', query: { redirect: to.fullPath } }`
- 登录成功后（`views/LoginView.vue` 的 `redirectAfterLogin`）：`router.replace((route.query.redirect as string) || '/')`
- vue-router **自动 encode/decode** query 对象，**不要手动** `encodeURIComponent`

`handlers/httpHandler.ts` 的 `handleGoLogin` 也遵守同样的 redirect 契约。

---

### 7) NotFoundView 的设计约定

位置：`views/NotFoundView.vue`

**关键约束**：
- 用 ant-design-vue 的 `<Result status="404">` 作为底座（与项目设计语言统一）
- 主按钮"回到首页"用 `type="primary"`（蓝色，ant-design-vue 默认主色）
- "返回上一页"用 default 样式
- "回到首页"用 `router.replace`（避免后退又回到 404）
- "返回上一页"若 `window.history.length <= 1` 则回退到 `router.replace('/')`

---

### 8) 改动连带表（强制：改了 A 必须同步改 B）

| 改了什么 | 必须同步改 |
|---|---|
| `RouteMeta` 加字段（如 `requiresRole`） | 1. `router/index.ts` 的 `declare module 'vue-router'`<br>2. `router/guards.ts` 增加对应分支判断 |
| 新增路由 | 1. `router/index.ts` 加路由表项<br>2. 决定 meta：`requiresAuth` / `hideForLoggedIn` / `title` |
| 修改站点名 / 宣传语 | 1. `router/guards.ts` 的 `SITE_NAME` / `SITE_TAGLINE`<br>2. `packages/craft/index.html` 的 `<title>` 默认值 |
| 修改"登录后跳转"逻辑 | 1. `views/LoginView.vue` 的 `redirectAfterLogin`<br>2. `handlers/httpHandler.ts` 的 `handleGoLogin`<br>3. `router/guards.ts` 的 `hideForLoggedIn` 分支返回值 |
| 修改"未登录跳哪儿" | `router/guards.ts` 的 `requiresAuth` 分支返回值（默认是 `{ name: 'login', query: { redirect } }`） |

---

### 9) 常见问题（FAQ）

#### Q1：刷新页面后用户信息丢失？
**A**：检查 `router/guards.ts` 的 `beforeEach` 是否被装配。`handlers/index.ts` 必须调用 `setupRouterGuards(router)`，且 `setupEventHandlers()` 必须在 `main.ts` 的 `app.use(router)` 之后调用。

#### Q2：登录页可以正常访问，但守卫弹了 toast？
**A**：检查路由 meta 是否漏配。已登录用户访问无 `hideForLoggedIn` 的页面是合法的，不应触发拦截。

#### Q3：401 弹了两个提示（notification + warning）？
**A**：守卫调 `fetchMe` 时**没传** `silentToast: true`，导致 httpHandler 也响应了 `http:unauthorized`。修复方式：守卫主动接管错误处理时必须传 `silentToast: true`。

#### Q4：title 偶尔显示错误（旧 title）？
**A**：检查是否把 title 写到了 `beforeEach`/`beforeResolve` 中。这两个钩子可以取消导航，应改用 `afterEach`。

---

### 10) 关键文件索引（改动入口）

- 路由表与 meta 类型：`packages/craft/src/router/index.ts`
- 守卫实现：`packages/craft/src/router/guards.ts`
- 守卫装配：`packages/craft/src/handlers/index.ts`
- session store（`fetchMe` / `logout` / `isLogin`）：`packages/craft/src/stores/session.ts`
- 业务调用触发的 401：`packages/craft/src/handlers/httpHandler.ts`
- 404 页：`packages/craft/src/views/NotFoundView.vue`
- 站点默认 title：`packages/craft/index.html`
