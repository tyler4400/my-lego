<template>
  <article
    class="template-card"
    tabindex="0"
    role="button"
    :aria-label="`预览模版 ${displayTitle}`"
    @click="handlePreview"
    @keydown.enter="handlePreview"
  >
    <!-- 封面区：图片 / 占位 / HOT 角标 / hover 蒙层 -->
    <div class="template-card__cover">
      <img
        v-if="work.coverImg"
        :src="work.coverImg"
        :alt="displayTitle"
        class="template-card__cover-img"
        loading="lazy"
      >
      <div v-else class="template-card__cover-placeholder">
        <FileImageOutlined />
        <span>暂无封面</span>
      </div>

      <span v-if="isHot" class="template-card__hot-tag">HOT</span>

      <!-- hover 蒙层：主操作"立即使用"（点击仅触发复制，不冒泡到卡片预览） -->
      <div class="template-card__mask">
        <Button
          type="primary"
          shape="round"
          size="large"
          :loading="copying"
          class="template-card__cta"
          @click.stop="handleCopy"
          @keydown.enter.stop="handleCopy"
        >
          <template #icon>
            <CopyOutlined />
          </template>
          立即使用
        </Button>
        <span class="template-card__mask-hint">点击卡片预览效果</span>
      </div>
    </div>

    <!-- 信息区 -->
    <div class="template-card__info">
      <h3 class="template-card__title" :title="displayTitle">
        {{ displayTitle }}
      </h3>

      <div class="template-card__meta">
        <span class="template-card__author" :title="authorName">
          <Avatar
            :src="work.user?.picture"
            :size="20"
            class="template-card__author-avatar"
          >
            <template #icon>
              <UserOutlined />
            </template>
          </Avatar>
          <span class="template-card__author-name">{{ authorLabel }}</span>
        </span>

        <span class="template-card__copied" :title="`被使用 ${work.copiedCount} 次`">
          <UserOutlined />
          {{ formatCount(work.copiedCount) }}
        </span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { WorkPublicListItemDto } from '@/api/modules/work.ts'
import { CopyOutlined, FileImageOutlined, UserOutlined } from '@ant-design/icons-vue'
import { Avatar, Button } from 'ant-design-vue'
import { computed } from 'vue'
import { isWorkHot } from '@/api/modules/work.ts'
import { buildH5Url } from '@/utils/h5Url.ts'

interface Props {
  work: WorkPublicListItemDto
  /** 复制中（由父组件按 work.id 维度控制，避免连点） */
  copying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  copying: false,
})

const emit = defineEmits<{
  (e: 'copy', work: WorkPublicListItemDto): void
}>()

const displayTitle = computed(() => props.work.title || '未命名作品')

const authorName = computed(() =>
  props.work.user?.nickName || props.work.user?.username || props.work.author || '匿名作者',
)

const authorLabel = computed(() => `作者：${authorName.value}`)

const isHot = computed(() => isWorkHot(props.work))

/**
 * 复制次数文案：>=1000 显示"1.2k"，否则原数字
 * - 列表场景空间紧，做一层简单压缩，避免大数字撑爆 meta 行
 */
const formatCount = (count: number) => {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

/**
 * 卡片点击 = 在新窗口打开 H5 预览（模板均为 Published，无需 preview=true）
 * - uuid 缺失时降级：不打开，避免拼出非法 URL
 */
const handlePreview = () => {
  if (!props.work.uuid) return
  const url = buildH5Url(props.work.id, props.work.uuid)
  window.open(url, '_blank', 'noopener,noreferrer')
}

const handleCopy = () => {
  if (props.copying) return
  emit('copy', props.work)
}
</script>

<style scoped>
/* ============================================================
   卡片整体：白底圆角 + 阴影 + hover 抬升
   ============================================================ */
.template-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  outline: none;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 1px 8px rgba(15, 23, 42, 0.04);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.template-card:hover,
.template-card:focus-visible {
  transform: translateY(-4px);
  box-shadow:
    0 4px 12px rgba(15, 23, 42, 0.08),
    0 12px 32px rgba(15, 23, 42, 0.12);
}

/* ============================================================
   封面区：竖向 3:4 比例，匹配 H5 海报的纵向心智
   ============================================================ */
.template-card__cover {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);
}

.template-card__cover-img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.template-card:hover .template-card__cover-img {
  transform: scale(1.04);
}

.template-card__cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #94a3b8;
  font-size: 12px;
}

.template-card__cover-placeholder :deep(svg) {
  font-size: 40px;
}

/* ============================================================
   HOT 角标：左上角红色斜标
   ============================================================ */
.template-card__hot-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #fff;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
  border-radius: 10px 10px 10px 2px;
  box-shadow: 0 2px 6px rgba(238, 90, 90, 0.4);
  z-index: 2;
}

/* ============================================================
   hover 蒙层：暗色遮罩 + 主按钮 + 辅助文案
   ============================================================ */
.template-card__mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.1) 0%, rgba(15, 23, 42, 0.55) 100%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.template-card:hover .template-card__mask,
.template-card:focus-visible .template-card__mask {
  opacity: 1;
  pointer-events: auto;
}

.template-card__cta {
  min-width: 140px;
  font-weight: 500;
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.4);
}

.template-card__mask-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

/* ============================================================
   信息区：标题 + 一行 meta
   ============================================================ */
.template-card__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
}

.template-card__title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #6b7280;
}

.template-card__author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.template-card__author-avatar {
  flex-shrink: 0;
  background: #e5e7eb;
}

.template-card__author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card__copied {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #9ca3af;
}
</style>
