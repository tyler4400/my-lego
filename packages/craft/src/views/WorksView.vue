<template>
  <div class="works-view">
    <div class="works-view__container">
      <!-- 顶部：标题 + 创建作品按钮 -->
      <header class="works-view__header">
        <div class="works-view__header-left">
          <h1 class="works-view__title">
            我的作品
          </h1>
          <p class="works-view__subtitle">
            <template v-if="total > 0">
              共 {{ total }} 个作品
            </template>
            <template v-else>
              管理和编辑你创建的所有作品
            </template>
          </p>
        </div>
        <Button type="primary" size="large" :loading="creating" @click="handleCreate">
          <template #icon>
            <PlusOutlined />
          </template>
          创建作品
        </Button>
      </header>

      <!-- 工具栏：搜索 / 筛选 / 排序 / 重置 -->
      <section class="works-view__toolbar">
        <InputSearch
          v-model:value="searchInput"
          placeholder="搜索作品标题"
          allowClear
          :maxlength="50"
          class="works-view__search"
          @search="handleSearchSubmit"
        />
        <Select
          v-model:value="filters.status"
          class="works-view__filter"
          placeholder="状态"
          :options="STATUS_OPTIONS"
        />
        <Select
          v-model:value="filters.isTemplate"
          class="works-view__filter"
          placeholder="类型"
          :options="TEMPLATE_OPTIONS"
        />
        <Select
          v-model:value="filters.sortBy"
          class="works-view__filter"
          :options="SORT_OPTIONS"
        />
        <Button v-if="hasActiveFilter" @click="handleResetFilters">
          重置
        </Button>
      </section>

      <!-- 主内容：骨架屏 / 空态 / 卡片列表 -->
      <section class="works-view__content">
        <!-- 加载中（仅首次加载或筛选切换时显示） -->
        <div v-if="loading && works.length === 0" class="works-view__grid">
          <div v-for="i in 8" :key="i" class="works-view__skeleton">
            <Skeleton :paragraph="{ rows: 3 }" active />
          </div>
        </div>

        <!-- 空态 1：未创建任何作品 -->
        <div v-else-if="total === 0 && !hasActiveFilter" class="works-view__empty">
          <Empty
            :imageStyle="{ height: '120px' }"
            description="你还没有作品，开始你的第一次创作吧"
          >
            <Button type="primary" size="large" :loading="creating" @click="handleCreate">
              <template #icon>
                <PlusOutlined />
              </template>
              创建第一个作品
            </Button>
          </Empty>
        </div>

        <!-- 空态 2：搜索/筛选无结果 -->
        <div v-else-if="total === 0 && hasActiveFilter" class="works-view__empty">
          <Empty description="没有匹配的作品">
            <Button @click="handleResetFilters">
              重置筛选条件
            </Button>
          </Empty>
        </div>

        <!-- 卡片网格 -->
        <div v-else class="works-view__grid">
          <article
            v-for="work in works"
            :key="work.id"
            class="works-view__card"
            :class="{ 'works-view__card--disabled': !canEdit(work) }"
            :tabindex="canEdit(work) ? 0 : -1"
            :role="canEdit(work) ? 'button' : undefined"
            :aria-label="canEdit(work) ? `编辑作品 ${work.title}` : undefined"
            :aria-disabled="canEdit(work) ? undefined : 'true'"
            @click="handleCardClick(work)"
            @keydown.enter="handleCardClick(work)"
          >
            <!-- 封面 + 状态 Tag + hover 蓝色 CTA -->
            <div class="works-view__cover">
              <img
                v-if="work.coverImg"
                :src="work.coverImg"
                :alt="work.title"
                loading="lazy"
                class="works-view__cover-img"
              >
              <div v-else class="works-view__cover-placeholder">
                <FileImageOutlined />
                <span>暂无封面</span>
              </div>

              <Tag
                class="works-view__status-tag"
                :color="getWorkStatusInfo(work.status).color"
              >
                {{ getWorkStatusInfo(work.status).text }}
              </Tag>

              <!-- hover 遮罩：仅可编辑作品显示蓝色 CTA -->
              <div v-if="canEdit(work)" class="works-view__cover-mask">
                <span class="works-view__cover-mask-cta">
                  <EditOutlined />
                  继续编辑
                </span>
              </div>
            </div>

            <!-- 卡片信息区 -->
            <div class="works-view__info">
              <h3 class="works-view__card-title" :title="work.title">
                {{ work.title || '未命名作品' }}
              </h3>
              <p class="works-view__card-desc" :title="work.desc">
                {{ work.desc || '暂无描述' }}
              </p>

              <div class="works-view__card-meta">
                <span class="works-view__meta-item" :title="`更新时间：${formatFullDate(work.updatedAt)}`">
                  <CalendarOutlined />
                  {{ formatRelativeDate(work.updatedAt) }}
                </span>
                <span v-if="work.copiedCount > 0" class="works-view__meta-item" title="复制次数">
                  <FireOutlined />
                  {{ work.copiedCount }}
                </span>
              </div>

              <!-- 底部一行：左 tags / 右 更多操作 Dropdown（同行紧凑布局） -->
              <div class="works-view__card-bottom">
                <div class="works-view__card-tags">
                  <Tag v-if="work.isTemplate" color="purple">
                    模板
                  </Tag>
                  <Tag v-if="work.isPublic" color="cyan">
                    公开
                  </Tag>
                  <Tag v-if="work.isHot" color="volcano">
                    热门
                  </Tag>
                </div>

                <Dropdown
                  :trigger="['click']"
                  placement="bottomRight"
                  :destroyPopupOnHide="true"
                >
                  <Button
                    type="text"
                    size="small"
                    class="works-view__more-btn"
                    aria-label="更多操作"
                    @click.stop
                  >
                    <template #icon>
                      <MoreOutlined />
                    </template>
                  </Button>

                  <template #overlay>
                    <Menu class="works-view__menu" @click="(e: MenuClickEvent) => handleMenuClick(e, work)">
                      <MenuItem key="edit" :disabled="!canEdit(work)">
                        <Tooltip
                          v-if="!canEdit(work)"
                          title="该状态的作品不可编辑"
                          placement="left"
                        >
                          <span class="works-view__menu-inner">
                            <EditOutlined />
                            <span class="works-view__menu-label">继续编辑</span>
                          </span>
                        </Tooltip>
                        <template v-else>
                          <span class="works-view__menu-inner">
                            <EditOutlined />
                            <span class="works-view__menu-label">继续编辑</span>
                          </span>
                        </template>
                      </MenuItem>

                      <MenuDivider />

                      <!-- 设为公开 / 取消公开：仅 Published 状态可用 -->
                      <MenuItem key="togglePublic" :disabled="!canTogglePublic(work)">
                        <Tooltip
                          v-if="!canTogglePublic(work)"
                          title="作品发布后才能调整公开性"
                          placement="left"
                        >
                          <span class="works-view__menu-inner">
                            <component :is="work.isPublic ? EyeInvisibleOutlined : EyeOutlined" />
                            <span class="works-view__menu-label">
                              {{ work.isPublic ? '取消公开' : '设为公开' }}
                            </span>
                          </span>
                        </Tooltip>
                        <template v-else>
                          <span class="works-view__menu-inner">
                            <component :is="work.isPublic ? EyeInvisibleOutlined : EyeOutlined" />
                            <span class="works-view__menu-label">
                              {{ work.isPublic ? '取消公开' : '设为公开' }}
                            </span>
                          </span>
                        </template>
                      </MenuItem>

                      <!-- 发布为模板：仅 Published 且未模板可用 -->
                      <MenuItem key="publishTemplate" :disabled="!canPublishTemplate(work)">
                        <Tooltip
                          v-if="!canPublishTemplate(work)"
                          :title="getPublishTemplateDisableReason(work)"
                          placement="left"
                        >
                          <span class="works-view__menu-inner">
                            <AppstoreAddOutlined />
                            <span class="works-view__menu-label">发布为模板</span>
                          </span>
                        </Tooltip>
                        <template v-else>
                          <span class="works-view__menu-inner">
                            <AppstoreAddOutlined />
                            <span class="works-view__menu-label">发布为模板</span>
                          </span>
                        </template>
                      </MenuItem>

                      <MenuDivider />

                      <MenuItem key="delete" danger>
                        <DeleteOutlined />
                        <span class="works-view__menu-label">删除作品</span>
                      </MenuItem>
                    </Menu>
                  </template>
                </Dropdown>
              </div>
            </div>
          </article>
        </div>

        <!-- 分页器（仅当 total 超过单页容量时显示） -->
        <div v-if="total > pagination.pageSize" class="works-view__pagination">
          <Pagination
            v-model:current="pagination.page"
            v-model:pageSize="pagination.pageSize"
            :total="total"
            :pageSizeOptions="['12', '24', '48']"
            :showSizeChanger="true"
            :showTotal="(t: number) => `共 ${t} 项`"
            @change="handlePageChange"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Key } from 'ant-design-vue/lib/_util/type'
