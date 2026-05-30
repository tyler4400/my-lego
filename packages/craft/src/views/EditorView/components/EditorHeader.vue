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
        <Button @click="handlePreview">
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
        <Button type="primary" @click="handlePublish">
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
import { Button, message, Modal, Popover, Switch, TypographyParagraph } from 'ant-design-vue'
import { computed } from 'vue'
import { useSaveWork } from '@/hooks/useSaveWork.ts'
import AppBrand from '@/layouts/AppBrand.vue'
import UserMenu from '@/layouts/UserMenu.vue'
import { useEditorStore } from '@/stores/editor'
import { useHistoryStore } from '@/stores/history'
import HistoryArea from './HistoryArea.vue'

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

const handlePreview = () => message.info('预览功能开发中')
const handleSettings = () => message.info('作品设置功能开发中')
const handlePublish = () => message.info('发布功能开发中')
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
