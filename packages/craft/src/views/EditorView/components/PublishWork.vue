<template>
  <Modal
    :open="open"
    :width="820"
    title="发布作品"
    :maskClosable="false"
    :closable="!publishing"
    :footer="null"
    centered
    @update:open="handleClose"
  >
    <div class="publish-work">
      <!-- 左：封面 + 标题 + 描述 -->
      <aside class="publish-work__aside">
        <div class="publish-work__cover">
          <img
            v-if="coverImg"
            :src="coverImg"
            alt="作品封面"
            class="publish-work__cover-img"
          >
          <div v-else class="publish-work__cover-empty">
            无封面
          </div>
        </div>
        <div class="publish-work__title" :title="title">
          {{ title }}
        </div>
        <div class="publish-work__desc" :title="desc">
          {{ desc || '暂无描述' }}
        </div>
      </aside>

      <!-- 右：渠道管理 -->
      <section class="publish-work__main">
        <header class="publish-work__main-head">
          <span class="publish-work__main-title">投放渠道</span>
          <span class="publish-work__main-tip">
            渠道号一旦生成永远不变，方便分渠道统计
          </span>
        </header>

        <div class="publish-work__channel-add">
          <Input
            v-model:value="newChannelName"
            placeholder="新渠道名称（如：抖音、小红书）"
            :maxlength="20"
            :disabled="creatingChannel"
            allowClear
            @pressEnter="handleCreate"
          />
          <Button
            type="primary"
            :loading="creatingChannel"
            :disabled="!newChannelName.trim()"
            @click="handleCreate"
          >
            <PlusOutlined />
            添加
          </Button>
        </div>

        <div v-if="localChannels.length === 0" class="publish-work__channels-empty">
          还没有渠道，新增一个用于分渠道统计吧
        </div>

        <div v-else class="publish-work__channel-list">
          <div
            v-for="channel in localChannels"
            :key="channel.id"
            class="publish-work__channel-item"
          >
            <QRCode :value="getChannelUrl(channel.id)" :size="84" />

            <div class="publish-work__channel-info">
              <div class="publish-work__channel-name-row">
                <TypographyParagraph
                  class="publish-work__channel-name"
                  :content="channel.name"
                  :editable="{
                    triggerType: ['icon', 'text'],
                    maxlength: 20,
                    autoSize: { minRows: 1, maxRows: 1 },
                  }"
                  @update:content="(next: string) => commitRename(channel, next)"
                />
              </div>
              <TypographyParagraph
                class="publish-work__channel-url"
                :content="getChannelUrl(channel.id)"
                copyable
                :ellipsis="{ tooltip: getChannelUrl(channel.id) }"
              />
            </div>

            <!-- 删除按钮：剩最后 1 个时隐藏（UX 鼓励保留至少 1 个） -->
            <Button
              v-if="localChannels.length > 1"
              type="text"
              danger
              shape="circle"
              :disabled="anyChannelLoading"
              :loading="deletingChannelId === channel.id"
              @click="handleDelete(channel)"
            >
              <DeleteOutlined />
            </Button>
          </div>
        </div>
      </section>
    </div>

    <!-- 底部：发布按钮 -->
    <footer class="publish-work__footer">
      <Button :disabled="publishing" @click="handleClose">
        取消
      </Button>
      <Button
        type="primary"
        :loading="publishing"
        @click="handlePublish"
      >
        <CloudUploadOutlined />
        {{ publishButtonText }}
      </Button>
    </footer>
  </Modal>
</template>

<script setup lang="ts">
import type { WorkChannel } from '@/api/modules/work.ts'
import { CloudUploadOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue'
import { Button, Input, message, Modal, TypographyParagraph } from 'ant-design-vue'
import { computed, ref, watch } from 'vue'
import {
  createChannel,
  deleteChannel,
  publishWork,
  updateChannelName,
  updateWork,
  WorkStatusEnum,
} from '@/api/modules/work.ts'
import QRCode from '@/components/QRCode'
import { useService } from '@/hooks/useService.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { buildH5Url } from '@/utils/h5Url.ts'

interface Props {
  /** 弹窗显隐 */
  open: boolean
  /** 已上传到图床的封面 URL（由父组件在弹窗打开前完成截图 + 上传） */
  coverImg: string
}

const { open, coverImg } = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
}>()

const editorStore = useEditorStore()

// ===== 基础展示数据（从 store 读，弹窗里只读，不写） =====
const title = computed(() => editorStore.pageData.title || '未命名作品')
const desc = computed(() => editorStore.pageData.desc || '')
const workId = computed(() => editorStore.pageData.id)
const workUuid = computed(() => editorStore.pageData.uuid || '')
const status = computed(() => editorStore.pageData.status)

/**
 * 渠道用本地 ref 维护，弹窗里所有增/删/改都只更新 localChannels，不再 patch 全局 store。
 * 弹窗关闭后由父组件统一调 useFetchWork.init() 重新拉取详情同步 store。
 * - 打开瞬间从 store 复制一份初始状态
 */
const localChannels = ref<WorkChannel[]>([])

watch(
  () => open,
  (next) => {
    if (next) {
      localChannels.value = (editorStore.pageData.channels ?? []).map(c => ({ ...c }))
    }
  },
  { immediate: true },
)

const getChannelUrl = (channelId: string) => {
  if (!workId.value || !workUuid.value) return ''
  return buildH5Url(workId.value, workUuid.value, { channelId })
}

// ===== 渠道改名（Typography.Paragraph editable 自带编辑态，提交时调 commitRename） =====
const [doUpdateChannel, updatingChannel] = useService(updateChannelName, {
  config: { silentSuccess: true },
})

