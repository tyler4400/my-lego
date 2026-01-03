# Mongoose CRUD 和高级概念讲解
_Exported on 2026/1/1 at GMT+8 23:40:09 from Cursor (2.2.43)_

---

**User**

目前已经实现@packages/craft-backend/src/database/mongo/schema/work.schema.ts work作品的创建，@packages/craft-backend/src/module/work/work.controller.ts @packages/craft-backend/src/module/work/work.service.ts @packages/craft-backend/test/http/4.work.http 。现在还要完成作品数据的curd。在这之前，我对mongoose的增删查改用法还不太熟悉，甚至已经忘记了聚合，索引，group， lookup等的概念，你使用work表为例，先对我进行对这些知识进行讲解，先讲概念再用work为例进行说明讲解。要尽可能详细，我打算保存起来作为一个手册。

---

**Cursor**

下面这份内容按“**先讲概念** → **再用 `Work` 表举例**”来写，尽量覆盖你后续实现作品 CRUD 会遇到的核心点（查询、更新、删除、聚合、索引、lookup/group 等）。你可以直接保存当手册用。

---

### 1) 先把 MongoDB / Mongoose 的“对象模型”讲清楚

- **MongoDB**
  - **Database**：数据库
  - **Collection**：集合（类似关系型数据库的表）
  - **Document**：文档（一条记录，JSON/BSON 结构）
  - **Field**：字段
  - **_id**：每条文档都有的主键（ObjectId），天然带索引

- **Mongoose（ODM）**
  - **Schema**：定义文档结构、字段类型、默认值、校验、索引等（“规则”）
  - **Model**：基于 Schema 编译出来的“操作入口”，负责 CRUD（“工具”）
  - **Document（Mongoose Document）**：被 Mongoose 包装后的对象（带方法、带变更跟踪）；如果你用 `lean()`，会得到普通 JS 对象（更快更轻）

- **你当前的 NestJS + Mongoose**
  - `@Schema({ timestamps: true })`：自动维护 `createdAt` / `updatedAt`
  - `@InjectModel(Work.name)`：注入 `Work` 的 Model，用它做 CRUD

---

### 2) CRUD 总览：你要记住的“最小心智模型”

- **Create**：`Model.create()` / `new Model().save()`
- **Read**：
  - 列表：`find()`
  - 单条：`findOne()` / `findById()`
  - 计数：`countDocuments()`
- **Update**：
  - 局部更新：`updateOne()` / `findOneAndUpdate()`
  - “读后改再存”：`findById()` → 改字段 → `save()`
- **Delete**：
  - 物理删除：`deleteOne()` / `findByIdAndDelete()`
  - 逻辑删除：更新 `status = Deleted`（你这个 `WorkStatusEnum` 很适合做软删）

---

### 3) Read（查询）概念：条件、投影、排序、分页、性能

#### 3.1 查询条件（Filter）
MongoDB 查询本质是：给一个 JSON 条件对象。

- **等值**：`{ author: "tyler" }`
- **范围**：`{ createdAt: { $gte: start, $lt: end } }`
- **枚举/多值**：`{ status: { $in: [1, 2] } }`
- **非等值**：`{ status: { $ne: 0 } }`
- **存在性**：`{ coverImg: { $exists: true } }`
- **数组包含**：`{ channels: { $elemMatch: { id: "xxx" } } }`（或更具体的字段路径）
- **逻辑组合**：
  - `$and`: `{$and: [cond1, cond2]}`
  - `$or`: `{$or: [cond1, cond2]}`

#### 3.2 投影（Projection）
控制返回哪些字段：
- **只要部分字段**：减少网络与序列化成本
- 典型做法：列表不返回大字段（如 `content`），详情再取

#### 3.3 排序（Sort）
- 按时间：`{ createdAt: -1 }`
- 按热度：`{ copiedCount: -1, updatedAt: -1 }`

#### 3.4 分页（Pagination）
- **skip/limit**：简单但大页数会慢（skip 越大越慢）
- **游标分页（cursor-based）**：用 `createdAt` + `_id` 做“下一页”条件，性能更稳定（列表常用）

#### 3.5 `lean()`（非常关键）
- `find()` 默认返回 Mongoose Document（更重）
- `lean()` 返回纯对象：**读多写少的接口建议用 `lean()`**

---

### 4) Update（更新）概念：原子操作符、返回值、并发

#### 4.1 为什么要用“更新操作符”
MongoDB 更新不是“整条替换”，而是通过操作符做局部原子更新（更安全更快）：

常见更新操作符：
- **`$set`**：设置字段（最常用）
- **`$unset`**：删除字段
- **`$inc`**：自增（计数/点赞/复制次数极好用）
- **`$push`**：数组末尾追加
- **`$addToSet`**：数组去重追加
- **`$pull`**：从数组移除匹配项
- **`$currentDate`**：更新时间戳（通常你有 `timestamps` 就够了）

#### 4.2 `updateOne` vs `findOneAndUpdate`
- `updateOne(filter, update)`：只告诉你影响了多少行，不给你更新后的文档（默认）
- `findOneAndUpdate(filter, update, { new: true })`：直接返回更新后的文档（做“编辑作品”接口很顺手）

#### 4.3 并发/一致性（理解到位就够用）
- 单条文档的单次更新是原子性的
- 多条/跨集合的强一致需要事务（一般作品 CRUD 未必用到，但涉及余额/库存/多集合一致才需要）

---