import type { MyListQuery, WorkListItemDto } from '@/api/modules/work'
import {
  AppstoreAddOutlined,
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileImageOutlined,
  FireOutlined,
  MoreOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'
import {
  Button,
  Dropdown,
  Empty,
  InputSearch,
  Menu,
  MenuDivider,
  MenuItem,
  message,
  Modal,
  Pagination,
  Select,
  Skeleton,
  Tag,
  Tooltip,
} from 'ant-design-vue'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  createWork,
  deleteWork,
  getMyWorkList,
  getWorkStatusInfo,
  publishTemplate,
  setPublic,
  WorkStatusEnum,
} from '@/api/modules/work'
import { useService } from '@/hooks/useService'
import { defaultPageProps } from '@/stores/editor'

/**
 * antd Vue Menu @click 的事件载荷类型（与 UserMenu 写法一致）
 * - 仅取需要的 key + domEvent，足够覆盖业务用法
 */
interface MenuClickEvent {
  key: Key
  domEvent: Event
}

const router = useRouter()

// ============================================================
// 工具栏选项：写死成常量，避免每次渲染都重新构造对象数组
// ============================================================
const STATUS_OPTIONS = [
  { value: undefined, label: '全部状态' },
  { value: WorkStatusEnum.Initial, label: '草稿' },
  { value: WorkStatusEnum.Published, label: '已发布' },
]

