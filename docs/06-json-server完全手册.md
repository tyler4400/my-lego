# json-server 完全手册

> 基于 Express 封装的零配置 Mock Server。给一个 JSON 文件就能换来一整套 RESTful API。
>
> 本手册结合 lego 低代码项目实战，统一返回结构为 `{ errno, data: { list, count } }`。

---

## 目录

- [一、基础篇](#一基础篇)
  - [1. json-server 是什么](#1-json-server-是什么)
  - [2. 安装与启动](#2-安装与启动)
  - [3. db.json 与自动路由](#3-dbjson-与自动路由)
- [二、查询能力（零代码）](#二查询能力零代码)
- [三、进阶定制（二开模式）](#三进阶定制二开模式)
  - [1. 动态数据：db.js + faker](#1-动态数据dbjs--faker)
  - [2. 作为 Express 中间件](#2-作为-express-中间件)
  - [3. URL 重写](#3-url-重写)
  - [4. 自定义返回结构](#4-自定义返回结构)
  - [5. 添加自定义接口](#5-添加自定义接口)
- [四、JWT 鉴权](#四jwt-鉴权)
  - [1. 手写鉴权](#1-手写鉴权)
  - [2. json-server-auth 插件](#2-json-server-auth-插件)
- [五、实用技巧](#五实用技巧)
- [六、适用场景与局限](#六适用场景与局限)
- [七、推荐插件清单](#七推荐插件清单)

---

## 一、基础篇

### 1. json-server 是什么

- 基于 **Express + lowdb** 封装
- 给一个 `db.json`，自动生成完整 RESTful API（GET/POST/PUT/PATCH/DELETE）
- 写操作会**真实持久化**到 db.json，可以当迷你数据库用
- 适用场景：前后端并行开发、组件库 demo、E2E 测试 mock

### 2. 安装与启动

```bash
# 项目级安装
npm install -D json-server

# package.json 加脚本
"scripts": {
  "mock": "json-server --watch db.json --port 3000"
}

npm run mock
```

### 3. db.json 与自动路由

```json
{
  "templates": [
    { "id": 1, "title": "模板A", "coverImg": "xxx.png" }
  ],
  "works": [
    { "id": 1, "userId": 100, "title": "我的作品" }
  ],
  "profile": { "name": "viking" }
}
```

启动后**自动生成的路由**：

| 节点类型 | 自动生成的路由 |
|---------|----------------|
| 数组 (`templates`) | `GET/POST /templates`、`GET/PUT/PATCH/DELETE /templates/:id` |
| 对象 (`profile`) | `GET/PATCH/PUT /profile` |

---

## 二、查询能力（零代码）

下面这些**不用写一行代码**就能直接用。结合 lego 项目的 `templates` 数据示例：

```bash
# 过滤
GET /templates?type=h5&isHot=true

# 模糊搜索（全文）
GET /templates?q=春节

# 分页（_page 从 1 开始）
GET /templates?_page=2&_limit=10

# 排序
GET /templates?_sort=copiedCount&_order=desc

# 切片
GET /templates?_start=0&_end=10

# 范围（_gte / _lte / _ne）
GET /templates?copiedCount_gte=100&copiedCount_lte=500

# 关系嵌套
GET /works/1?_embed=comments    # 带出该 work 下的评论
GET /comments/1?_expand=work    # 带出该评论所属的 work

# 操作符
GET /templates?title_like=春     # 模糊匹配
GET /templates?id_ne=1           # 不等于
```

> **响应头自动带 `X-Total-Count`**，前端可以直接拿来做分页 UI。

---

## 三、进阶定制（二开模式）

CLI 用法适合快速 mock。**真实项目要对齐后端规范，必须二次开发。**

### 1. 动态数据：db.js + faker

把 `db.json` 换成 `db.js`，每次启动动态生成数据：

```js
// db.js
const { faker } = require('@faker-js/faker')

module.exports = () => {
  const templates = []
  for (let i = 1; i <= 50; i++) {
    templates.push({
      id: i,
      title: faker.lorem.words(3),
      coverImg: faker.image.url(),
      copiedCount: faker.number.int({ min: 0, max: 1000 }),
    })
  }
  return { templates }
}
```

```bash
npx json-server --watch db.js
```

### 2. 作为 Express 中间件

最强大的玩法，几乎可以做任何事。在 lego 项目里我们就是这么干的：

```js
// mockServer.js
const jsonServer = require('json-server')
const bodyParser = require('body-parser')

const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

server.use(bodyParser.json())
server.use(middlewares)

// ...在这里加 rewriter / 自定义路由 / 鉴权中间件...

server.use(router)
server.listen(3000, () => {
  console.log('JSON Server is running on http://localhost:3000')
})
```

配合 nodemon 自动重启：

```json
"scripts": {
  "mock": "nodemon mockServer.js"
}
```

### 3. URL 重写

后端接口都带 `/api` 前缀，json-server 默认没有，用 `rewriter` 加上：

```js
// 把 /api/xxx 重写成 /xxx
const rewriter = jsonServer.rewriter({
  '/api/*': '/$1',
})

server.use(rewriter)
server.use(router)
```

效果：

| 客户端请求 | 实际命中 |
|-----------|---------|
| `GET /api/templates` | `GET /templates` |
| `GET /api/works/1` | `GET /works/1` |

### 4. 自定义返回结构

json-server 默认返回**裸数据**（数组或对象），但 lego 后端返回结构是：

```ts
{ errno: 0, data: { list: [...], count: 100 } }
```

通过重写 `router.render` 统一包装：

```js
router.render = (req, res) => {
  const data = res.locals.data
  res.jsonp({
    errno: 0,
    data: Array.isArray(data)
      ? { list: data, count: data.length }
      : data,
  })
}
```

> 这样前端定义的 `RespData<T>` / `RespListData<T>` 类型可以无缝对接 mock 数据。

### 5. 添加自定义接口

非 RESTful 的接口（验证码、登录、上传）直接挂在 server 上：

```js
// 发送验证码
server.post('/api/users/genVeriCode', (req, res) => {
  const code = Math.floor(Math.random() * 9000 + 1000)
  res.jsonp({ errno: 0, data: { code } })
})

// 文件上传（mock 返回固定 URL）
server.post('/api/utils/upload-img', (req, res) => {
  res.jsonp({
    errno: 0,
    data: { urls: ['https://mock-cdn.com/uploaded.png'] },
  })
})
```

> 注意：自定义路由要放在 `server.use(router)` **之前**，否则会被 router 拦截。

---

## 四、JWT 鉴权

### 1. 手写鉴权

完整方案：登录签发 token + 中间件校验受保护路由。

```js
const jwt = require('jsonwebtoken')

const SECRET_KEY = 'lego-mock-secret'
const EXPIRES_IN = '7d'

const createToken = (payload) =>
  jwt.sign(payload, SECRET_KEY, { expiresIn: EXPIRES_IN })

const verifyToken = (token) => jwt.verify(token, SECRET_KEY)

// 登录接口：签发 token
server.post('/api/users/loginByPhoneNumber', (req, res) => {
  const { phoneNumber, veriCode } = req.body
  const token = createToken({ phoneNumber, veriCode })
  res.jsonp({ errno: 0, data: { token } })
})

// 鉴权中间件：保护 /api/works 路由
server.use('/api/works', (req, res, next) => {
  const auth = req.headers.authorization
  const errResp = { errno: 12001, message: '登录校验失败' }

  if (!auth) return res.jsonp(errResp)

  try {
    verifyToken(auth.split(' ')[1])
    next()
  } catch (e) {
    res.jsonp(errResp)
  }
})
```

**前端配合**：登录成功后设置全局请求头

```ts
axios.defaults.headers.common.Authorization = `Bearer ${token}`
```

**保护多条路由**：用正则或循环

```js
const protectedRoutes = ['/api/works', '/api/user', '/api/utils/upload-img']
protectedRoutes.forEach(route => {
  server.use(route, authMiddleware)
})
```

### 2. json-server-auth 插件

懒人方案，开箱即用，自带注册/登录/JWT/权限模型。

```bash
npm install -D json-server-auth
```

```bash
json-server db.json -m ./node_modules/json-server-auth
```

`db.json` 加上 `users` 节点：

```json
{ "users": [], "templates": [...] }
```

自动生成的接口：

| 接口 | 说明 |
|------|------|
| `POST /register` | 注册（邮箱+密码） |
| `POST /login` | 登录返回 JWT |

权限通过路由前缀控制：

| 前缀 | 含义 |
|------|------|
| `640/posts` | 所有人可读，登录用户可写（owner 才能改/删） |
| `660/posts` | 仅 owner 可读写 |
| `444/posts` | 全员只读 |

> 适合需要标准用户体系但不想自己写鉴权的场景。

---

## 五、实用技巧

### 1. 模拟网络延迟

```bash
json-server --watch db.json --delay 1000   # 全局延迟 1 秒
```

或者在自定义中间件里按路由控制：

```js
server.use((req, res, next) => {
  setTimeout(next, 500)
})
```

### 2. 模拟随机失败（测试错误处理）

```js
server.use((req, res, next) => {
  if (Math.random() < 0.1) {
    return res.status(500).jsonp({ errno: 99999, message: '服务器开小差了' })
  }
  next()
})
```

### 3. 配合 nodemon 自动重启

```bash
npm install -D nodemon
```

```json
"scripts": {
  "mock": "nodemon mockServer.js"
}
```

修改 `mockServer.js` 后会自动重启服务，但**修改 `db.json` 不会**——`--watch` 才管 db.json 的热更新。

### 4. 常用 CLI 参数

| 参数 | 说明 |
|------|------|
| `--watch / -w` | 监听 db.json 变化 |
| `--port / -p` | 指定端口（默认 3000） |
| `--host / -H` | 指定 host（默认 localhost） |
| `--routes / -r` | 指定 routes 配置文件 |
| `--middlewares / -m` | 指定中间件文件 |
| `--delay / -d` | 全局响应延迟（毫秒） |
| `--read-only / --ro` | 只允许 GET |
| `--no-cors / --nc` | 禁用 CORS |

### 5. routes.json 路由别名（替代 rewriter）

```json
// routes.json
{
  "/api/*": "/$1",
  "/api/templates/hot": "/templates?isHot=true"
}
```

```bash
json-server --watch db.json --routes routes.json
```

---

## 六、适用场景与局限

### 适合

- 前后端并行开发，前端先跑通流程
- 写组件库 demo / 教学项目
- E2E 测试时提供稳定假数据
- 演示原型、UI 评审

### 不适合

- 复杂业务逻辑（多表关联校验、事务、复杂权限）
- 高并发、生产环境
- 需要复杂数据库查询能力
- 多人共享数据（lowdb 是单文件，无并发控制）

---

## 七、推荐插件清单

| 插件 | 作用 |
|------|------|
| `json-server-auth` | JWT 鉴权 + 用户体系 + 路由权限 |
| `@faker-js/faker` | 生成大量假数据 |
| `mockjs` | 老牌假数据库（中文姓名/地址友好） |
| `nodemon` | 改 mockServer.js 自动重启 |
| `body-parser` | 解析 POST body（json-server 默认已带） |

---

## 附：lego 项目 mockServer.js 完整模板

把上面所有能力组合起来，可以直接复用：

```js
// mockServer.js
const jsonServer = require('json-server')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')

const server = jsonServer.create()
const router = jsonServer.router('db.json')
const middlewares = jsonServer.defaults()

const SECRET_KEY = 'lego-mock-secret'

const createToken = (payload) =>
  jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' })

const verifyToken = (token) => jwt.verify(token, SECRET_KEY)

server.use(bodyParser.json())
server.use(middlewares)

// 1. 自定义接口（要在 router 之前）
server.post('/api/users/genVeriCode', (req, res) => {
  res.jsonp({ errno: 0, data: { code: 1234 } })
})

server.post('/api/users/loginByPhoneNumber', (req, res) => {
  const token = createToken(req.body)
  res.jsonp({ errno: 0, data: { token } })
})

// 2. 鉴权中间件
const authMiddleware = (req, res, next) => {
  const auth = req.headers.authorization
  const errResp = { errno: 12001, message: '登录校验失败' }
  if (!auth) return res.jsonp(errResp)
  try {
    verifyToken(auth.split(' ')[1])
    next()
  } catch (e) {
    res.jsonp(errResp)
  }
}
;['/api/works', '/api/user', '/api/utils/upload-img'].forEach(route => {
  server.use(route, authMiddleware)
})

// 3. URL 重写：/api/* -> /*
server.use(jsonServer.rewriter({ '/api/*': '/$1' }))

// 4. 统一返回结构
router.render = (req, res) => {
  const data = res.locals.data
  res.jsonp({
    errno: 0,
    data: Array.isArray(data)
      ? { list: data, count: data.length }
      : data,
  })
}

server.use(router)

server.listen(3000, () => {
  console.log('JSON Server is running on http://localhost:3000')
})
```

启动：

```bash
npm run mock
```

至此，一个完全对齐 lego 项目后端规范的 Mock Server 就跑起来了。