### 5) Delete（删除）概念：物理删除 vs 逻辑删除（你这个表推荐软删）

- **物理删除**：真的从集合移除
  - 优点：省空间
  - 缺点：不可恢复、审计困难、可能破坏关联（比如引用它的地方）
- **逻辑删除（软删）**：字段标记删除（你已有 `WorkStatusEnum.Deleted = 0`）
  - 优点：可恢复、可审计、对外隐藏即可
  - 缺点：所有查询都要默认排除 deleted（或做统一封装）

**实践建议**：作品这类内容数据，通常用软删更符合业务。

---

### 6) Populate / 关联：MongoDB 不“JOIN”，但 Mongoose 能“populate”

#### 6.1 关系型 JOIN vs MongoDB
- MongoDB 原生不强制关系；典型策略：
  - **冗余字段**（例如你 Work 里有 `author: username`）：读快、但要接受一致性成本
  - **引用 ObjectId**（你 Work 里有 `user?: ObjectId`）：需要时再关联查询

#### 6.2 Mongoose 的 `populate()`
- 基于 `ref`（你这里 `user` ref `User.name`）可以把 `user` ObjectId 替换为用户文档（可选择字段）
- 适合“详情页要作者信息”的场景
- 注意：populate 本质是“额外查询 + 组装”，不是数据库层 JOIN；复杂多表多条件时更推荐 aggregation 的 `$lookup`

---

### 7) Aggregation（聚合）概念：把它当成“数据库里的数据流水线”

聚合管道（pipeline）就是一组阶段（stage），每一阶段对数据做一次变换：

常见 stage（你必须熟悉这些）：
- **`$match`**：过滤（相当于 WHERE）
- **`$project`**：选字段/改字段/计算字段（相当于 SELECT 列）
- **`$sort`**：排序
- **`$skip` / `$limit`**：分页
- **`$lookup`**：跨集合关联（类似 LEFT JOIN）
- **`$unwind`**：把数组拆成多行
- **`$group`**：分组聚合（类似 GROUP BY）
- **`$facet`**：一趟聚合同时产出多份结果（比如列表+总数）
- **`$count`**：计数输出
- **`$addFields`**：新增计算字段

#### 7.1 `$group`（你问的 group 概念）
- 作用：按某个 key 把多条文档“归并成一条”，并计算统计值
- 常配套操作：
  - `$sum`（计数/求和）
  - `$avg`（平均）
  - `$max`/`$min`
  - `$push`（把值收集成数组）
  - `$first`/`$last`（取每组第一个/最后一个）

#### 7.2 `$lookup`（你问的 lookup 概念）
- 作用：在聚合里做跨集合关联
- 对比 populate：
  - populate：应用层“二次查询组装”
  - lookup：数据库层在 pipeline 里“类 JOIN”
- 复杂筛选、要在关联后继续 `$match/$group` 的情况，`$lookup` 更强

---

### 8) Index（索引）概念：它决定“查得快不快”，也决定“写入代价”

#### 8.1 索引是什么
- 索引是数据结构（BTree 等），用空间换时间
- **没有索引**：查询可能全表扫描（collection scan）
- **有合适索引**：查询可以走索引（index scan）

#### 8.2 常见索引类型
- **单字段索引**：`{ author: 1 }`
- **复合索引**：`{ author: 1, status: 1, updatedAt: -1 }`
- **唯一索引（unique）**：保证不重复（你 `uuid` 就是）
- **部分索引（partial index）**：只给满足条件的文档建索引（非常实用）
- **稀疏索引（sparse）**：字段存在才建
- **TTL 索引**：到期自动删除（状态/验证码等）
- **文本索引（text）**：全文搜索（标题/描述搜索）

#### 8.3 索引设计的基本原则（手册级重点）
- 索引要围绕“最常见查询”来建：**filter + sort** 最关键
- 复合索引字段顺序很重要：一般是 **等值过滤字段在前，范围/排序字段在后**
- 索引越多：
  - 查询更快（可能）
  - 写入更慢（一定）
  - 占空间更多（一定）

---

### 9) 用你当前的 `Work` 表来“落地理解”CRUD / 聚合 / 索引

你现在的 `Work` 结构（重点字段）：
- **标识**：`_id`（Mongo 自带），`uuid`（你定义了 unique，给 H5 短链）
- **内容**：`title`（必填），`desc`，`coverImg`，`content`（大字段）
- **状态/运营**：`status`（Deleted/Initial/Published/Declined），`isTemplate/isPublic/isHot`，`copiedCount`
- **作者**：`author: string`（用户名冗余），`user?: ObjectId`（可关联 User）
- **时间**：`createdAt/updatedAt`（timestamps），`latestPublishAt`
- **分类**：`channels?: WorkChannel[]`（数组）

下面按你后续要做的“作品 CRUD”来讲该怎么用 Mongoose 思维实现。

---

### 10) Work 的 Read：典型接口与你会写的查询

#### 10.1 作品列表（我的作品）
**概念拆解**：
- filter：`user = 当前用户` 或 `author = username`
- 排除软删：`status != Deleted`
- sort：按 `updatedAt desc` 或 `createdAt desc`
- projection：列表不返回 `content`（大字段）
- pagination：limit + cursor/skip

**为什么 `content` 不适合列表返回**
- `content` 通常很大（页面搭建数据），列表场景只要标题封面状态即可
- 否则接口会慢、带宽浪费、序列化 CPU 高