/**
 * isTemplate 在 UI 层用字符串枚举表达：antd Select 的 value 不接受 boolean，
 * 这里用 'all' / 'normal' / 'template' 三态，请求时再映射到后端的 boolean | undefined
 */
type TemplateFilter = 'all' | 'normal' | 'template'

const TEMPLATE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'normal', label: '普通作品' },
  { value: 'template', label: '模板' },
] satisfies { value: TemplateFilter, label: string }[]

const SORT_OPTIONS = [
  { value: 'updatedAt', label: '最近编辑' },
  { value: 'createdAt', label: '最新创建' },
  { value: 'latestPublishAt', label: '最新发布' },
  { value: 'copiedCount', label: '复制次数' },
] satisfies { value: NonNullable<MyListQuery['sortBy']>, label: string }[]

const templateFilterToQuery = (v: TemplateFilter): boolean | undefined => {
  if (v === 'normal') return false
  if (v === 'template') return true
  return undefined
}

// ============================================================
// 筛选 / 搜索 / 排序 / 分页 状态
// - searchInput：用户实时输入
// - searchKeyword：经过 300ms 防抖 / 提交后才作为请求参数
//   这样能避免每次按键都打接口，同时保留 InputSearch 的 Enter 即时搜索
// ============================================================
const searchInput = ref('')
const searchKeyword = ref('')
const filters = reactive({
  status: undefined as WorkStatusEnum | undefined,
  isTemplate: 'all' as TemplateFilter,
  sortBy: 'updatedAt' as NonNullable<MyListQuery['sortBy']>,
})

