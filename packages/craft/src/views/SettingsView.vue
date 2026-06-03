<template>
  <div class="settings-view">
    <div class="settings-view__container">
      <!-- 顶部：标题区 -->
      <header class="settings-view__header">
        <h1 class="settings-view__title">
          个人设置
        </h1>
        <p class="settings-view__subtitle">
          更新你的头像、昵称等基础信息
        </p>
      </header>

      <!-- 主卡片：左头像 + 右表单 -->
      <div class="settings-view__card">
        <div class="settings-view__body">
          <!-- 左：头像 + username + role -->
          <aside class="settings-view__aside">
            <div
              class="settings-view__avatar-wrap"
              role="button"
              tabindex="0"
              aria-label="更换头像"
              @click="handleAvatarClick"
              @keydown.enter="handleAvatarClick"
              @keydown.space.prevent="handleAvatarClick"
            >
              <Avatar :src="previewPicture" :size="128">
                <template #icon>
                  <UserOutlined />
                </template>
              </Avatar>
              <div class="settings-view__avatar-mask">
                <CameraOutlined class="settings-view__avatar-mask-icon" />
                <span>更换头像</span>
              </div>
            </div>

            <div class="settings-view__username" :title="userInfo.username">
              {{ userInfo.username || '未设置用户名' }}
            </div>
            <Tag :color="roleInfo.color" class="settings-view__role-tag">
              {{ roleInfo.text }}
            </Tag>

            <p class="settings-view__avatar-tip">
              支持 JPG / PNG，单张不超过 10MB
            </p>
          </aside>

          <!-- 右：表单 -->
          <section class="settings-view__main">
            <Form
              ref="formRef"
              :model="formState"
              :rules="formRules"
              :labelCol="{ flex: '96px' }"
              :wrapperCol="{ flex: 'auto' }"
              labelAlign="right"
              class="settings-view__form"
            >
              <FormItem label="昵称" name="nickName">
                <Input
                  v-model:value="formState.nickName"
                  :maxlength="20"
                  placeholder="2~20 字符"
                  showCount
                  allowClear
                />
              </FormItem>

              <FormItem label="邮箱">
                <span class="settings-view__readonly">
                  {{ userInfo.email || '未绑定' }}
                </span>
              </FormItem>

              <FormItem label="手机号">
                <span class="settings-view__readonly">
                  {{ userInfo.phoneNumber || '未绑定' }}
                </span>
              </FormItem>

              <FormItem label="注册方式">
                <span class="settings-view__readonly">
                  {{ registerTypeText }}
                </span>
              </FormItem>

              <FormItem label="注册时间">
                <span class="settings-view__readonly">
                  {{ formatDate(userInfo.createdAt) }}
                </span>
              </FormItem>

              <FormItem label="账号密码">
                <Button @click="handleChangePassword">
                  <template #icon>
                    <KeyOutlined />
                  </template>
                  修改密码
                </Button>
              </FormItem>
            </Form>

            <footer class="settings-view__footer">
              <Button :disabled="!hasChanges || saving" @click="handleReset">
                取消
              </Button>
              <Button
                type="primary"
                :loading="saving"
                :disabled="!hasChanges"
                @click="handleSave"
              >
                <template #icon>
                  <SaveOutlined />
                </template>
                保存
              </Button>
            </footer>
          </section>
        </div>
      </div>
    </div>

    <!-- 头像裁剪 Modal -->
    <Modal
      v-model:open="cropOpen"
      title="裁剪头像"
      :width="640"
      forceRender
      :maskClosable="!cropUploading"
      :closable="!cropUploading"
      :confirmLoading="cropUploading"
      :okButtonProps="{ disabled: !cropReady }"
      :cancelButtonProps="{ disabled: cropUploading }"
      :afterClose="handleAfterCropClose"
      @ok="handleConfirmCrop"
      @cancel="handleCancelCrop"
    >
      <div class="settings-view__cropper-tip">
        已锁定为 1:1，拖动选区调整位置
      </div>
      <div ref="cropperContainerRef" class="settings-view__cropper" />
    </Modal>

    <!-- 隐藏的文件选择（点击头像时触发） -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png"
      hidden
      @change="handleFileChange"
    >
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import type { UpdateUserReq } from '@/api/modules/user'
import type { UploadResponse } from '@/types/upload.ts'
import {
  CameraOutlined,
  KeyOutlined,
  SaveOutlined,
  UserOutlined,
} from '@ant-design/icons-vue'
import { tryCatch } from '@my-lego/shared'
import {
  Avatar,
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Tag,
} from 'ant-design-vue'
import { computed, nextTick, reactive, ref, useTemplateRef, watch } from 'vue'
import { updateUser } from '@/api/modules/user'
import { commonUploadCheck } from '@/components/StyleUploader/helper.ts'
import useCropper from '@/hooks/useCropper.ts'
import { useService } from '@/hooks/useService.ts'
import { useSessionStore } from '@/stores/session'
import { action as uploadAction, uploadFileRequest } from '@/utils/uploadFileRequest.ts'
import { waitForNextFrame } from '@/utils/utils.ts'