#### 10.2 作品详情（按 uuid 或 id）
**概念拆解**：
- filter：`uuid = xxx`（适合 H5）或 `_id`/`id`
- 权限：如果不是公开模板，必须校验当前用户是作者或有权限
- 返回：包含 `content`

#### 10.3 模板/广场列表（公开 + 已发布）
**概念拆解**：
- filter：`isPublic = true`、`status = Published`、`isTemplate = true`
- sort：热度优先（`copiedCount desc`），其次 `updatedAt desc`

---

### 11) Work 的 Update：典型更新与你会用到的操作符

#### 11.1 编辑作品（标题/描述/封面/content）
**概念拆解**：
- filter：`_id` 或 `uuid` + `user = 当前用户`（防越权）
- update：用 `$set` 更新可编辑字段
- 返回：通常返回更新后的文档（方便前端立即刷新）

#### 11.2 发布作品（状态流转）
你有 `Initial / Published / Declined / Deleted`：
- 发布：`status: Published` + `latestPublishAt: now`
- 下线/强制下线：`status: Declined`
- 软删：`status: Deleted`

这类非常适合 `findOneAndUpdate`：
- 条件里加上“当前状态”可避免非法流转（例如只允许 Initial -> Published）

#### 11.3 复制次数 copiedCount（强推荐 `$inc`）
- 复制一次：`$inc: { copiedCount: 1 }`
- `$inc` 是原子自增，不会因为并发导致丢计数

---

### 12) Work 的 Delete：为什么你应该优先软删

你已经有 `WorkStatusEnum.Deleted = 0`，非常标准：
- 删除作品：更新 `status=Deleted`
- 列表/详情默认都加过滤：不展示 Deleted
- 需要“回收站/恢复作品”也很容易：把 status 改回去即可

---

### 13) 用 Work 讲清楚 aggregation：什么时候你真的需要它

很多 CRUD 用 `find/findOne` 就够了；你需要聚合通常是这几类：

#### 13.1 统计：按 status 分组统计作品数量（`$group`）
需求例子：后台看板展示：
- Initial 多少、Published 多少、Declined 多少（Deleted 通常不算）

聚合思路：
- `$match`：限定用户或全站、排除 deleted
- `$group`：`_id: "$status"`，`count: { $sum: 1 }`

#### 13.2 频道维度统计（channels 是数组）
需求例子：统计每个 channel 被使用次数：
- `$unwind: "$channels"`（把数组拆行）
- `$group`：按 `channels.id` 或 `channels.name` 分组计数

#### 13.3 列表 + 总数一次返回（`$facet`）
需求例子：作品广场列表要：
- 当前页数据（分页）
- 总条数（用于分页器）

聚合思路：
- `$match` 过滤
- `$facet`：
  - `list`: `$sort/$skip/$limit/$project`
  - `total`: `$count`

#### 13.4 关联用户信息（`$lookup`）
需求例子：作品列表要带作者头像/昵称，并且想在关联后再筛选/排序：
- `$lookup` 从 users 集合拉取 user 文档
- `$unwind` 变成对象
- `$project` 控制输出字段

> 备注：你现在 Work 同时有 `author: string`（冗余）和 `user: ObjectId`（引用）。  
> - 如果只要用户名展示，用 `author` 就够（省关联）  
> - 如果要头像/昵称等用户资料，再用 `user` 做 populate 或 `$lookup`

---

### 14) 用 Work 讲索引：你后续 CRUD 最可能需要哪些索引

你现在已有：
- `uuid`：`unique: true`（非常好，适合通过 uuid 查详情）

接下来通常会补的索引（按“常见查询”推导）：

- **我的作品列表**：经常按用户过滤 + 时间排序
  - 候选复合索引：`{ user: 1, status: 1, updatedAt: -1 }`
  - 或如果你主要用 `author`：`{ author: 1, status: 1, updatedAt: -1 }`

- **广场/模板列表**：经常 `isPublic/isTemplate/status` + 热度/时间排序
  - 候选复合索引：`{ isPublic: 1, isTemplate: 1, status: 1, copiedCount: -1, updatedAt: -1 }`
  - 或拆成两套：一套给 copiedCount 排序，一套给 updatedAt 排序（看你实际用哪个更多）

- **按发布时间筛选**：
  - `latestPublishAt` 上建索引（如果你经常按发布时间排序/过滤）

- **标题搜索（如果要做）**：
  - text 索引：`title + desc`（但 text 搜索和排序/过滤组合有约束，需要单独设计）

> 索引不是越多越好：你先把 CRUD 跑通，再根据接口的实际查询条件补索引最稳。

---

### 15) 最后给你一份“记忆提纲”（背下来就能写 CRUD）

- **读列表**：`filter(权限+排除Deleted) + sort + pagination + projection(不带content) + lean`
- **读详情**：`by uuid/_id + 权限校验 + 返回content`
- **更新**：优先 `$set`；计数用 `$inc`；用 `findOneAndUpdate(..., { new: true })` 省一次查询
- **删除**：优先软删 `status=Deleted`
- **需要统计/关联/一次多结果**：上 aggregation（`$match/$group/$lookup/$facet`）
- **性能靠索引**：围绕最常见的 filter+sort 来建复合索引

---

