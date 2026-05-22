## Rule: 前端 HTTP 客户端 + 事件总线 + 全局副作用层（2026-05）

> 目的：让大模型快速理解 `@my-lego/craft` 已落地的"axios → 事件总线 → 业务胶水层"三层架构，并在新增 service / 调整事件 / 改造全局 loading 时不破坏既有契约。  
> 覆盖范围（代码事实）：`packages/craft/src/api/http/*`、`packages/craft/src/handlers/*`、`packages/craft/src/stores/globalLoading.ts`、`packages/craft/src/components/ProgressBar/index.ts`、`packages/craft/src/hooks/useService.ts`。

---

### 1) 三层架构（必须理解）

```
┌──────────────────────────────────────────────────┐
│ 拦截器层（纯 IO，零业务依赖）                       │
│   api/http/interceptors/*.ts                       │
│   - 解包 MetaResponse                             │
│   - 抛 BizError                                    │
│   - 发 http:* 事件                                 │
└──────────────────┬───────────────────────────────┘
                   ↓ httpBus（mitt 事件总线）
┌──────────────────────────────────────────────────┐
│ 业务胶水层（订阅事件，调 store/router/UI 库）        │
│   handlers/httpHandler.ts                          │
│   - bizError/systemError → message.error           │
│   - unauthorized → notification + 跳登录页          │
│   - success → message.success                      │
│   - loadingStart/End → globalLoadingStore          │
└──────────────────┬───────────────────────────────┘
                   ↓ globalLoadingStore.start/end
┌──────────────────────────────────────────────────┐
│ 副作用 UI（ProgressBar factory 单例，自挂 DOM）     │
│   components/ProgressBar/index.ts                  │
└──────────────────────────────────────────────────┘
```

**核心思想**：axios 拦截器是基础设施，不应 import 业务 store / UI 库。所有副作用（toast、跳转、loading）通过事件总线解耦到 `handlers/` 层。

---

### 2) 关键类型与约定

#### 2.1 `CraftRequestConfig` vs `ServiceConfig`（必须区分）

定义位于 `api/http/types.ts`：

```ts
// CraftRequestConfig：axios 实例接受的完整配置（含 returnRaw 控制返回类型）
interface CraftRequestConfig<RequestBody = unknown> extends AxiosRequestConfig<RequestBody> {
  silentToast?: boolean    // 抑制全局错误/成功 toast
  silentLoading?: boolean  // 抑制全局 loading 进度条
  returnRaw?: boolean      // 返回完整 MetaResponse 而非 data
}

// ServiceConfig：service 函数对外暴露的 config 类型（service 不允许业务方控制 returnRaw）
type ServiceConfig<RequestBody = unknown> = Omit<CraftRequestConfig<RequestBody>, 'returnRaw'>
```

**约定**：
- **axios 实例方法 / 拦截器**：用 `CraftRequestConfig`
- **service 函数对外参数**：用 `ServiceConfig<Body>`（返回 data 还是 MetaResponse 是 service 实现的内部决定）

#### 2.2 service 函数签名（强约定）

所有 service 函数（`api/modules/*.ts` + `stores/session.ts` 的 action）必须遵守：

```ts
// 正确
export const loginByEmail = (
  body: LoginByEmailReq,
  config?: ServiceConfig<LoginByEmailReq>,
) => httpTry(http.post<LoginResDto, LoginByEmailReq>('/v1/user/loginByEmail', body, config))

// 错误：缺少可选 config 参数（useService 无法注入 signal）
export const loginByEmail = (body: LoginByEmailReq) => ...
```

**为什么必须**：useService 通过这个 config 槽位注入 `AbortSignal` 实现取消请求。少了 config 参数 useService 仍能调用但 signal 注入会失败。

#### 2.3 `silentToast` / `silentLoading` 语义

| 字段 | 语义 | 默认 | 何时设 true |
|---|---|---|---|
| `silentToast` | 抑制所有自动 toast（错误 + 成功） | `false` | 业务方有自定义错误 UI（如登录页 inline 红字）；后台静默拉数据 |
| `silentLoading` | 抑制全局顶部 ProgressBar | `false` | 按钮自身已经有 loading 反馈，避免重复指示 |

**重要**：`silentXxx=true` 只抑制 UI 反馈，**事件依然会 emit**（业务方可订阅做自定义处理）。