const sessionStore = useSessionStore()
const userInfo = computed(() => sessionStore.userInfo)

// ============================================================
// 展示映射：role / type / provider → 中文文案
// 集中放在 setup 顶部，便于复用 & 后续替换为 i18n
// ============================================================
type RoleKey = 'admin' | 'normal'
const ROLE_MAP: Record<RoleKey, { text: string, color: string }> = {
  admin: { text: '管理员', color: 'gold' },
  normal: { text: '普通用户', color: 'default' },
}

type RegisterTypeKey = 'email' | 'cellphone' | 'oauth'
const TYPE_MAP: Record<RegisterTypeKey, string> = {
  email: '邮箱注册',
  cellphone: '手机号注册',
  oauth: '第三方登录',
}

type ProviderKey = 'github' | 'gitee'
const PROVIDER_MAP: Record<ProviderKey, string> = {
  github: 'GitHub',
  gitee: 'Gitee',
}

const roleInfo = computed(() => {
  const role = (userInfo.value.role ?? 'normal') as RoleKey
  return ROLE_MAP[role] ?? ROLE_MAP.normal
})

const registerTypeText = computed(() => {
  const type = userInfo.value.type as RegisterTypeKey | undefined
  const base = type && TYPE_MAP[type] ? TYPE_MAP[type] : '未知'
  const provider = userInfo.value.provider as ProviderKey | undefined
  if (type === 'oauth' && provider && PROVIDER_MAP[provider]) {
    return `${base}（${PROVIDER_MAP[provider]}）`
  }
  return base
})

/**
 * createdAt 是后端 ISO 字符串；toLocaleString 在浏览器环境足够直观，无需 dayjs
 * - 无值或非法日期统一回落 '-'，避免页面出现 Invalid Date
 */