如果你同意，我下一步可以按你项目的实际接口风格（NestJS + BizException + JwtAuthGuard）把 **Work 的 CRUD 接口设计**先写成“详细方案 + DTO 设计 + 权限规则 + 查询/索引建议清单 + 伪代码”，你确认后我再开始正式编码实现。你希望 CRUD 覆盖哪些具体接口？比如：
- 列表：我的作品 / 公开模板
- 详情：按 `uuid` 还是按自增 `id` 还是 `_id`
- 更新：允许改哪些字段（title/desc/coverImg/content/status/isPublic/isHot…）
- 删除：只软删还是也要物理删（管理员）

---

**User**

给这些示例再加上真实的使用用法

---

**Cursor**

下面把我上一条里提到的 **find / update / delete / populate / aggregate / index / group / lookup / facet** 等示例，全部补成「**真实可直接抄用的 NestJS + Mongoose 用法**」（以你的 `Work` 表为例）。代码里我会写清晰注释，方便你保存当手册。

---

### 0) 统一前置：在 NestJS Service 里拿到 WorkModel

```ts
import { Injectable, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Work, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { BizException } from '@/common/error/biz.exception'
import type { UserPayload } from '@/types/type'

@Injectable()
export class WorkService {
  constructor(
    @InjectModel(Work.name)
    private readonly workModel: Model<WorkDocument>,
  ) {}

  private readonly ensureValidUserObjectId = (userPayload: UserPayload) => {
    if (!Types.ObjectId.isValid(userPayload._id)) {
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }
    return new Types.ObjectId(userPayload._id)
  }
}
```

---

### 1) Create（创建）真实用法

#### 1.1 `Model.create()`（你现在用的方式，最常见）

```ts
import { nanoid } from 'nanoid'

const createWork = async (
  input: { title: string; content: Record<string, any>; desc?: string; coverImg?: string },
  userPayload: UserPayload,
) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel.create({
    uuid: nanoid(8),
    title: input.title,
    desc: input.desc ?? '',
    coverImg: input.coverImg,
    content: input.content,
    status: WorkStatusEnum.Initial,
    user: userObjectId,
    author: userPayload.username,
  })
}
```

#### 1.2 `new Model()` + `save()`（需要“先构造再改字段”时更顺手）

```ts
const createWorkWithSave = async (input: { title: string; content: Record<string, any> }, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const newWork = new this.workModel({
    uuid: nanoid(8),
    title: input.title,
    content: input.content,
    status: WorkStatusEnum.Initial,
    user: userObjectId,
    author: userPayload.username,
  })

  // 这里可以在 save 前做更多业务处理（比如补默认内容结构、写入计算字段等）
  return newWork.save()
}
```

#### 1.3 `insertMany()`（批量导入/迁移用）

```ts
const insertManyTemplates = async (templates: Array<{ title: string; content: Record<string, any> }>) => {
  // ordered=false：中间某条失败时继续插入后续（适合迁移场景）
  return this.workModel.insertMany(
    templates.map((t) => ({
      uuid: nanoid(8),
      title: t.title,
      content: t.content,
      status: WorkStatusEnum.Published,
      isTemplate: true,
      isPublic: true,
      author: 'system',
    })),
    { ordered: false },
  )
}
```

---

### 2) Read（查询）真实用法：列表/详情/计数/投影/分页/lean

#### 2.1 我的作品列表（**不返回 content 大字段** + 排序 + 分页）

```ts
type ListMyWorksQuery = {
  page?: number
  pageSize?: number
  status?: WorkStatusEnum
}

const listMyWorks = async (query: ListMyWorksQuery, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10))
  const skip = (page - 1) * pageSize

  // 软删过滤：默认不看 Deleted
  const filter: Record<string, any> = {
    user: userObjectId,
    status: { $ne: WorkStatusEnum.Deleted },
  }

  // 允许按状态筛选（注意：如果传 Deleted，你可能要允许/不允许，看业务）
  if (typeof query.status === 'number') filter.status = query.status

  const [list, total] = await Promise.all([
    this.workModel
      .find(filter)
      // 投影：列表不要 content（省流量、省 CPU）
      .select({
        content: 0,
      })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean() // 返回纯对象
      .exec(),
    this.workModel.countDocuments(filter).exec(),
  ])

  return {
    page,
    pageSize,
    total,
    list,
  }
}
```

#### 2.2 作品详情：按 `uuid` 查（H5 最常用）+ 权限校验示例

```ts
const getWorkDetailByUuid = async (uuid: string, userPayload?: UserPayload) => {
  const work = await this.workModel
    .findOne({ uuid, status: { $ne: WorkStatusEnum.Deleted } })
    .lean()
    .exec()

  if (!work) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })

  // 示例：如果不是公开模板，则必须登录且必须是作者本人
  if (!work.isPublic) {
    if (!userPayload) throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    if (work.author !== userPayload.username) {
      throw new BizException({ errorKey: 'noPermission', httpStatus: HttpStatus.FORBIDDEN })
    }
  }

  return work
}
```

#### 2.3 判断是否存在：`exists()`（比 findOne 更轻）

```ts
const isUuidTaken = async (uuid: string) => {
  const exists = await this.workModel.exists({ uuid }).exec()
  return Boolean(exists)
}
```

#### 2.4 `distinct()`：拿所有作者/频道 id（做筛选项时常用）

```ts
const listDistinctAuthors = async () => {
  return this.workModel.distinct('author', { status: WorkStatusEnum.Published }).exec()
}
```

#### 2.5 Cursor 分页（推荐）：用 `createdAt + _id` 做稳定翻页