#### 2.4 `BizError` 4 种 type

定义位于 `api/http/error.ts`：

| type | 含义 | 触发条件 |
|---|---|---|
| `biz` | HTTP 200 但业务 code !== 0（如用户已存在） | success 拦截器识别 `code !== SUCCESS_CODE` |
| `system` | HTTP 非 2xx 且服务端返回结构化错误（401/403/404/500 等） | error 拦截器拿到 `response.status !== 200` |
| `network` | 无 response（超时 / 断网 / CORS / 主动取消） | error 拦截器 `!axiosError.response` |
| `unknown` | 未分类（预留） | —— |

业务方判断错误类型用 `err.type`，**不要**仅看 message 文本。

---

### 3) httpBus 事件清单（必须知道有哪些事件）

定义位于 `api/http/events.ts`。

```ts
type HttpEvents = {
  'http:bizError': HttpErrorPayload         // HTTP 200 但 code !== 0
  'http:systemError': HttpErrorPayload      // HTTP 非 2xx（403/404/500 等，不含 401）
  'http:networkError': HttpErrorPayload     // 无 response（含网络中断/超时）
  'http:unauthorized': HttpErrorPayload     // HTTP 401（独立事件，便于做"跳登录"等特殊处理）
  'http:error': HttpErrorPayload            // 兜底：仅当具体错误事件无订阅者时才触发
  'http:success': HttpSuccessPayload        // HTTP 200 且 code === 0
  'http:loadingStart': HttpLoadingPayload   // request 拦截器顶部发出
  'http:loadingEnd': HttpLoadingPayload     // response success/error 拦截器顶部统一发出
}
```

**payload 类型（位于 `api/http/events.ts`）**：
- `HttpErrorPayload`: `{ error: BizError, config: CraftRequestConfig }`
- `HttpSuccessPayload<Data>`: `{ data: Data, raw: MetaResponse<Data>, config: CraftRequestConfig }`
- `HttpLoadingPayload`: `{ config: CraftRequestConfig }`

#### 3.1 `emitHttpError` 智能兜底机制

错误事件不能直接 emit 具体事件，必须用 `emitHttpError(type, payload)`：

```ts
// api/http/events.ts
export const emitHttpError = (type, payload) => {
  const handlers = httpBus.all.get(type)
  if (handlers && handlers.length > 0) {
    httpBus.emit(type, payload)
    return
  }
  httpBus.emit('http:error', payload)  // 具体事件无订阅 → 走兜底
}
```

**设计目的**：业务层只需在「订阅具体事件做精细处理」与「订阅 `http:error` 统一兜底」之间二选一，**不会出现两条订阅链同时触发导致的重复处理**。

#### 3.2 取消请求（axios cancel）的特殊处理

response 错误拦截器顶部识别 `axios.isCancel(axiosError)`：

```ts
if (axios.isCancel(axiosError)) {
  return Promise.reject(new BizError({ code: -1, message: 'canceled', type: 'network' }))
  // 注意：不 emit 任何 http:* 错误事件，让取消静默完成
}
```

**为什么**：useService.abort() 内部主动取消请求，不希望弹 toast。但 `loadingEnd` 仍会发出（事件在最顶部就 emit 了），保证计数器配对零泄漏。

---

### 4) 拦截器层（实现位置 + 关键责任）

#### 4.1 request 拦截器（`api/http/interceptors/request.ts`）

职责（按顺序）：
1. 注入 `x-trace-id`（uuidv4）
2. 注入 `Authorization: Bearer <token>`
3. **发 `http:loadingStart`**（看 `silentLoading`，下同）

#### 4.2 response success 拦截器（`api/http/interceptors/response.ts`）

**顶部必须先发 `loadingEnd`**（不管走哪个分支），然后：
1. 非 MetaResponse 结构 → 直接返回原始 response
2. `code === SUCCESS_CODE` → emit `http:success`，返回 `data` 或 `raw`（看 returnRaw）
3. `code !== SUCCESS_CODE` → 构造 `BizError(type='biz')`，`emitHttpError('http:bizError')`，reject

#### 4.3 response error 拦截器（`api/http/interceptors/response.ts`）

