<template>
  <header class="editor-header">
    <!-- 左：紧凑 brand -->
    <AppBrand compact />

    <!-- 中：title + 保存状态 在左 / actions 在右，space-between -->
    <div class="editor-header__middle">
      <div class="editor-header__title-group">
        <TypographyParagraph
          class="editor-header__title"
          :editable="{ triggerType: ['text'], tooltip: false, maxlength: 50, autoSize: true }"
          :content="title"
          ellipsis
          @update:content="handleRenameTitle"
        />

        <!-- 保存状态：icon + 小字，点击弹出自动保存开关 -->
        <Popover trigger="click" placement="bottom">
          <template #content>
            <div class="autosave-pop">
              <span class="autosave-pop__label">自动保存</span>
              <Switch v-model:checked="autoSaveEnabled" size="small">
                <template #checkedChildren>
                  <CheckOutlined />
                </template>
                <template #unCheckedChildren>
                  <CloseOutlined />
                </template>
              </Switch>
            </div>
          </template>
          <span
            class="editor-header__save-status"
            role="button"
            tabindex="0"
            :aria-label="saveStatusText"
          >
            <component
              :is="saveStatusIcon"
              class="save-status__icon"
              :class="{ 'save-status__icon--saved': saveStatusType === 'saved' || saveStatusType === 'on' }"
            />
            <span class="save-status__text">{{ saveStatusText }}</span>
          </span>
        </Popover>
      </div>

      <div class="editor-header__actions">
        <HistoryArea
          :canUndo="historyStore.canUndo"
          :canRedo="historyStore.canRedo"
          @undo="historyStore.undo"
          @redo="historyStore.redo"
        />
        <Button :loading="preparingPreview" @click="handlePreview">
          <EyeOutlined />
          预览
        </Button>
        <Button @click="handleSettings">
          <SettingOutlined />
          作品设置
        </Button>
        <Button :loading="saving" :disabled="!canSave" @click="saveNow">
          <template #icon>
            <SaveOutlined :class="{ 'save-btn-icon--dirty': historyStore.isDirty }" />
          </template>
          保存
        </Button>
        <Button
          type="primary"
          :loading="preparingPublish"
          @click="handlePublish"
        >
          <CloudUploadOutlined />
          发布
        </Button>
      </div>
    </div>

    <!-- 右：紧凑 UserMenu -->
    <UserMenu mode="compact" />

    <!-- 离开确认（仅自动保存关闭 + 有未保存改动时弹出） -->
    <Modal
      :open="leaveModalOpen"
      title="有未保存的修改"
      :closable="false"
      :maskClosable="false"
      @cancel="onLeaveCancel"
    >
      <p>离开后未保存的修改将丢失，是否先保存？</p>
      <template #footer>
        <Button @click="onLeaveCancel">
          取消
        </Button>
        <Button danger @click="onLeaveDiscard">
          不保存离开
        </Button>
        <Button type="primary" :loading="saving" @click="onLeaveSave">
          保存并离开
        </Button>
      </template>
    </Modal>

    <!-- 发布弹窗：弹窗内完成封面预览 + 渠道管理 + 一键发布 -->
    <PublishWork
      v-if="publishOpen"
      :open="publishOpen"
      :coverImg="publishCoverImg"
      @update:open="handlePublishOpenChange"
    />

    <!-- 预览弹窗：展示当前画布截图 + 预览二维码（不写后端，纯展示） -->
    <PreviewWork
      v-if="previewOpen"
      :open="previewOpen"
      :snapshotDataUrl="previewSnapshotDataUrl"
      @update:open="handlePreviewOpenChange"
    />
  </header>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { SaveStatusType } from '@/hooks/useSaveWork.ts'