```ts
type CursorPageQuery = {
  limit?: number
  cursorCreatedAt?: string // 上一页最后一条的 createdAt
  cursorId?: string        // 上一页最后一条的 _id
}

const listPublicTemplatesByCursor = async (q: CursorPageQuery) => {
  const limit = Math.min(50, Math.max(1, q.limit ?? 10))

  const baseFilter: Record<string, any> = {
    status: WorkStatusEnum.Published,
    isTemplate: true,
    isPublic: true,
  }

  // cursor 条件：取 “严格小于上一页末尾”的数据
  if (q.cursorCreatedAt && q.cursorId && Types.ObjectId.isValid(q.cursorId)) {
    const cursorDate = new Date(q.cursorCreatedAt)
    const cursorObjectId = new Types.ObjectId(q.cursorId)

    baseFilter.$or = [
      { createdAt: { $lt: cursorDate } },
      { createdAt: cursorDate, _id: { $lt: cursorObjectId } },
    ]
  }

  const list = await this.workModel
    .find(baseFilter)
    .select({ content: 0 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean()
    .exec()

  const last = list[list.length - 1]
  return {
    list,
    nextCursor: last
      ? { cursorCreatedAt: last.createdAt, cursorId: String(last._id) }
      : null,
  }
}
```

---

### 3) Update（更新）真实用法：`$set/$inc/findOneAndUpdate/runValidators`

#### 3.1 编辑作品（只允许作者编辑）+ 返回更新后文档

```ts
type UpdateWorkInput = {
  title?: string
  desc?: string
  coverImg?: string
  content?: Record<string, any>
  isPublic?: boolean
  isHot?: boolean
}

const updateMyWorkByUuid = async (uuid: string, input: UpdateWorkInput, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  // 只允许更新白名单字段，避免“全量透传”污染数据
  const $set: Record<string, any> = {}
  if (typeof input.title === 'string') $set.title = input.title
  if (typeof input.desc === 'string') $set.desc = input.desc
  if (typeof input.coverImg === 'string') $set.coverImg = input.coverImg
  if (typeof input.content === 'object' && input.content) $set.content = input.content
  if (typeof input.isPublic === 'boolean') $set.isPublic = input.isPublic
  if (typeof input.isHot === 'boolean') $set.isHot = input.isHot

  if (Object.keys($set).length === 0) {
    throw new BizException({ errorKey: 'badRequest', httpStatus: HttpStatus.BAD_REQUEST })
  }

  const updated = await this.workModel
    .findOneAndUpdate(
      {
        uuid,
        user: userObjectId,
        status: { $ne: WorkStatusEnum.Deleted },
      },
      { $set },
      {
        new: true,          // 返回更新后的文档
        runValidators: true // 触发 schema 校验（建议开启）
      },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

#### 3.2 自增 copiedCount：`$inc`（并发安全）

```ts
const increaseCopiedCount = async (uuid: string) => {
  const updated = await this.workModel
    .findOneAndUpdate(
      { uuid, status: WorkStatusEnum.Published },
      { $inc: { copiedCount: 1 } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

#### 3.3 发布作品：状态流转 + `latestPublishAt`

```ts
const publishMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const updated = await this.workModel
    .findOneAndUpdate(
      // 加上“当前状态”限制，避免重复发布或非法流转
      { uuid, user: userObjectId, status: WorkStatusEnum.Initial },
      { $set: { status: WorkStatusEnum.Published, latestPublishAt: new Date() } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFoundOrInvalidStatus', httpStatus: HttpStatus.BAD_REQUEST })
  return updated
}
```

#### 3.4 数组字段 channels：`$addToSet` / `$pull`（去重添加/删除）

```ts
import type { WorkChannel } from '@/database/mongo/schema/work.schema'

const addChannelToWork = async (uuid: string, channel: WorkChannel, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $addToSet: { channels: channel } }, // 去重追加（按对象整体判断）
      { new: true },
    )
    .lean()
    .exec()
}

const removeChannelFromWork = async (uuid: string, channelId: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $pull: { channels: { id: channelId } } }, // 删除匹配项
      { new: true },
    )
    .lean()
    .exec()
}
```

---

### 4) Delete（删除）真实用法：软删 vs 硬删

#### 4.1 软删（推荐）：把 `status` 改成 Deleted

```ts
const softDeleteMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const updated = await this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $set: { status: WorkStatusEnum.Deleted } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

#### 4.2 硬删：`deleteOne()`（谨慎使用）

```ts
const hardDeleteMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const result = await this.workModel.deleteOne({ uuid, user: userObjectId }).exec()
  if (result.deletedCount === 0) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })

  return { deleted: true }
}
```

---

### 5) Populate（关联 user）真实用法：详情带作者信息

> 你的 schema 里：`user?: ObjectId, ref: User.name`，所以可以 populate。  
> 注意：`author` 是冗余字符串字段；如果你要头像/昵称等，才需要 `user`。

```ts
const getWorkWithUserProfile = async (uuid: string) => {
  const work = await this.workModel
    .findOne({ uuid, status: { $ne: WorkStatusEnum.Deleted } })
    .populate({
      path: 'user',
      select: { username: 1, avatar: 1 }, // 只拿必要字段
      options: { lean: true },
    })
    .lean()
    .exec()

  if (!work) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return work
}
```

---

### 6) Aggregation（聚合）真实用法：`$group/$lookup/$facet/$unwind`

#### 6.1 按状态统计数量（你问的 group 概念 → 真用法）

```ts
const countWorksGroupByStatus = async (userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .aggregate([
      { $match: { user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .exec()
}
```

返回形态类似：
- `[{ _id: 1, count: 12 }, { _id: 2, count: 3 }]`

#### 6.2 频道使用次数统计（channels 是数组 → `$unwind` + `$group`）

```ts
const countByChannel = async () => {
  return this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published } },
      { $unwind: { path: '$channels', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$channels.id', name: { $first: '$channels.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .exec()
}
```

#### 6.3 列表 + 总数一次返回（你会很常用）：`$facet`

```ts
const listPublicTemplatesWithTotal = async (page = 1, pageSize = 10) => {
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(50, Math.max(1, pageSize))
  const skip = (safePage - 1) * safePageSize

  const result = await this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published, isTemplate: true, isPublic: true } },
      {
        $facet: {
          list: [
            { $sort: { copiedCount: -1, updatedAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: safePageSize },
            { $project: { content: 0 } }, // 列表裁掉大字段
          ],
          total: [{ $count: 'count' }],
        },
      },
    ])
    .exec()

  const facet = result[0] ?? { list: [], total: [] }
  const total = facet.total[0]?.count ?? 0

  return { page: safePage, pageSize: safePageSize, total, list: facet.list }
}
```

#### 6.4 `$lookup`：聚合里“类 JOIN”用户信息（你问的 lookup 概念 → 真用法）

> `from` 是 **MongoDB collection 名**：默认是模型名小写复数（例如 `User` → `users`）。如果你在 UserSchema 里自定义了 collection 名，这里要改成那个名字。

```ts
const listTemplatesWithUserByLookup = async () => {
  return this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published, isTemplate: true, isPublic: true } },

      // 关联 users 表：work.user(ObjectId) -> users._id
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },

      // 输出字段控制：避免把 user 整表字段带出来
      {
        $project: {
          content: 0,
          'userInfo.password': 0,
          'userInfo.githubAccessToken': 0,
        },
      },

      { $sort: { copiedCount: -1, updatedAt: -1 } },
      { $limit: 20 },
    ])
    .exec()
}
```

---

### 7) Index（索引）真实写法：你将来会把它加到 schema 里（示例）

> 下面是“怎么写索引”的真实方式；是否现在就加，要看你后续 CRUD 的实际查询。

```ts
import { WorkSchema } from '@/database/mongo/schema/work.schema'

