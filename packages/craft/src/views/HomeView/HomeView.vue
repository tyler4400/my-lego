<template>
  <div class="home-view">
    <!-- ============================================================
         1. Hero 区：背景大图 + 暗色蒙层 + 文案 + 居中搜索框
         - 背景图先用 no-use/login-horizon.png 占位，待运营图替换
         ============================================================ -->
    <section class="home-view__hero" :style="heroBgStyle">
      <div class="home-view__hero-overlay" />

      <div class="home-view__hero-content">
        <h1 class="home-view__hero-title">
          海量精彩设计 <span class="home-view__hero-title-accent">一键生成</span>
        </h1>
        <p class="home-view__hero-subtitle">
          精选优质 H5 模板，替换文字图片即可发布
        </p>

        <div class="home-view__hero-search">
          <InputSearch
            v-model:value="searchInput"
            class="home-view__search"
            size="large"
            placeholder="搜索一下，快速找模板"
            allowClear
            :maxlength="50"
            enterButton
            @search="handleSearchSubmit"
          />
        </div>
      </div>
    </section>

    <!-- ============================================================
         2. Features 区：三个特性 icon + 文案
         - 资源占位，icon 用 antd 提供
         ============================================================ -->
    <section class="home-view__features">
      <div
        v-for="feature in FEATURES"
        :key="feature.title"
        class="home-view__feature"
      >
        <component :is="feature.icon" class="home-view__feature-icon" />
        <h3 class="home-view__feature-title">
          {{ feature.title }}
        </h3>
        <p class="home-view__feature-desc">
          {{ feature.desc }}
        </p>
      </div>
    </section>

    <!-- ============================================================
         3. Section 标题 + 4. 排序 Toolbar
         ============================================================ -->
    <section class="home-view__section">
      <header class="home-view__section-header">
        <div class="home-view__section-title">
          <span class="home-view__section-title-line" />
          <h2 class="home-view__section-title-text">
            热门海报
          </h2>
          <span class="home-view__section-title-line" />
        </div>
        <p class="home-view__section-subtitle">
          只需替换文字和图片，一键自动生成 H5
        </p>
      </header>

      <div class="home-view__toolbar">
        <Tabs v-model:activeKey="sortBy" :tabBarGutter="32" class="home-view__sort-tabs">
          <TabPane key="latestPublishAt" tab="最新" />
          <TabPane key="copiedCount" tab="最热" />
        </Tabs>
        <span v-if="!loading && total > 0" class="home-view__total">
          共 {{ total }} 个模板
        </span>
      </div>

      <!-- ============================================================
           5. 卡片网格 / 空态 / 骨架屏
           ============================================================ -->
      <!-- 5a. 首屏 / refresh 骨架屏（仅在 list 为空时显示） -->
      <div v-if="loading && list.length === 0" class="home-view__grid">
        <div v-for="i in 8" :key="i" class="home-view__skeleton">
          <Skeleton :paragraph="{ rows: 3 }" active />
        </div>
      </div>

      <!-- 5b. 空态：有搜索词 vs 完全无数据 -->
      <div v-else-if="isEmpty" class="home-view__empty">
        <Empty
          :imageStyle="{ height: '120px' }"
          :description="searchKeyword ? '没有找到匹配的模板' : '暂无公开模板'"
        >
          <Button v-if="searchKeyword" @click="handleClearSearch">
            清除搜索
          </Button>
        </Empty>
      </div>

      <!-- 5c. 卡片网格 -->
      <div v-else class="home-view__grid">
        <TemplateCard
          v-for="work in list"
          :key="work.id"
          :work="work"
          :copying="copyingId === work.id"
          @copy="handleCopy"
        />
      </div>

      <!-- ============================================================
           6. 加载更多区
           ============================================================ -->
      <div v-if="list.length > 0" class="home-view__load-more">
        <Button
          v-if="hasMore"
          type="primary"
          shape="round"
          size="large"
          :loading="loadingMore"
          class="home-view__load-more-btn"
          @click="loadMore"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </Button>
        <span v-else class="home-view__load-more-end">
          —— 已经到底啦 ——
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { PublicListQuery, WorkPublicListItemDto } from '@/api/modules/work.ts'
import {
  AppstoreOutlined,
  BulbOutlined,
  Html5Outlined,
} from '@ant-design/icons-vue'
import {
  Button,
  Empty,
  InputSearch,
  Skeleton,
  TabPane,
  Tabs,
} from 'ant-design-vue'
import { ref, watch } from 'vue'
import { getPublicWorkList } from '@/api/modules/work.ts'
import heroBg from '@/assets/login-vertical.png'
import { useCopyWork } from '@/hooks/useCopyWork.ts'
import { useLoadMore } from '@/hooks/useLoadMore.ts'
import TemplateCard from './components/TemplateCard.vue'