const formatDate = (input?: string) => {
  if (!input) return '-'
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour12: false })}`
}

// ============================================================
// 表单状态：本地 ref，提交成功后由 store 单向同步
// - nickName / picture 双向绑定
// - pendingPicture 用于"暂存"已上传到图床但未提交保存的新头像
// ============================================================
const formRef = useTemplateRef<FormInstance>('formRef')

interface FormState {
  nickName: string
}
const formState = reactive<FormState>({
  nickName: '',
})

/**
 * 待提交的新头像 url（已上传到图床但未点保存）
 * - 空字符串表示未变更
 * - 取消 / 保存成功后置空
 */
const pendingPicture = ref('')

/**
 * 头像展示优先用 pendingPicture（用户刚换的预览）→ 否则用 store 中的 picture
 */
const previewPicture = computed(() => pendingPicture.value || userInfo.value.picture || '')

/**
 * 用 store.userInfo 初始化 / 同步表单
 * - 进入页面、fetchMe 刷新、保存成功后都会触发
 * - 仅在 pendingPicture 为空时才"被动同步"，避免覆盖用户正在编辑的临时状态
 */
watch(
  () => userInfo.value,
  (next) => {
    formState.nickName = next.nickName ?? ''
  },
  { immediate: true, deep: true },
)

const formRules: Record<string, Rule[]> = {
  nickName: [
    { required: true, message: '请输入昵称', trigger: 'change' },
    { min: 2, max: 20, message: '昵称长度需在 2~20 个字符之间', trigger: 'change' },
  ],
}

/**
 * 是否存在未保存的改动：用于启用/禁用 "取消" "保存" 按钮
 * - nickName 与 store 不一致 → 有改动
 * - pendingPicture 非空 → 有改动
 */
const hasChanges = computed(() => {
  if (pendingPicture.value) return true
  if ((formState.nickName ?? '') !== (userInfo.value.nickName ?? '')) return true
  return false
})

// ============================================================
// 头像上传：选文件 → 裁剪 Modal → 上传图床 → 暂存到 pendingPicture
// ============================================================
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const cropperContainerRef = useTemplateRef<HTMLDivElement>('cropperContainerRef')

const cropOpen = ref(false)
const cropReady = ref(false)
const cropUploading = ref(false)

/**
 * 待裁剪的本地图片源（ObjectURL）
 * - 关闭弹窗 / 取消时必须 revoke，避免内存泄漏
 */
const localOriginUrl = ref('')

const { destroyCropper, initCropper, getCroppedBlob } = useCropper(cropperContainerRef, {
  maxCanvasHeight: 480,
  fallbackMaxCanvasWidth: 560,
})

const handleAvatarClick = () => {
  fileInputRef.value?.click()
}

const releaseLocalUrl = () => {
  if (localOriginUrl.value) {
    URL.revokeObjectURL(localOriginUrl.value)
    localOriginUrl.value = ''
  }
}

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  // 重置 input 让同一个文件再次选择也能触发 change
  input.value = ''
  if (!file) return

  if (!commonUploadCheck(file)) return

  releaseLocalUrl()
  localOriginUrl.value = URL.createObjectURL(file)
  cropReady.value = false
  cropOpen.value = true

  // 等 Modal 真正进 DOM 并完成一次布局
  await nextTick()
  await waitForNextFrame()

  const [cropper, err] = await tryCatch(initCropper(localOriginUrl.value))
  if (err) {
    message.error(`图片加载失败：${err.message}`)
    cropOpen.value = false
    return
  }

  // 锁定 1:1 比例，避免裁出非正方形头像
  // cropper.js v2 的 selection 是 web component，aspect-ratio 通过 DOM 属性设置
  const selection = cropper?.getCropperSelection() as unknown as { aspectRatio?: number, initialAspectRatio?: number } | null
  if (selection) {
    selection.aspectRatio = 1
    selection.initialAspectRatio = 1
  }
  cropReady.value = true
}

const handleConfirmCrop = async () => {
  if (!cropReady.value || cropUploading.value) return

  cropUploading.value = true

  // 1) 拿到裁剪后的 blob（webp 体积小、画质足够；后端要求文件名 .png/.jpg）
  const [blob, blobErr] = await tryCatch(getCroppedBlob({
    mimeType: 'image/webp',
    quality: 1,
  }))
  if (blobErr || !blob) {
    message.error(blobErr?.message ?? '裁剪失败')
    cropUploading.value = false
    return
  }

  // 后端图床限制：filename 必须是 .png 或 .jpg；这里统一用 .png（mimeType 仍是 webp，靠的是路径后缀）
  const croppedFile = new File([blob], 'avatar.png', {
    type: blob.type,
    lastModified: Date.now(),
  })

  // 2) 上传到全项目唯一的图床
  const [resp, uploadErr] = await tryCatch(uploadFileRequest<UploadResponse>({
    action: uploadAction,
    name: 'upload',
    file: croppedFile,
  }))
  cropUploading.value = false

  if (uploadErr) {
    message.error(`头像上传失败：${uploadErr.message}`)
    return
  }

  // 3) 暂存到 pendingPicture（等"保存"按钮才落到服务端的 user.picture）
  pendingPicture.value = resp.data.url
  message.success('头像已更新，记得点击保存')
  cropOpen.value = false
}

const handleCancelCrop = () => {
  if (cropUploading.value) return
  cropOpen.value = false
}

/**
 * Modal 关闭后再 destroy cropper + revoke ObjectURL
 * - 用 afterClose 而不是 cancel/ok，因为 ok 路径也需要清理
 */
const handleAfterCropClose = () => {
  destroyCropper()
  releaseLocalUrl()
  cropReady.value = false
}

// ============================================================
// 保存 / 取消
// ============================================================
const [doUpdateUser, saving] = useService(updateUser, {
  config: { silentSuccess: true },
})

/**
 * 仅提交"和原值不同"的字段：避免无意义 update + 减小 body 体积
 */
const buildUpdatePayload = (): UpdateUserReq => {
  const payload: UpdateUserReq = {}
  const nextNick = formState.nickName.trim()
  if (nextNick !== (userInfo.value.nickName ?? '')) {
    payload.nickName = nextNick
  }
  if (pendingPicture.value && pendingPicture.value !== userInfo.value.picture) {
    payload.picture = pendingPicture.value
  }
  return payload
}

const handleSave = async () => {
  if (!hasChanges.value || saving.value) return

  // 校验表单（仅 nickName 有规则）；formRef 在 setup 之后才挂载，这里兜底
  const formInstance = formRef.value
  if (!formInstance) return
  const [, validateErr] = await tryCatch(formInstance.validate())
  if (validateErr) return

  const payload = buildUpdatePayload()
  if (Object.keys(payload).length === 0) {
    message.info('没有需要保存的改动')
    return
  }

  const [data, err] = await doUpdateUser(payload)
  if (err || !data) return

  // 写回 store；watch(userInfo) 会同步 formState.nickName
  sessionStore.setUserInfo(data)
  pendingPicture.value = ''
  message.success('保存成功')
}

const handleReset = () => {
  if (saving.value) return
  formState.nickName = userInfo.value.nickName ?? ''
  pendingPicture.value = ''
  // 也清空 form item 的校验态
  formRef.value?.clearValidate()
}

// ============================================================
// 修改密码：占位入口（本期未实现）
// ============================================================
const handleChangePassword = () => {
  message.info('修改密码功能建设中，敬请期待')
}
</script>

<style scoped>
.settings-view {
  flex: 1;
  background: #f5f7fa;
  padding: 32px 24px 64px;
  min-height: 0;
}

.settings-view__container {
  max-width: 880px;
  margin: 0 auto;
}

/* ===== 顶部标题 ===== */
.settings-view__header {
  margin-bottom: 20px;
}

.settings-view__title {
  margin: 0 0 6px;
  font-size: 22px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.4;
}

.settings-view__subtitle {
  margin: 0;
  font-size: 13px;
  color: #6b7280;
}

/* ===== 卡片 ===== */
.settings-view__card {
  padding: 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04),
              0 4px 16px rgba(15, 23, 42, 0.06);
}

.settings-view__body {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 40px;
  min-height: 360px;
}

/* ===== 左侧：头像 + 身份 ===== */
.settings-view__aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.settings-view__avatar-wrap {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 50%;
  cursor: pointer;
  outline: none;
  overflow: hidden;
  transition: box-shadow 0.2s;
}

.settings-view__avatar-wrap:hover,
.settings-view__avatar-wrap:focus-visible {
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.18);
}

/* 让 antd Avatar 内的图片完全填满圆形容器 */
.settings-view__avatar-wrap :deep(.ant-avatar) {
  width: 100% !important;
  height: 100% !important;
}

.settings-view__avatar-wrap :deep(.ant-avatar img) {
  object-fit: cover;
}

.settings-view__avatar-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.settings-view__avatar-wrap:hover .settings-view__avatar-mask,
.settings-view__avatar-wrap:focus-visible .settings-view__avatar-mask {
  opacity: 1;
}

.settings-view__avatar-mask-icon {
  font-size: 20px;
}

.settings-view__username {
  margin-top: 4px;
  max-width: 200px;
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-view__role-tag {
  margin: 0;
}

.settings-view__avatar-tip {
  margin: 12px 0 0;
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  line-height: 1.6;
}

/* ===== 右侧：表单 ===== */
.settings-view__main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.settings-view__form {
  flex: 1;
}

/* 收紧每个 form item 的纵向间距，让整个表单更紧凑 */
.settings-view__form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.settings-view__readonly {
  color: #1f2937;
  font-size: 14px;
}

.settings-view__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

/* ===== 裁剪 Modal 内部 ===== */
.settings-view__cropper-tip {
  margin-bottom: 12px;
  font-size: 12px;
  color: #6b7280;
}

.settings-view__cropper {
  width: 100%;
  border: 1px solid rgba(25, 65, 197, 0.65);
}

.settings-view__cropper :deep(cropper-canvas) {
  width: 100%;
  height: var(--cropper-canvas-height, 360px);
}

/* ===== 响应式：窄屏栈式布局 ===== */
@media (max-width: 720px) {
  .settings-view__card {
    padding: 20px;
  }

  .settings-view__body {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