**顶部必须先发 `loadingEnd`**，然后：
1. `axios.isCancel` → 静默 reject（不发任何事件）
2. 无 response → `BizError(type='network')` + `emitHttpError('http:networkError')`
3. HTTP 401 → `BizError(type='system', code=401)` + `emitHttpError('http:unauthorized')`
4. 其他 → `BizError(type='system')` + `emitHttpError('http:systemError')`

**关键约束**：每个 `http:loadingStart` 必须配对一个 `http:loadingEnd`，否则 globalLoading 计数器会泄漏（进度条永不消失）。

---

### 5) 业务胶水层（`handlers/httpHandler.ts`）

订阅事件 → 调 store / message / notification / router：

```ts
// 错误类事件：silentToast=true 时跳过
httpBus.on('http:bizError', ({ error, config }) => {
  if (config.silentToast) return
  message.error(error.message)
})

// 401 用 notification（而非 message），duration=0，含「去登录」按钮
httpBus.on('http:unauthorized', ({ error, config }) => {
  if (config.silentToast) return
  notification.error({ key: UNAUTHORIZED_MESSAGE_KEY, ..., btn: 去登录按钮 })
})

// 成功：默认弹后端返回的 message
httpBus.on('http:success', ({ raw, config }) => {
  if (config.silentToast) return
  message.success(raw.message || '请求成功')
})

// loading：转发到 store，由 store 命令式驱动 ProgressBar
httpBus.on('http:loadingStart', () => useGlobalLoadingStore().start())
httpBus.on('http:loadingEnd', () => useGlobalLoadingStore().end())
```

**约定**：所有 handler 在 `setupHttpHandler()` 内一次性注册，由 `handlers/index.ts` 的 `setupEventHandlers()` 调用，在 `main.ts` 装配（必须在 pinia + router 安装之后）。

---

### 6) 全局 loading 子系统

#### 6.1 `stores/globalLoading.ts` 计数器 store

**为什么用计数器而不是 boolean**：避免并发请求时"A 完成提前关闭 loading 但 B 还在跑"的 bug。

```ts
const counter = ref(0)
const isLoading = computed(() => counter.value > 0)

const start = () => {
  counter.value++
  if (counter.value === 1) getProgressBar().start()  // 仅 0→1 触发
}

const end = () => {
  counter.value = Math.max(0, counter.value - 1)  // 不让计数器变负
  if (counter.value === 0) getProgressBar().finish()  // 仅 →0 触发
}
```

#### 6.2 `components/ProgressBar/index.ts` factory

**形态**：纯 JS factory 函数（**不是 Vue 组件**），自己创建 DOM 挂到 `document.body`。

**为什么不是 Vue 组件**：
- ProgressBar 跟 globalLoading store 本来就是为彼此而生（强耦合），用 factory 让 store 命令式调用更直接
- App.vue 不需要挂载任何东西，业务方零感知

**特性**：
- **延迟显示**：`start()` 后 `delayMs`（默认 500ms）内若 `finish()` 则不显示（避免快接口闪烁）
- **假进度算法**：显示时立即跳 30%，每 200ms 推进 `progress += (95 - progress) * 0.05`，永不超过 95%
- **lazy 单例**：globalLoading store 首次 start 时才创建 DOM

**API**：
```ts
interface ProgressBarApi {
  start(): void   // 启动一次进度（重复调用幂等，pending/showing 中再调无效）
  finish(): void  // 结束：跳 100% → 淡出 → 重置
  destroy(): void // 移除 DOM + 清定时器
}
```

---

### 7) `useService` hook（业务侧调用规范）

定义位于 `hooks/useService.ts`。

#### 7.1 核心特性

- 自动管理 `loading` / `data` / `error` 三个 ref
- **真实 AbortController**：新 execute 自动取消上一次 in-flight 请求（通过 axios signal）
- **竞态保护**：requestId 机制兜底，即使 abort 失效也只接受最新请求的结果
- **取消静默**：取消的请求不弹 toast（由拦截器 `axios.isCancel` 识别处理）
- **数组 + 对象双重返回**：按需选用

#### 7.2 API

```ts
const useService = <Data, Args>(
  service: ServiceFn<Data, Args>,
  options?: { config?: Omit<ServiceConfig<any>, 'signal'> },
): UseServiceReturn<Data, Args>
```

**`options.config`**：此 hook 内**所有** execute 调用共享的 config。**禁止配置 signal**（被 useService 独占）。