const commitRename = async (channel: WorkChannel, nextName: string) => {
  const trimmed = nextName.trim()
  if (!trimmed || trimmed === channel.name) return
  if (!workId.value) return

  const [, err] = await doUpdateChannel({
    id: workId.value,
    channelId: channel.id,
    name: trimmed,
  })
  if (err) return

  localChannels.value = localChannels.value.map(c =>
    c.id === channel.id ? { ...c, name: trimmed } : c,
  )
  message.success('渠道名称已更新')
}

// ===== 新增渠道 =====
const newChannelName = ref('')

const [doCreateChannel, creatingChannel] = useService(createChannel, {
  config: { silentSuccess: true },
})

const handleCreate = async () => {
  const name = newChannelName.value.trim()
  if (!name) return
  if (!workId.value) return

  const [created, err] = await doCreateChannel({ id: workId.value, name })
  if (err || !created) return

  localChannels.value = [...localChannels.value, created]
  newChannelName.value = ''
  message.success('渠道已添加')
}

// ===== 删除渠道 =====
const [doDeleteChannel, deletingChannelLoading] = useService(deleteChannel, {
  config: { silentSuccess: true },
})
const deletingChannelId = ref<string | null>(null)

const handleDelete = async (channel: WorkChannel) => {
  if (!workId.value) return
  // 安全护栏：UX 上已隐藏按钮，这里再兜底（理论触发不到）
  if (localChannels.value.length <= 1) return

  deletingChannelId.value = channel.id
  const [, err] = await doDeleteChannel({ id: workId.value, channelId: channel.id })
  deletingChannelId.value = null

  if (err) return

  localChannels.value = localChannels.value.filter(c => c.id !== channel.id)
  message.success('渠道已删除')
}

// 任一渠道相关操作进行中，禁用其他渠道操作，避免脏写
const anyChannelLoading = computed(
  () => updatingChannel.value || creatingChannel.value || deletingChannelLoading.value,
)

// ===== 发布 / 再次发布 =====
const isFirstPublish = computed(() => status.value !== WorkStatusEnum.Published)
const publishButtonText = computed(() => (isFirstPublish.value ? '发布' : '再次发布'))

const [doUpdateWork, updatingWork] = useService(updateWork, {
  config: { silentSuccess: true },
})
const [doPublishWork, publishingWork] = useService(publishWork, {
  config: { silentSuccess: true },
})
const publishing = computed(() => updatingWork.value || publishingWork.value)

/**
 * 两步发布的执行顺序：先 update(coverImg) 再 publish
 *
 * 失败回退分析：
 * - update 失败 → 状态未变、封面未变 → 用户重试即可，零脏数据
 * - update 成功、publish 失败 → 状态还在 Initial、封面已新 → 用户重试，封面被无害再刷一次
 * - 反过来（先 publish 后 update）：publish 成功 update 失败 → 已发布但封面是旧的，列表显示旧封面，最丑陋
 */
const handlePublish = async () => {
  if (!workId.value) {
    message.error('作品 id 不存在，无法发布')
    return
  }
  if (!coverImg) {
    message.error('封面图未生成，请关闭弹窗重试')
    return
  }

  // Step 1: 更新封面（两种状态都要做）
  const [, updateErr] = await doUpdateWork({ id: workId.value, coverImg })
  if (updateErr) return

  // Step 2: 仅首次发布才调 publish
  if (isFirstPublish.value) {
    const [, publishErr] = await doPublishWork(workId.value)
    if (publishErr) return
    message.success('发布成功')
  }
  else {
    message.success('再次发布成功，封面已更新')
  }

  emit('update:open', false)
}

// ===== 关闭：发布中禁止关闭，避免请求飞行中状态混乱 =====
const handleClose = () => {
  if (publishing.value) return
  emit('update:open', false)
}
</script>

<style scoped>
.publish-work {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  min-height: 360px;
}

/* ===== 左侧：封面 + 标题 + 描述 ===== */
.publish-work__aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.publish-work__cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.publish-work__cover-img {
  max-width: 100%;
  max-height: 100%;
  display: block;
  object-fit: contain;
}

.publish-work__cover-empty {
  color: #bfbfbf;
  font-size: 13px;
}

.publish-work__title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.publish-work__desc {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
}

/* ===== 右侧：渠道管理 ===== */
.publish-work__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.publish-work__main-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
}

.publish-work__main-title {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.publish-work__main-tip {
  font-size: 12px;
  color: #9ca3af;
}

.publish-work__channel-add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.publish-work__channels-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  font-size: 13px;
  background: #fafafa;
  border-radius: 6px;
  min-height: 200px;
}

.publish-work__channel-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  max-height: 360px;
  overflow-y: auto;
  /* 给滚动条预留空间，避免列表项随滚动条出现而抖动 */
  padding-right: 4px;
}

.publish-work__channel-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.publish-work__channel-item:hover {
  border-color: #d6e4ff;
  box-shadow: 0 1px 4px rgba(22, 119, 255, 0.06);
}

.publish-work__channel-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.publish-work__channel-name-row {
  display: flex;
  align-items: center;
}

/* Ant Design Vue Typography 默认会有底部 margin，弹窗里太占空间，统一收紧 */
.publish-work__channel-name :deep(.ant-typography),
.publish-work__channel-url :deep(.ant-typography) {
  margin: 0;
}

.publish-work__channel-name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.publish-work__channel-name :deep(.ant-typography-edit-content) {
  margin: 0 !important;
}

.publish-work__channel-url {
  margin: 0 !important;
  font-size: 12px;
  color: #6b7280;
}

/* ===== 底部 ===== */
.publish-work__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>