// 我的作品列表：按 user + status 过滤，按 updatedAt 排序
WorkSchema.index({ user: 1, status: 1, updatedAt: -1 })

// 公开模板列表：按 isPublic/isTemplate/status 过滤，按 copiedCount/updatedAt 排序
WorkSchema.index({ isPublic: 1, isTemplate: 1, status: 1, copiedCount: -1, updatedAt: -1 })

// 标题全文搜索（如果你要做搜索）
WorkSchema.index({ title: 'text', desc: 'text' })
```

---

### 8) `.http`（你现在的测试方式）补齐“真实调用样例”

```http
### 我的作品列表
GET {{host}}:{{port}}/{{prefix}}/{{version}}/work/my?page=1&pageSize=10
Authorization: Bearer {{accessToken}}

### 作品详情（uuid）
GET {{host}}:{{port}}/{{prefix}}/{{version}}/work/detail?uuid=xxxxxxxx
Authorization: Bearer {{accessToken}}

### 编辑作品（uuid）
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/update
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{
  "uuid": "xxxxxxxx",
  "title": "新标题",
  "desc": "新描述",
  "coverImg": "https://example.com/cover.png",
  "content": { "components": [], "props": {} }
}

### 发布作品
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/publish
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{ "uuid": "xxxxxxxx" }

### 软删作品
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/delete
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{ "uuid": "xxxxxxxx" }
```

---

如果你想让我把这份手册再升级一档：我可以按你项目的实际风格（BizException、MetaResponse、JwtAuthGuard、DTO 校验）把 **Work 的完整 CRUD 接口设计**也写成“可直接落地的接口清单 + DTO 字段白名单 + 权限规则 + 默认查询过滤（排除 Deleted）+ 推荐索引”，你确认后再开始真正改代码。你希望 CRUD 的最小集合包含哪些接口？（例如：我的列表/公开列表/详情/更新/发布/软删/复制计数）

```typescript
import { Injectable, HttpStatus } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Work, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { BizException } from '@/common/error/biz.exception'
import type { UserPayload } from '@/types/type'

@Injectable()
export class WorkService {
  constructor(
    @InjectModel(Work.name)
    private readonly workModel: Model<WorkDocument>,
  ) {}

  private readonly ensureValidUserObjectId = (userPayload: UserPayload) => {
    if (!Types.ObjectId.isValid(userPayload._id)) {
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }
    return new Types.ObjectId(userPayload._id)
  }
}
```

```typescript
import { nanoid } from 'nanoid'