**execute 签名**：`(...args: Args) => Promise<ServiceResult<Data>>`，**只接受 service 的 body 参数，不接受 config**。如需单次特殊化 config，另开一个 useService 实例。

#### 7.3 业务侧使用模式（强制约定）

业务模块结构（参考 `views/LoginView.vue`）：每个业务功能（如"手机号登录"）的 `formRef` / `form` / `rules` / `useService` 解构 / `computed` / `handler` **必须放在同一个连续代码段内**，便于未来抽 composable 时整段搬走。

```ts
// ✅ 推荐：业务模块内聚
// ============================================================
// 业务模块 1：手机号登录
// ============================================================
const phoneFormRef = ref<FormInstance>()
const phoneForm = reactive({ phoneNumber: '', verifyCode: '' })
const phoneRules: Record<string, Rule[]> = { ... }

const [doPhoneLogin, phoneLoading] = useService(sessionStore.loginByCellphone, {
  config: { silentLoading: true },  // 按钮自身已有 loading 反馈
})

const handlePhoneLogin = async () => {
  await phoneFormRef.value?.validate()
  const [, err] = await doPhoneLogin(phoneForm)
  if (err) return
  redirectAfterLogin()
}
```

```ts
// ❌ 反模式：把 formRef、form、rules、useService 分散在多个区块
const phoneFormRef = ref<FormInstance>()
const emailFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
// ... 一坨表单数据
// ... 一坨 rules
// ... 一坨 useService
// ... 一坨 handler  ← 抽 composable 时要跨节点拼接，痛苦
```

#### 7.4 数组解构 vs 对象解构

| 场景 | 推荐 |
|---|---|
| 业务模块只关心 execute | 数组：`const [doXxx] = useService(...)` |
| 业务模块关心 execute + loading | 数组：`const [doXxx, loading] = useService(...)` |
| 需要访问 abort 方法 | 对象：`const { loading, execute, abort } = useService(...)` |
| 需要 data 渲染（如列表查询） | 数组：`const [doXxx, loading, list, error] = useService(...)` |

---

### 8) 改动连带表（强制：改了 A 必须同步改 B）

| 改了什么 | 必须同步改 |
|---|---|
| `CraftRequestConfig` 加 silentXxx 字段 | `handlers/httpHandler.ts` 增加对应分支处理；`ServiceConfig` 类型自动通过 Omit 继承（无需手改） |
| `HttpEvents` 加新事件 | 1. `events.ts` 加 payload 类型 + 事件 key<br>2. 拦截器层在合适时机 `httpBus.emit(...)`<br>3. `handlers/httpHandler.ts` 订阅<br>4. 如果是错误事件，同步更新 `emitHttpError` 的 Exclude 列表 |
| 新增 service 函数 | 必须遵守签名 `(body, config?: ServiceConfig<Body>)`；否则 useService 无法注入 signal |
| 修改 `ProgressBarApi` 接口 | 同步改 `stores/globalLoading.ts` 中的调用 |
| 把 ProgressBar 改成 Vue 组件 | 1. App.vue 需要挂载<br>2. globalLoading 改成读 store ref 让组件 watch；这是架构级改动，需要重新评估 |

---

### 9) 关键文件索引（改动入口）

- 拦截器层：
  - `packages/craft/src/api/http/types.ts`（CraftRequestConfig / ServiceConfig）
  - `packages/craft/src/api/http/events.ts`（事件清单 + emitHttpError）
  - `packages/craft/src/api/http/error.ts`（BizError）
  - `packages/craft/src/api/http/interceptors/request.ts`
  - `packages/craft/src/api/http/interceptors/response.ts`
  - `packages/craft/src/api/http/instance.ts`（axios 实例 + HttpClient 类型）
- 业务胶水层：
  - `packages/craft/src/handlers/httpHandler.ts`
  - `packages/craft/src/handlers/index.ts`（setupEventHandlers）
- 副作用 UI / store：
  - `packages/craft/src/stores/globalLoading.ts`
  - `packages/craft/src/components/ProgressBar/index.ts`
- 业务工具 hook：
  - `packages/craft/src/hooks/useService.ts`
- service 函数：
  - `packages/craft/src/api/modules/*.ts`
  - `packages/craft/src/stores/session.ts`（store 层 action 同样遵守 service 签名约定）