import {
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  CloudOutlined,
  CloudSyncOutlined,
  CloudUploadOutlined,
  EyeOutlined,
  LoadingOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { tryCatch } from '@my-lego/shared'
import { Button, message, Modal, Popover, Switch, TypographyParagraph } from 'ant-design-vue'
import { computed, ref } from 'vue'
import { useSaveWork } from '@/hooks/useSaveWork.ts'
import AppBrand from '@/layouts/AppBrand.vue'
import UserMenu from '@/layouts/UserMenu.vue'
import { useEditorStore } from '@/stores/editor'
import { useHistoryStore } from '@/stores/history'
import { snapshotElement } from '@/utils/snapshotElement.ts'
import { action as uploadAction, uploadFileRequest } from '@/utils/uploadFileRequest.ts'
import HistoryArea from './HistoryArea.vue'
import PreviewWork from './PreviewWork.vue'
import PublishWork from './PublishWork.vue'

interface UploadResp {
  data: { url: string }
}

const editorStore = useEditorStore()
const historyStore = useHistoryStore()

// 保存编排：自动保存 / 手动保存 / 离开拦截 / 状态指示
const {
  saving,
  canSave,
  autoSaveEnabled,
  saveStatusType,
  saveStatusText,
  saveNow,
  leaveModalOpen,
  onLeaveSave,
  onLeaveDiscard,
  onLeaveCancel,
} = useSaveWork()

// 状态类型 → 图标组件
const SAVE_STATUS_ICON: Record<SaveStatusType, Component> = {
  saving: LoadingOutlined,
  saved: CheckCircleOutlined,
  on: CloudSyncOutlined,
  off: CloudOutlined,
}
const saveStatusIcon = computed(() => SAVE_STATUS_ICON[saveStatusType.value])

const TITLE_PLACEHOLDER = '未命名作品'
const title = computed(() => editorStore.pageData.title || TITLE_PLACEHOLDER)

/**
 * inline 编辑后写回：
 * - 空 / 全空白 / 等于占位符 → 不写入，下次渲染回到占位
 * - 通过 updatePageData 会进入 history，撤销重做能撤销重命名
 */
const handleRenameTitle = (next: string) => {
  const trimmed = next.trim()
  if (!trimmed || trimmed === TITLE_PLACEHOLDER) return
  editorStore.updatePageData('title', trimmed)
}

const handleSettings = () => message.info('作品设置功能开发中')

// ===== 预览流程：截图 → 打开 PreviewWork 弹窗 =====
//   预览只是编辑过程中的临时态，不 save、不上传图床、不改后端数据；
//   预览二维码扫到的仍是上次保存的内容（弹窗内已用文案提示用户）

/** 预览弹窗显隐 */
const previewOpen = ref(false)
/** 预览图 dataURL（不上传图床，仅 <img src> 用） */
const previewSnapshotDataUrl = ref('')
/** 预览按钮 loading（覆盖截图过程） */
const preparingPreview = ref(false)

const handlePreview = async () => {
  if (preparingPreview.value) return

  if (!canSave.value) {
    message.warning('作品尚未加载完成，无法预览')
    return
  }

  preparingPreview.value = true

  try {
    // 清空选中态：避免 EditWrapper 的 .active 边框 / resizer 控制点被截入图
    //   hook 内 onclone 也会兜底清理，这里同步清一次让用户视觉上立即感知"进入预览态"
    editorStore.setCurrentElement(undefined)

    const target = document.getElementById('canvas-area')
    if (!target) {
      message.error('找不到画布节点，无法截图')
      return
    }

    const [snapshot, snapErr] = await tryCatch(snapshotElement(target))
    if (snapErr) {
      message.error(`预览图生成失败：${snapErr.message}`)
      return
    }

    previewSnapshotDataUrl.value = snapshot.dataUrl
    previewOpen.value = true
  }
  finally {
    preparingPreview.value = false
  }
}

const handlePreviewOpenChange = (next: boolean) => {
  previewOpen.value = next
  // 关闭时清理 dataURL，避免长时间常驻内存
  if (!next) previewSnapshotDataUrl.value = ''
}

// ===== 发布流程：silent save (仅 dirty 时) → 截图 → 上传封面 → 打开 PublishWork 弹窗 =====

/** 发布弹窗显隐 */
const publishOpen = ref(false)
/** 弹窗使用的封面 URL（上传图床后拿到） */
const publishCoverImg = ref('')
/** 发布按钮整体 loading（覆盖 save + 截图 + 上传整个准备过程） */
const preparingPublish = ref(false)

const handlePublish = async () => {
  if (preparingPublish.value) return

  // 必须有 work id 才能发布；canSave 为 false 表示无作品（如他人模板空白态）
  if (!canSave.value) {
    message.warning('作品尚未加载完成，无法发布')
    return
  }

  preparingPublish.value = true

  try {
    // Step 1: 仅在有未保存改动时 save，避免无意义的 update 请求
    //   useSaveWork 的 save 内部默认 silentSuccess，失败会自动 toast
    if (historyStore.isDirty) {
      const saved = await saveNow()
      if (!saved) {
        message.error('保存当前作品失败，已暂停发布；请稍后重试')
        return
      }
    }

    // Step 2: 清空选中态，避免 EditWrapper 的 .active 边框 / resizer 控制点被截入图
    //   hook 内 onclone 也会兜底清理，但这里同步清一次让用户视觉上立即看到"进入发布态"
    editorStore.setCurrentElement(undefined)

    // Step 3: 找到画布根节点。EditorView 中只渲染一个 #canvas-area，直接 getElementById
    const target = document.getElementById('canvas-area')
    if (!target) {
      message.error('找不到画布节点，无法截图')
      return
    }

    // Step 4: 截图（hook 内部会等下一帧 + 预加载图片为 dataURL 绕 CORS + 兜底清选中 + 清 box-shadow）
    const [snapshot, snapErr] = await tryCatch(snapshotElement(target))
    if (snapErr) {
      message.error(`封面生成失败：${snapErr.message}`)
      return
    }

    // Step 5: 上传到图床（复用全项目唯一的上传链路）
    const [uploaded, uploadErr] = await tryCatch(
      uploadFileRequest<UploadResp>({
        action: uploadAction,
        name: 'upload',
        file: snapshot.file,
      }),
    )
    if (uploadErr) {
      message.error(`封面上传失败：${uploadErr.message}`)
      return
    }

    publishCoverImg.value = uploaded.data.url
    publishOpen.value = true
  }
  finally {
    preparingPublish.value = false
  }
}

/**
 * 关闭发布弹窗时：
 * - 重置内部状态
 * - 无论"发布成功"还是"用户取消"，都重新拉取作品详情，让 editor store 与服务端同步
 *   （弹窗内的渠道增删改、再次发布的 coverImg / status 变更都已经写入服务端）
 */
const handlePublishOpenChange = (next: boolean) => {
  publishOpen.value = next
  if (next) return
  publishCoverImg.value = ''
  editorStore.reloadCurrentWork()
}
</script>

<style scoped>
.editor-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 24px;
  height: 64px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.editor-header__middle {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
  padding-left: 16px;
  border-left: 1px solid #f0f0f0;
}

/* 左侧组：标题 + 保存状态 */
.editor-header__title-group {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

/* 展示态：贴合文字、超出省略；不要 flex:1，避免短标题时点击区被撑宽 */
.editor-header__title {
  max-width: 320px;
  min-width: 0;
  margin: 0 !important;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

/* 编辑态：textarea 不会随内容横向自增长，给一个舒适的宽度区间 */
.editor-header__title :deep(.ant-typography-edit-content) {
  width: auto;
  min-width: 240px;
  max-width: 320px;
}

/* 保存状态：icon + 小字 */
.editor-header__save-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 12px;
  color: #8c8c8c;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.editor-header__save-status:hover {
  color: #595959;
}

.save-status__icon {
  font-size: 13px;
}

.save-status__icon--saved {
  color: #00b96b;
}

.autosave-pop {
  display: flex;
  align-items: center;
  gap: 12px;
}

.autosave-pop__label {
  font-size: 13px;
  color: #1f2937;
}

/* 有未保存改动时，保存按钮图标变主色蓝以作提示 */
.save-btn-icon--dirty {
  color: #1677ff;
}

.editor-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