const createWork = async (
  input: { title: string; content: Record<string, any>; desc?: string; coverImg?: string },
  userPayload: UserPayload,
) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel.create({
    uuid: nanoid(8),
    title: input.title,
    desc: input.desc ?? '',
    coverImg: input.coverImg,
    content: input.content,
    status: WorkStatusEnum.Initial,
    user: userObjectId,
    author: userPayload.username,
  })
}
```

```typescript
const createWorkWithSave = async (input: { title: string; content: Record<string, any> }, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const newWork = new this.workModel({
    uuid: nanoid(8),
    title: input.title,
    content: input.content,
    status: WorkStatusEnum.Initial,
    user: userObjectId,
    author: userPayload.username,
  })

  // 这里可以在 save 前做更多业务处理（比如补默认内容结构、写入计算字段等）
  return newWork.save()
}
```

```typescript
const insertManyTemplates = async (templates: Array<{ title: string; content: Record<string, any> }>) => {
  // ordered=false：中间某条失败时继续插入后续（适合迁移场景）
  return this.workModel.insertMany(
    templates.map((t) => ({
      uuid: nanoid(8),
      title: t.title,
      content: t.content,
      status: WorkStatusEnum.Published,
      isTemplate: true,
      isPublic: true,
      author: 'system',
    })),
    { ordered: false },
  )
}
```

```typescript
type ListMyWorksQuery = {
  page?: number
  pageSize?: number
  status?: WorkStatusEnum
}

const listMyWorks = async (query: ListMyWorksQuery, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const page = Math.max(1, query.page ?? 1)
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10))
  const skip = (page - 1) * pageSize

  // 软删过滤：默认不看 Deleted
  const filter: Record<string, any> = {
    user: userObjectId,
    status: { $ne: WorkStatusEnum.Deleted },
  }

  // 允许按状态筛选（注意：如果传 Deleted，你可能要允许/不允许，看业务）
  if (typeof query.status === 'number') filter.status = query.status

  const [list, total] = await Promise.all([
    this.workModel
      .find(filter)
      // 投影：列表不要 content（省流量、省 CPU）
      .select({
        content: 0,
      })
      .sort({ updatedAt: -1, _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean() // 返回纯对象
      .exec(),
    this.workModel.countDocuments(filter).exec(),
  ])

  return {
    page,
    pageSize,
    total,
    list,
  }
}
```

```typescript
const getWorkDetailByUuid = async (uuid: string, userPayload?: UserPayload) => {
  const work = await this.workModel
    .findOne({ uuid, status: { $ne: WorkStatusEnum.Deleted } })
    .lean()
    .exec()

  if (!work) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })

  // 示例：如果不是公开模板，则必须登录且必须是作者本人
  if (!work.isPublic) {
    if (!userPayload) throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    if (work.author !== userPayload.username) {
      throw new BizException({ errorKey: 'noPermission', httpStatus: HttpStatus.FORBIDDEN })
    }
  }

  return work
}
```

```typescript
const isUuidTaken = async (uuid: string) => {
  const exists = await this.workModel.exists({ uuid }).exec()
  return Boolean(exists)
}
```

```typescript
const listDistinctAuthors = async () => {
  return this.workModel.distinct('author', { status: WorkStatusEnum.Published }).exec()
}
```

```typescript
type CursorPageQuery = {
  limit?: number
  cursorCreatedAt?: string // 上一页最后一条的 createdAt
  cursorId?: string        // 上一页最后一条的 _id
}

const listPublicTemplatesByCursor = async (q: CursorPageQuery) => {
  const limit = Math.min(50, Math.max(1, q.limit ?? 10))

  const baseFilter: Record<string, any> = {
    status: WorkStatusEnum.Published,
    isTemplate: true,
    isPublic: true,
  }

  // cursor 条件：取 “严格小于上一页末尾”的数据
  if (q.cursorCreatedAt && q.cursorId && Types.ObjectId.isValid(q.cursorId)) {
    const cursorDate = new Date(q.cursorCreatedAt)
    const cursorObjectId = new Types.ObjectId(q.cursorId)

    baseFilter.$or = [
      { createdAt: { $lt: cursorDate } },
      { createdAt: cursorDate, _id: { $lt: cursorObjectId } },
    ]
  }

  const list = await this.workModel
    .find(baseFilter)
    .select({ content: 0 })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean()
    .exec()

  const last = list[list.length - 1]
  return {
    list,
    nextCursor: last
      ? { cursorCreatedAt: last.createdAt, cursorId: String(last._id) }
      : null,
  }
}
```

```typescript
type UpdateWorkInput = {
  title?: string
  desc?: string
  coverImg?: string
  content?: Record<string, any>
  isPublic?: boolean
  isHot?: boolean
}