const pagination = reactive({
  page: 1,
  pageSize: 12,
})

const hasActiveFilter = computed(() => {
  if (searchKeyword.value) return true
  if (filters.status !== undefined) return true
  if (filters.isTemplate !== 'all') return true
  if (filters.sortBy !== 'updatedAt') return true
  return false
})

// ============================================================
// 列表数据
// - useService 自带的取消上一次请求 + 竞态保护已经足够，无需额外管理
// - silentSuccess: 列表接口成功不弹 toast；silentLoading：不显示全局进度条
// ============================================================
const works = ref<WorkListItemDto[]>([])
const total = ref(0)
const [doFetchList, loading] = useService(getMyWorkList, {
  config: { silentSuccess: true, silentLoading: true },
})

const fetchList = async () => {
  const [resp, err] = await doFetchList({
    page: pagination.page,
    pageSize: pagination.pageSize,
    title: searchKeyword.value || undefined,
    status: filters.status,
    isTemplate: templateFilterToQuery(filters.isTemplate),
    sortBy: filters.sortBy,
    sortOrder: 'desc',
  })
  if (err || !resp) return
  works.value = resp.list
  total.value = resp.total
}

// ============================================================
// 搜索防抖：watch searchInput → 300ms 后写入 searchKeyword 触发请求
// - 直接按回车 / 点放大镜时会走 handleSearchSubmit 立刻提交，无需等防抖
// ============================================================
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(searchInput, (next) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    const nextKeyword = next.trim()
    if (nextKeyword === searchKeyword.value) return
    searchKeyword.value = nextKeyword
    pagination.page = 1
    fetchList()
  }, 300)
})

const handleSearchSubmit = (value: string) => {
  if (searchTimer) clearTimeout(searchTimer)
  const next = (value ?? '').trim()
  if (next === searchKeyword.value) return
  searchKeyword.value = next
  pagination.page = 1
  fetchList()
}

// 筛选 / 排序变更 → 回到第一页 + 重新拉数据
watch(
  () => [filters.status, filters.isTemplate, filters.sortBy] as const,
  () => {
    pagination.page = 1
    fetchList()
  },
)

const handlePageChange = (page: number, pageSize: number) => {
  pagination.page = page
  pagination.pageSize = pageSize
  fetchList()
}

const handleResetFilters = () => {
  searchInput.value = ''
  searchKeyword.value = ''
  filters.status = undefined
  filters.isTemplate = 'all'
  filters.sortBy = 'updatedAt'
  pagination.page = 1
  fetchList()
}

onMounted(() => {
  fetchList()
})

// 卸载时清理 timer，避免组件销毁后还触发请求
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

// ============================================================
// 创建作品（复用 AppHeader 中的逻辑：默认 props + 空 components → 跳编辑器）
// ============================================================
const [doCreateWork, creating] = useService(createWork)

const handleCreate = async () => {
  const [work, err] = await doCreateWork({
    title: '未命名作品',
    content: { components: [], props: { ...defaultPageProps } },
  })
  if (err || !work) return
  router.push(`/editor/${work.id}`)
}

// ============================================================
// 卡片操作：编辑 / 切换公开 / 发布模板 / 删除
// - 单独包 useService 让多个卡片操作互不抢 loading
// ============================================================

/**
 * 可编辑性：仅 Initial（草稿）/ Published（已发布）允许进入编辑器
 * - Deleted：软删后端会过滤掉本接口，理论看不到；这里仍做前端兜底
 * - Declined：强制下线后业务上不允许再修改
 */
const canEdit = (work: WorkListItemDto) =>
  work.status === WorkStatusEnum.Initial
  || work.status === WorkStatusEnum.Published

const handleEdit = (work: WorkListItemDto) => {
  if (!canEdit(work)) return
  router.push(`/editor/${work.id}`)
}

/**
 * 卡片整体点击 / 回车的统一入口
 * - 不可编辑状态下静默忽略，不跳转也不弹提示，避免对用户造成干扰
 * - 底部 footer 按钮区域已 stopPropagation，不会重复触发本 handler
 */