// ============================================================
// Hero 背景：图片资源待替换，先用现有占位
// ============================================================
const heroBgStyle = { backgroundImage: `url(${heroBg})` }

// ============================================================
// Features：三段特性说明，资源占位，文案与设计图对齐
// ============================================================
interface Feature {
  icon: Component
  title: string
  desc: string
}

const FEATURES: Feature[] = [
  { icon: Html5Outlined, title: '专注 H5 始终如一', desc: '三年保持行业领先' },
  { icon: AppstoreOutlined, title: '海量 H5 模板', desc: '一键生成，一分钟轻松制作' },
  { icon: BulbOutlined, title: '极致体验', desc: '用户的一致选择' },
]

// ============================================================
// 搜索 + 排序：状态先声明（useLoadMore 的 params 依赖它们）
// - searchInput：UI 双向绑定
// - searchKeyword：实际作为请求参数的关键词
// - sortBy：最热 / 最新，默认最热与"热门海报"语义对齐
// ============================================================
const searchInput = ref('')
const searchKeyword = ref('')

type SortKey = NonNullable<PublicListQuery['sortBy']>
const sortBy = ref<SortKey>('copiedCount')

// ============================================================
// 瀑布流数据：useLoadMore 统一管理 list / total / hasMore / loading / loadingMore
// - params 变化（搜索词 / 排序）自动 refresh（内部 300ms 防抖）
// ============================================================
const {
  list,
  total,
  loading,
  loadingMore,
  hasMore,
  isEmpty,
  loadMore,
  refresh,
} = useLoadMore({
  fetchFn: getPublicWorkList,
  params: () => ({
    title: searchKeyword.value || undefined,
    sortBy: sortBy.value,
    sortOrder: 'desc',
  }) satisfies PublicListQuery,
  pageSize: 12,
})

// 输入实时同步到 searchKeyword，useLoadMore 内部 watch(params) 已做 300ms 防抖
watch(searchInput, (next) => {
  searchKeyword.value = next.trim()
})

const handleSearchSubmit = (value: string) => {
  // 回车 / 放大镜：立刻提交，绕过 useLoadMore 的防抖
  searchKeyword.value = (value ?? '').trim()
  refresh()
}

const handleClearSearch = () => {
  searchInput.value = ''
  searchKeyword.value = ''
}

// ============================================================
// 复制模板：按 id 维度独立 loading，避免点击 A 时 B 也变 loading
// ============================================================
const copyingId = ref<number | null>(null)
const { doCopy } = useCopyWork()

const handleCopy = async (work: WorkPublicListItemDto) => {
  if (copyingId.value !== null) return
  copyingId.value = work.id
  try {
    await doCopy(work.id)
    // 成功跳转由 useCopyWork 内部处理（router.push），无需额外操作
  }
  finally {
    copyingId.value = null
  }
}
</script>

<style scoped>
/* ============================================================
   页面容器：浅灰底色，与 WorksView / SettingsView 视觉一致
   ============================================================ */
.home-view {
  flex: 1;
  background: #f5f7fa;
  min-height: 0;
  padding-bottom: 64px;
}

/* ============================================================
   1. Hero 区：320 ~ 360px 高，背景图覆盖 + 暗色渐变蒙层
   ============================================================ */
.home-view__hero {
  position: relative;
  width: 100%;
  min-height: 340px;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #1f2937;
  overflow: hidden;
}