const updateMyWorkByUuid = async (uuid: string, input: UpdateWorkInput, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  // 只允许更新白名单字段，避免“全量透传”污染数据
  const $set: Record<string, any> = {}
  if (typeof input.title === 'string') $set.title = input.title
  if (typeof input.desc === 'string') $set.desc = input.desc
  if (typeof input.coverImg === 'string') $set.coverImg = input.coverImg
  if (typeof input.content === 'object' && input.content) $set.content = input.content
  if (typeof input.isPublic === 'boolean') $set.isPublic = input.isPublic
  if (typeof input.isHot === 'boolean') $set.isHot = input.isHot

  if (Object.keys($set).length === 0) {
    throw new BizException({ errorKey: 'badRequest', httpStatus: HttpStatus.BAD_REQUEST })
  }

  const updated = await this.workModel
    .findOneAndUpdate(
      {
        uuid,
        user: userObjectId,
        status: { $ne: WorkStatusEnum.Deleted },
      },
      { $set },
      {
        new: true,          // 返回更新后的文档
        runValidators: true // 触发 schema 校验（建议开启）
      },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

```typescript
const increaseCopiedCount = async (uuid: string) => {
  const updated = await this.workModel
    .findOneAndUpdate(
      { uuid, status: WorkStatusEnum.Published },
      { $inc: { copiedCount: 1 } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

```typescript
const publishMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const updated = await this.workModel
    .findOneAndUpdate(
      // 加上“当前状态”限制，避免重复发布或非法流转
      { uuid, user: userObjectId, status: WorkStatusEnum.Initial },
      { $set: { status: WorkStatusEnum.Published, latestPublishAt: new Date() } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFoundOrInvalidStatus', httpStatus: HttpStatus.BAD_REQUEST })
  return updated
}
```

```typescript
import type { WorkChannel } from '@/database/mongo/schema/work.schema'

const addChannelToWork = async (uuid: string, channel: WorkChannel, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $addToSet: { channels: channel } }, // 去重追加（按对象整体判断）
      { new: true },
    )
    .lean()
    .exec()
}

const removeChannelFromWork = async (uuid: string, channelId: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $pull: { channels: { id: channelId } } }, // 删除匹配项
      { new: true },
    )
    .lean()
    .exec()
}
```

```typescript
const softDeleteMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const updated = await this.workModel
    .findOneAndUpdate(
      { uuid, user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } },
      { $set: { status: WorkStatusEnum.Deleted } },
      { new: true },
    )
    .lean()
    .exec()

  if (!updated) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return updated
}
```

```typescript
const hardDeleteMyWork = async (uuid: string, userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  const result = await this.workModel.deleteOne({ uuid, user: userObjectId }).exec()
  if (result.deletedCount === 0) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })

  return { deleted: true }
}
```

```typescript
const getWorkWithUserProfile = async (uuid: string) => {
  const work = await this.workModel
    .findOne({ uuid, status: { $ne: WorkStatusEnum.Deleted } })
    .populate({
      path: 'user',
      select: { username: 1, avatar: 1 }, // 只拿必要字段
      options: { lean: true },
    })
    .lean()
    .exec()

  if (!work) throw new BizException({ errorKey: 'workNotFound', httpStatus: HttpStatus.NOT_FOUND })
  return work
}
```

```typescript
const countWorksGroupByStatus = async (userPayload: UserPayload) => {
  const userObjectId = this.ensureValidUserObjectId(userPayload)

  return this.workModel
    .aggregate([
      { $match: { user: userObjectId, status: { $ne: WorkStatusEnum.Deleted } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .exec()
}
```

```typescript
const countByChannel = async () => {
  return this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published } },
      { $unwind: { path: '$channels', preserveNullAndEmptyArrays: false } },
      { $group: { _id: '$channels.id', name: { $first: '$channels.name' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .exec()
}
```

```typescript
const listPublicTemplatesWithTotal = async (page = 1, pageSize = 10) => {
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(50, Math.max(1, pageSize))
  const skip = (safePage - 1) * safePageSize

  const result = await this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published, isTemplate: true, isPublic: true } },
      {
        $facet: {
          list: [
            { $sort: { copiedCount: -1, updatedAt: -1, _id: -1 } },
            { $skip: skip },
            { $limit: safePageSize },
            { $project: { content: 0 } }, // 列表裁掉大字段
          ],
          total: [{ $count: 'count' }],
        },
      },
    ])
    .exec()

  const facet = result[0] ?? { list: [], total: [] }
  const total = facet.total[0]?.count ?? 0

  return { page: safePage, pageSize: safePageSize, total, list: facet.list }
}
```

```typescript
const listTemplatesWithUserByLookup = async () => {
  return this.workModel
    .aggregate([
      { $match: { status: WorkStatusEnum.Published, isTemplate: true, isPublic: true } },

      // 关联 users 表：work.user(ObjectId) -> users._id
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },

      // 输出字段控制：避免把 user 整表字段带出来
      {
        $project: {
          content: 0,
          'userInfo.password': 0,
          'userInfo.githubAccessToken': 0,
        },
      },

      { $sort: { copiedCount: -1, updatedAt: -1 } },
      { $limit: 20 },
    ])
    .exec()
}
```

```typescript
import { WorkSchema } from '@/database/mongo/schema/work.schema'

// 我的作品列表：按 user + status 过滤，按 updatedAt 排序
WorkSchema.index({ user: 1, status: 1, updatedAt: -1 })

// 公开模板列表：按 isPublic/isTemplate/status 过滤，按 copiedCount/updatedAt 排序
WorkSchema.index({ isPublic: 1, isTemplate: 1, status: 1, copiedCount: -1, updatedAt: -1 })

// 标题全文搜索（如果你要做搜索）
WorkSchema.index({ title: 'text', desc: 'text' })
```

```plaintext
### 我的作品列表
GET {{host}}:{{port}}/{{prefix}}/{{version}}/work/my?page=1&pageSize=10
Authorization: Bearer {{accessToken}}

### 作品详情（uuid）
GET {{host}}:{{port}}/{{prefix}}/{{version}}/work/detail?uuid=xxxxxxxx
Authorization: Bearer {{accessToken}}

### 编辑作品（uuid）
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/update
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{
  "uuid": "xxxxxxxx",
  "title": "新标题",
  "desc": "新描述",
  "coverImg": "https://example.com/cover.png",
  "content": { "components": [], "props": {} }
}

### 发布作品
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/publish
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{ "uuid": "xxxxxxxx" }

### 软删作品
POST {{host}}:{{port}}/{{prefix}}/{{version}}/work/delete
Content-Type: application/json
Authorization: Bearer {{accessToken}}

{ "uuid": "xxxxxxxx" }
```