const handleCardClick = (work: WorkListItemDto) => {
  if (!canEdit(work)) return
  handleEdit(work)
}

/** 仅已发布的作品可以切换公开性（后端有同样约束，前端先拦避免误点） */
const canTogglePublic = (work: WorkListItemDto) =>
  work.status === WorkStatusEnum.Published

/** 仅"已发布 + 非模板"才能发布为模板（业务上模板一旦发布不可取消） */
const canPublishTemplate = (work: WorkListItemDto) =>
  work.status === WorkStatusEnum.Published && !work.isTemplate

const getPublishTemplateDisableReason = (work: WorkListItemDto) => {
  if (work.status !== WorkStatusEnum.Published) return '作品发布后才能发布为模板'
  if (work.isTemplate) return '该作品已是模板'
  return ''
}

const [doSetPublic] = useService(setPublic, { config: { silentSuccess: true } })
const [doPublishTemplate] = useService(publishTemplate, { config: { silentSuccess: true } })
const [doDeleteWork] = useService(deleteWork, { config: { silentSuccess: true } })

const handleTogglePublic = async (work: WorkListItemDto) => {
  if (!canTogglePublic(work)) return
  const next = !work.isPublic
  const [, err] = await doSetPublic({ id: work.id, isPublic: next })
  if (err) return
  message.success(next ? '已设为公开' : '已取消公开')
  fetchList()
}

const handlePublishTemplate = (work: WorkListItemDto) => {
  if (!canPublishTemplate(work)) return
  Modal.confirm({
    title: '发布为模板',
    content: `「${work.title || '未命名作品'}」发布后将成为模板，他人可在模板列表中复制使用。模板一经发布不可取消，是否继续？`,
    okText: '确认发布',
    cancelText: '取消',
    onOk: async () => {
      const [, err] = await doPublishTemplate(work.id)
      if (err) return
      message.success('已发布为模板')
      fetchList()
    },
  })
}

