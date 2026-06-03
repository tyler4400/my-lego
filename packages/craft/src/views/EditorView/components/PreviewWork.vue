<template>
  <Modal
    :open="open"
    :width="820"
    title="作品预览"
    :maskClosable="true"
    centered
    :footer="null"
    @update:open="(v: boolean) => emit('update:open', v)"
  >
    <!-- 醒目警示：预览只是编辑过程中的临时态，扫码内容仍来自上次保存 -->
    <Alert
      class="preview-work__alert"
      type="warning"
      banner
      showIcon
      message="仅供预览，请发布作品后再正式使用"
    />

    <div class="preview-work">
      <!-- 左：截图（按原尺寸展示，纵向超出滚动） -->
      <div class="preview-work__shot">
        <div class="preview-work__shot-scroll">
          <img
            v-if="snapshotDataUrl"
            class="preview-work__shot-img"
            :src="snapshotDataUrl"
            alt="作品预览截图"
          >
          <div v-else class="preview-work__shot-empty">
            截图尚未生成
          </div>
        </div>
      </div>

      <!-- 右：预览二维码 + 文案 -->
      <aside class="preview-work__qrcode">
        <div class="preview-work__qrcode-label">
          手机扫码预览
        </div>
        <QRCode v-if="previewUrl" :value="previewUrl" :size="180" alt="预览二维码" />
        <div v-else class="preview-work__qrcode-placeholder">
          作品信息缺失，无法生成二维码
        </div>
        <div class="preview-work__qrcode-hint">
          若有未保存改动，扫码看到的可能与当前编辑不一致；
          请先保存后再扫码确认。
        </div>
      </aside>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Alert, Modal } from 'ant-design-vue'
import { computed } from 'vue'
import QRCode from '@/components/QRCode'
import { useEditorStore } from '@/stores/editor.ts'
import { buildH5Url } from '@/utils/h5Url.ts'

interface Props {
  /** 弹窗显隐 */
  open: boolean
  /** 当前画布的截图 dataURL（父组件在打开弹窗前由 html2canvas 生成；不上传图床） */
  snapshotDataUrl: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:open', open: boolean): void
}>()

const editorStore = useEditorStore()

// 预览二维码统一带 preview=true：允许扫到非 Published 状态（详见 BizDocs/07 §3.3）
const previewUrl = computed(() => {
  const id = editorStore.pageData.id
  const uuid = editorStore.pageData.uuid
  if (!id || !uuid) return ''
  return buildH5Url(id, uuid, { preview: true })
})
</script>

<style scoped>
.preview-work__alert {
  margin-bottom: 16px;
}

.preview-work {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 20px;
  min-height: 360px;
}

/* ===== 左：截图 ===== */
.preview-work__shot {
  display: flex;
  justify-content: center;
  background: #fafafa;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}

.preview-work__shot-scroll {
  width: 100%;
  max-height: 65vh;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.preview-work__shot-img {
  /* 按原始像素显示（dataURL 内部已是 CSS 像素 × DPR），保留 1:1 清晰度 */
  display: block;
  max-width: 100%;
  height: auto;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
}

.preview-work__shot-empty {
  color: #bfbfbf;
  font-size: 13px;
  padding: 40px 0;
}

/* ===== 右：二维码 ===== */
.preview-work__qrcode {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.preview-work__qrcode-label {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.preview-work__qrcode-placeholder {
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bfbfbf;
  font-size: 12px;
  text-align: center;
  background: #fff;
  border: 1px dashed #e5e7eb;
  border-radius: 4px;
}

.preview-work__qrcode-hint {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
  text-align: center;
}
</style>
