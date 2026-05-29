<template>
  <header class="editor-header">
    <!-- 左：紧凑 brand -->
    <AppBrand compact />

    <!-- 中：title 左 / actions 右，space-between -->
    <div class="editor-header__middle">
      <TypographyParagraph
        class="editor-header__title"
        :editable="{ triggerType: ['text'], tooltip: false, maxlength: 50 }"
        :content="title"
        ellipsis
        @update:content="handleRenameTitle"
      />

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
        <Button :loading="saving" :disabled="!canSave" @click="handleSave">
          <SaveOutlined />
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
  </header>
</template>

<script setup lang="ts">
import {
  CloudUploadOutlined,
  EyeOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue'
import { Button, message, TypographyParagraph } from 'ant-design-vue'
import { computed } from 'vue'
import { updateWork } from '@/api/modules/work'
import { useService } from '@/hooks/useService'
import AppBrand from '@/layouts/AppBrand.vue'
import UserMenu from '@/layouts/UserMenu.vue'
import { useEditorStore } from '@/stores/editor'
import { useHistoryStore } from '@/stores/history'
import HistoryArea from './HistoryArea.vue'

const editorStore = useEditorStore()
const historyStore = useHistoryStore()

// 保存：按钮自带 loading，保存中 / 无作品（如他人模版空白态）时禁用
const [doSave, saving] = useService(updateWork)
const canSave = computed(() => Boolean(editorStore.pageData.id))

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

/**
 * 保存当前作品
 * - toUpdateBody 无 id（无作品/他人模版）时拦截，提示但不发请求
 * - 失败由全局拦截器 toast，这里只处理成功反馈
 */
const handleSave = async () => {
  const body = editorStore.toUpdateBody()
  if (!body) {
    message.warning('当前没有可保存的作品')
    return
  }
  await doSave(body)
}

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

/* TypographyParagraph 自带 .ant-typography 的 margin-bottom 和块级布局，要重置才能在 flex 中横向排版 */
.editor-header__title {
  flex: 1;
  min-width: 0;
  max-width: 320px;
  margin: 0 !important;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.editor-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