const handleDeleteWork = (work: WorkListItemDto) => {
  Modal.confirm({
    title: '删除作品',
    content: `确认删除「${work.title || '未命名作品'}」？删除后不可恢复。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const [, err] = await doDeleteWork(work.id)
      if (err) return
      message.success('已删除')

      // 边界：删除当前页最后一项时（且不是第一页）回退一页，避免空页
      if (works.value.length === 1 && pagination.page > 1) {
        pagination.page -= 1
      }
      fetchList()
    },
  })
}

const handleMenuClick = (e: MenuClickEvent, work: WorkListItemDto) => {
  // 阻止 dropdown overlay 的点击冒泡到外层卡片 click 触发跳转
  e.domEvent.stopPropagation()
  switch (e.key) {
    case 'edit':
      handleEdit(work)
      return
    case 'togglePublic':
      handleTogglePublic(work)
      return
    case 'publishTemplate':
      handlePublishTemplate(work)
      return
    case 'delete':
      handleDeleteWork(work)
  }
}

// ============================================================
// 日期工具：相对时间（meta 区简洁展示） + 完整时间（tooltip 用）
// - 没有 dayjs 依赖，手撸一个轻量相对时间足够列表场景使用
// ============================================================
const formatFullDate = (input?: string) => {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour12: false })}`
}

const formatRelativeDate = (input?: string) => {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'

  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return '刚刚'

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} 分钟前`

  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} 小时前`

  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} 天前`

  // 超过 30 天直接展示 YYYY-MM-DD，避免误读"X 月前"
  return d.toLocaleDateString('zh-CN')
}
</script>

<style scoped>
/* ============================================================
   页面整体：浅灰背景，工具栏 / 卡片列表区各为一块独立白色卡片
   - 灰底 → 两块白色卡片（toolbar + content）→ 内部内容
   ============================================================ */
.works-view {
  flex: 1;
  background: #f5f7fa;
  padding: 32px 24px 64px;
  min-height: 0;
}

.works-view__container {
  max-width: 1280px;
  margin: 0 auto;
}

/* ===== 顶部 header ===== */
.works-view__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.works-view__header-left {
  min-width: 0;
}

.works-view__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.works-view__subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* ===== 工具栏：独立白色卡片 ===== */
.works-view__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 6px rgba(15, 23, 42, 0.04);
}

.works-view__search {
  flex: 1;
  min-width: 240px;
  max-width: 360px;
}

.works-view__filter {
  width: 140px;
}

/* ===== 主内容区：独立白色大容器，包裹卡片网格 / 骨架 / 空态 ===== */
.works-view__content {
  min-height: 360px;
  padding: 24px;
  background: #fff;
  border-radius: 12px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 2px 6px rgba(15, 23, 42, 0.04);
}

.works-view__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 24px;
}

/* ===== 卡片网格 ===== */
.works-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.works-view__skeleton {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  min-height: 340px;
}

/* ===== 卡片：在白色容器内，用浅 border 分隔；hover 加 shadow 浮起 ===== */
.works-view__card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #ebebeb;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.works-view__card:hover,
.works-view__card:focus-visible {
  transform: translateY(-2px);
  border-color: #d6e4ff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.1);
}

/* 不可编辑：去掉点击交互信号 + 轻度灰化 + hover 不浮起 */
.works-view__card--disabled {
  cursor: default;
  opacity: 0.65;
}

.works-view__card--disabled:hover,
.works-view__card--disabled:focus-visible {
  transform: none;
  border-color: #ebebeb;
  box-shadow: none;
}

/* ===== 封面 ===== */
.works-view__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, #e0e7ff 0%, #f5f3ff 100%);
  overflow: hidden;
}

.works-view__cover-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.works-view__cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #a1a1aa;
  font-size: 12px;
}

.works-view__cover-placeholder :deep(svg) {
  font-size: 36px;
}

/* 左上角 status tag */
.works-view__status-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  margin: 0;
  z-index: 2;
}

/* hover 遮罩 + 蓝色"继续编辑"圆角 CTA（仅可编辑卡片渲染 mask） */
.works-view__cover-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.works-view__card:hover .works-view__cover-mask,
.works-view__card:focus-visible .works-view__cover-mask {
  opacity: 1;
}

.works-view__cover-mask-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  background: rgba(22, 119, 255, 0.95);
  border-radius: 999px;
  box-shadow: 0 6px 16px rgba(22, 119, 255, 0.32);
}

/* ===== 卡片信息区 ===== */
.works-view__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px 12px;
}

.works-view__card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.works-view__card-desc {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
  /* 两行截断 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  min-height: calc(12px * 1.6 * 2);
}

.works-view__card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
  font-size: 12px;
  color: #9ca3af;
}

.works-view__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ===== 卡片底部一行：左 tags 区 + 右 更多按钮（同行紧凑） ===== */
.works-view__card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  /* 占位高度，让有/无 tag 的卡片底部对齐 */
  min-height: 26px;
}

.works-view__card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
}

.works-view__card-tags :deep(.ant-tag) {
  margin: 0;
}

/* 更多操作按钮：text 类型 + 小尺寸，正常状态不抢眼，hover 出灰底反馈 */
.works-view__more-btn {
  flex-shrink: 0;
  color: #6b7280;
}

.works-view__more-btn:hover {
  color: #1677ff;
  background: rgba(0, 0, 0, 0.04);
}

/* ===== Dropdown 菜单内部样式（控制 disabled + tooltip 内的图标对齐） ===== */
.works-view__menu :deep(.ant-dropdown-menu-item) {
  display: flex;
  align-items: center;
  gap: 8px;
}

.works-view__menu-inner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.works-view__menu-label {
  font-size: 14px;
}

/* ===== 分页 ===== */
.works-view__pagination {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .works-view {
    padding: 20px 12px 48px;
  }

  .works-view__header {
    flex-direction: column;
    align-items: stretch;
  }

  .works-view__toolbar {
    padding: 12px;
  }

  .works-view__search,
  .works-view__filter {
    width: 100%;
    max-width: none;
  }
}
</style>