.home-view__hero-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(15, 23, 42, 0.78) 100%);
  pointer-events: none;
}

.home-view__hero-content {
  position: relative;
  z-index: 1;
  max-width: 760px;
  margin: 0 auto;
  padding: 80px 24px 64px;
  text-align: center;
  color: #fff;
}

.home-view__hero-title {
  margin: 0 0 16px;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 2px;
  line-height: 1.3;
}

.home-view__hero-title-accent {
  color: #60a5fa;
}

.home-view__hero-subtitle {
  margin: 0 0 32px;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.78);
}

.home-view__hero-search {
  max-width: 560px;
  margin: 0 auto;
}

/* InputSearch 圆角化：让搜索框在 hero 上看起来像独立的"灵动岛" */
.home-view__search :deep(.ant-input-affix-wrapper),
.home-view__search :deep(.ant-input) {
  border-radius: 999px 0 0 999px !important;
  padding-left: 20px;
}

.home-view__search :deep(.ant-input-search-button) {
  border-radius: 0 999px 999px 0 !important;
  width: 56px;
  height: 40px;
}

.home-view__search :deep(.ant-input-group-addon) {
  border-radius: 0 999px 999px 0;
  overflow: hidden;
}

/* ============================================================
   2. Features 区：3 列等分，白底卡片
   ============================================================ */
.home-view__features {
  max-width: 1200px;
  margin: -32px auto 0;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  position: relative;
  z-index: 2;
}

.home-view__feature {
  background: #fff;
  border-radius: 14px;
  padding: 28px 24px;
  text-align: center;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.home-view__feature-icon {
  font-size: 36px;
  color: #1677ff;
  margin-bottom: 12px;
}

.home-view__feature-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.home-view__feature-desc {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

/* ============================================================
   3. Section 区：标题 + 装饰短线
   ============================================================ */
.home-view__section {
  max-width: 1200px;
  margin: 56px auto 0;
  padding: 0 24px;
}

.home-view__section-header {
  text-align: center;
  margin-bottom: 28px;
}

.home-view__section-title {
  display: inline-flex;
  align-items: center;
  gap: 16px;
}

.home-view__section-title-line {
  width: 48px;
  height: 2px;
  background: #cbd5e1;
}

.home-view__section-title-text {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
}

.home-view__section-subtitle {
  margin: 10px 0 0;
  font-size: 13px;
  color: #94a3b8;
}

/* ============================================================
   4. Toolbar：排序 + 计数
   ============================================================ */
.home-view__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  padding: 0 4px;
}

.home-view__sort-tabs {
  flex: 1;
  min-width: 0;
}

.home-view__sort-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.home-view__sort-tabs :deep(.ant-tabs-nav::before) {
  border-bottom-color: transparent;
}

.home-view__sort-tabs :deep(.ant-tabs-tab) {
  font-size: 15px;
  padding: 8px 0;
}

.home-view__total {
  flex-shrink: 0;
  font-size: 13px;
  color: #6b7280;
}

/* ============================================================
   5. 卡片网格 / 骨架屏 / 空态
   - 4 列在 ≥1200px，向下自适应
   - minmax 第一个参数 = 卡片最小宽度
   ============================================================ */
.home-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.home-view__skeleton {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  min-height: 360px;
}

.home-view__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* ============================================================
   6. 加载更多：居中圆形主色按钮 / 已加载完毕灰色文案
   ============================================================ */
.home-view__load-more {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

.home-view__load-more-btn {
  min-width: 160px;
  height: 44px;
  font-size: 15px;
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.3);
}

.home-view__load-more-end {
  font-size: 13px;
  color: #cbd5e1;
  letter-spacing: 1px;
}

/* ============================================================
   响应式
   ============================================================ */
@media (max-width: 768px) {
  .home-view__hero-content {
    padding: 56px 16px 48px;
  }

  .home-view__hero-title {
    font-size: 28px;
  }

  .home-view__hero-subtitle {
    font-size: 14px;
  }

  .home-view__features {
    grid-template-columns: 1fr;
    margin-top: -24px;
  }

  .home-view__section {
    margin-top: 40px;
  }

  .home-view__toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
