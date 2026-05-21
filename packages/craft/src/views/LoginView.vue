<template>
  <div class="login-page">
    <!-- ========== 左侧：品牌展示区 ========== -->
    <aside class="brand-aside" :style="loginBgStyle">
      <div class="brand-overlay" />

      <div class="brand-top">
        <span class="brand-tag">海豹乐高 · HAIBAO LEGO</span>
      </div>

      <div class="brand-content">
        <h1 class="brand-title">
          让创意，自由生长
        </h1>
        <div class="brand-quote">
          <span class="quote-mark">"</span>
          <p class="quote-text">
            这是我用过的最好的海报生成工具
          </p>
          <p class="quote-author">
            — 王铁锤，Google 副总裁
          </p>
        </div>
      </div>
    </aside>

    <!-- ========== 右侧：登录区 ========== -->
    <main class="login-main">
      <!-- 顶部 Logo + 站点名 -->
      <header class="login-header">
        <img :src="logo" alt="海豹乐高" class="logo-img">
        <div class="brand-text">
          <h2 class="brand-name">
            海豹乐高
          </h2>
          <span class="brand-slogan">让海报生成更简单</span>
        </div>
      </header>

      <!-- 登录卡片 -->
      <section class="login-card">
        <h2 class="card-title">
          {{ titleText }}
        </h2>
        <p class="card-subtitle">
          {{ subtitleText }}
        </p>

        <!-- 登录模式：Tabs 切换手机号 / 邮箱 -->
        <template v-if="!isRegister">
          <Tabs v-model:activeKey="loginMode" class="login-tabs" :tabBarGutter="32">
            <!-- 手机号登录 -->
            <TabPane key="phone" tab="手机号登录">
              <Form
                ref="phoneFormRef"
                layout="vertical"
                :model="phoneForm"
                :rules="phoneRules"
                class="login-form"
              >
                <FormItem name="phoneNumber">
                  <Input
                    v-model:value="phoneForm.phoneNumber"
                    size="large"
                    placeholder="请输入手机号"
                    :maxlength="11"
                  >
                    <template #prefix>
                      <MobileOutlined class="input-icon" />
                    </template>
                    <template #suffix>
                      <a
                        class="code-btn"
                        :class="{ 'is-disabled': isCodeBtnDisabled }"
                        @click="handleGetCode"
                      >
                        {{ codeBtnText }}
                      </a>
                    </template>
                  </Input>
                </FormItem>

                <FormItem name="verifyCode">
                  <Input
                    v-model:value="phoneForm.verifyCode"
                    size="large"
                    placeholder="请输入 4 位验证码"
                    :maxlength="4"
                  >
                    <template #prefix>
                      <SafetyCertificateOutlined class="input-icon" />
                    </template>
                  </Input>
                </FormItem>

                <p class="form-tip">
                  未注册手机号将自动注册
                </p>

                <Button
                  type="primary"
                  size="large"
                  block
                  class="submit-btn"
                  :loading="phoneLoading"
                  @click="handlePhoneLogin"
                >
                  登录
                </Button>
              </Form>
            </TabPane>

            <!-- 邮箱登录 -->
            <TabPane key="email" tab="邮箱登录">
              <Form
                ref="emailFormRef"
                layout="vertical"
                :model="emailForm"
                :rules="emailRules"
                class="login-form"
              >
                <FormItem name="username">
                  <Input
                    v-model:value="emailForm.username"
                    size="large"
                    placeholder="请输入邮箱"
                    autocomplete="email"
                  >
                    <template #prefix>
                      <MailOutlined class="input-icon" />
                    </template>
                  </Input>
                </FormItem>

                <FormItem name="password">
                  <InputPassword
                    v-model:value="emailForm.password"
                    size="large"
                    placeholder="请输入密码（至少 8 位）"
                    autocomplete="current-password"
                  >
                    <template #prefix>
                      <LockOutlined class="input-icon" />
                    </template>
                  </InputPassword>
                </FormItem>

                <Button
                  type="primary"
                  size="large"
                  block
                  class="submit-btn"
                  :loading="emailLoading"
                  @click="handleEmailLogin"
                >
                  登录
                </Button>

                <div class="switch-link">
                  还没账号？
                  <a tabindex="0" @click="handleSwitchToRegister">立即注册</a>
                </div>
              </Form>
            </TabPane>
          </Tabs>
        </template>

        <!-- 注册模式（仅邮箱） -->
        <template v-else>
          <Form
            ref="registerFormRef"
            layout="vertical"
            :model="registerForm"
            :rules="registerRules"
            class="login-form register-form"
          >
            <FormItem name="username">
              <Input
                v-model:value="registerForm.username"
                size="large"
                placeholder="请输入邮箱"
                autocomplete="email"
              >
                <template #prefix>
                  <MailOutlined class="input-icon" />
                </template>
              </Input>
            </FormItem>

            <FormItem name="password">
              <InputPassword
                v-model:value="registerForm.password"
                size="large"
                placeholder="设置密码（至少 8 位）"
                autocomplete="new-password"
              >
                <template #prefix>
                  <LockOutlined class="input-icon" />
                </template>
              </InputPassword>
            </FormItem>

            <Button
              type="primary"
              size="large"
              block
              class="submit-btn"
              :loading="registerLoading"
              @click="handleRegister"
            >
              注册
            </Button>

            <div class="switch-link">
              已有账号？
              <a tabindex="0" @click="handleSwitchToLogin">立即登录</a>
            </div>
          </Form>
        </template>

        <!-- 第三方登录 -->
        <Divider class="other-divider">
          <span class="other-divider-text">其他登录方式</span>
        </Divider>

        <div class="third-party">
          <Tooltip title="使用 GitHub 账号登录">
            <button
              type="button"
              class="github-btn"
              aria-label="使用 GitHub 账号登录"
              @click="handleGithubLogin"
            >
              <GithubOutlined />
            </button>
          </Tooltip>
        </div>
      </section>

      <!-- 底部协议 -->
      <footer class="login-footer">
        登录即代表您已阅读并同意
        <a tabindex="0">《用户协议》</a>
        和
        <a tabindex="0">《隐私政策》</a>
      </footer>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { FormInstance, Rule } from 'ant-design-vue/es/form'
import {
  GithubOutlined,
  LockOutlined,
  MailOutlined,
  MobileOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'
import {
  Button,
  Divider,
  Form,
  FormItem,
  Input,
  InputPassword,
  message,
  TabPane,
  Tabs,
  Tooltip,
} from 'ant-design-vue'
import { computed, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import loginBg from '@/assets/login-vertical.png'
import logo from '@/assets/logo-chrome-512x512.png'
import { useService } from '@/hooks/useService'
import { useSessionStore } from '@/stores/session'

const loginBgStyle = { backgroundImage: `url(${loginBg})` }

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

// ============================================================
// 公共：模式状态 / 文案 / 跳转
// 这些是跨业务模块共享的"页面级"状态，不属于任何单一登录方式
// ============================================================
type LoginMode = 'phone' | 'email'
const loginMode = ref<LoginMode>('phone')
const isRegister = ref(false)

const titleText = computed(() => (isRegister.value ? '创建账号' : '欢迎回来'))

const subtitleText = computed(() => {
  if (isRegister.value) return '注册一个新的海豹乐高账号，注册成功后将自动登录'
  if (loginMode.value === 'email') return '使用邮箱登录海豹乐高'
  return '使用手机号码登录海豹乐高'
})

const redirectAfterLogin = () => {
  // vue-router 已自动 decode query；优先回跳 redirect，没有则回首页
  const redirect = (route.query.redirect as string | undefined) || '/'
  router.replace(redirect)
}

const handleSwitchToRegister = () => {
  isRegister.value = true
}

const handleSwitchToLogin = () => {
  isRegister.value = false
}

// ============================================================
// 业务模块 1：手机号登录（含发送验证码 + 倒计时）
// 三块逻辑共享同一份 phoneForm，未来抽 useLoginByPhone() composable 时应一并搬走，
// 因此按业务垂直组织在同一模块下：formRef / form / rules / 子逻辑 / handler 自上而下
// ============================================================
const phoneFormRef = ref<FormInstance>()
const phoneForm = reactive({
  phoneNumber: '',
  verifyCode: '',
})
const phoneRules: Record<string, Rule[]> = {
  phoneNumber: [
    { required: true, message: '请输入手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
  ],
  verifyCode: [
    { required: true, message: '请输入验证码' },
    { pattern: /^\d{4}$/, message: '验证码为 4 位数字' },
  ],
}

// ---------- 1a. 验证码倒计时（被发送验证码子模块依赖） ----------
const COUNTDOWN_SECONDS = 60 // 开发阶段为 6 秒，上线前改为 60
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  countdown.value = COUNTDOWN_SECONDS
  countdownTimer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0 && countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
  }, 1000)
}

// 组件卸载时清理定时器，避免内存泄漏
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

// ---------- 1b. 发送短信验证码 ----------
const [codeLoading, , , doSendCode] = useService(sessionStore.sendVerifyCode)

const isCodeBtnDisabled = computed(() => countdown.value > 0 || codeLoading.value)

const codeBtnText = computed(() => {
  if (codeLoading.value) return '发送中...'
  if (countdown.value > 0) return `${countdown.value}s 后重发`
  return '获取验证码'
})

/**
 * 获取短信验证码
 * - 先校验手机号字段（仅这一个字段）
 * - 发送成功后启动倒计时
 * - 开发态后端会返回 verifyCode，临时用 message.info 展示便于联调
 */
const handleGetCode = async () => {
  if (isCodeBtnDisabled.value) return
  try {
    await phoneFormRef.value?.validate(['phoneNumber'])
  }
  catch {
    return
  }

  const [data, err] = await doSendCode({ phoneNumber: phoneForm.phoneNumber })
  if (err) return

  startCountdown()
  if (data?.verifyCode) {
    // 开发态临时方案：把后端返回的验证码直接 toast 出来便于调试
    message.info(`开发验证码：${data.verifyCode}`)
  }
}

// ---------- 1c. 手机号 + 验证码 登录 ----------
// 按钮自身已经有 loading 反馈，关闭全局进度条避免重复指示
const [phoneLoading, , , doPhoneLogin] = useService(sessionStore.loginByCellphone)

const handlePhoneLogin = async () => {
  try {
    await phoneFormRef.value?.validate()
  }
  catch {
    return
  }

  const [, err] = await doPhoneLogin(phoneForm)
  if (err) return

  redirectAfterLogin()
}

// ============================================================
// 业务模块 2：邮箱登录
// ============================================================
const emailFormRef = ref<FormInstance>()
const emailForm = reactive({
  username: '',
  password: '',
})
const emailRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' },
  ],
  password: [
    { required: true, message: '请输入密码' },
    { min: 8, message: '密码长度不能少于 8 位' },
  ],
}

const [emailLoading, , , doEmailLogin] = useService(sessionStore.loginByEmail)

const handleEmailLogin = async () => {
  try {
    await emailFormRef.value?.validate()
  }
  catch {
    return
  }

  const [, err] = await doEmailLogin(emailForm)
  if (err) return

  redirectAfterLogin()
}

// ============================================================
// 业务模块 3：邮箱注册（注册成功后自动登录）
// ============================================================
const registerFormRef = ref<FormInstance>()
const registerForm = reactive({
  username: '',
  password: '',
})
// 注册规则与登录规则一致，独立定义便于未来按需扩展（如确认密码、用户协议勾选等）
const registerRules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' },
  ],
  password: [
    { required: true, message: '请设置密码' },
    { min: 8, message: '密码长度不能少于 8 位' },
  ],
}

// 「注册 → 自动登录」是组合动作，registerLoading 在两步全程都应为 true，
// 通过 computed 合并两个 useService 的 loading 状态实现
const [registering, , , doRegister] = useService(sessionStore.registerByEmail)
const [autoLoggingIn, , , doAutoLogin] = useService(sessionStore.loginByEmail)
const registerLoading = computed(() => registering.value || autoLoggingIn.value)

/**
 * 邮箱注册
 * - 注册成功后用同一份凭据自动登录（store 不再耦合此组合逻辑，由组件层组合两个 action）
 */
const handleRegister = async () => {
  try {
    await registerFormRef.value?.validate()
  }
  catch {
    return
  }

  const [, registerErr] = await doRegister(registerForm)
  if (registerErr) return

  const [, loginErr] = await doAutoLogin(registerForm)
  if (loginErr) return

  redirectAfterLogin()
}

// ============================================================
// 业务模块 4：第三方登录（GitHub）
// ============================================================
const handleGithubLogin = () => {
  // TODO: GitHub 第三方登录
}
</script>

<style scoped>
/* ===================================================
 * 整体布局：左右两栏，全屏高度
 * =================================================== */
.login-page {
  display: flex;
  width: 100%;
  min-height: 100vh;
  background: #f7f8fa;
}

/* ===================================================
 * 左侧：品牌展示区
 * =================================================== */
.brand-aside {
  position: relative;
  flex: 1 1 60%;
  min-height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-color: #0a1024;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 56px 64px;
}

/* 暗色蒙层：底部更深，便于压住文案；顶部保留通透 */
.brand-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(10, 16, 36, 0.25) 0%, rgba(10, 16, 36, 0.55) 60%, rgba(10, 16, 36, 0.85) 100%);
  pointer-events: none;
}

.brand-top,
.brand-content {
  position: relative;
  z-index: 1;
}

.brand-tag {
  display: inline-block;
  padding: 6px 14px;
  font-size: 13px;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.04);
}

.brand-content {
  max-width: 520px;
}

.brand-title {
  margin: 0 0 32px;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.25;
  color: #fff;
  letter-spacing: 2px;
}

.brand-quote {
  position: relative;
  padding-left: 8px;
}

.quote-mark {
  display: block;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 56px;
  line-height: 1;
  color: #f5a623;
  margin-bottom: 8px;
}

.quote-text {
  margin: 0 0 12px;
  font-size: 20px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.92);
}

.quote-author {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

/* ===================================================
 * 右侧：登录区
 * =================================================== */
.login-main {
  position: relative;
  flex: 1 1 40%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px 24px;
  background: #fff;
}

/* 顶部 Logo + 站点名：宽度与下方表单保持一致，logo 与文字整体放大撑满 */
.login-header {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 32px;
}

.logo-img {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  object-fit: cover;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.brand-name {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  letter-spacing: 2px;
}

.brand-slogan {
  margin-top: 4px;
  font-size: 14px;
  color: #94a3b8;
}

/* 登录卡片：垂直居中，固定宽度 */
.login-card {
  flex: 1;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 32px 0;
}

.card-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  color: #111827;
}

.card-subtitle {
  margin: 0 0 24px;
  font-size: 14px;
  color: #6b7280;
}

/* ----------- Tabs ----------- */
.login-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 24px;
}

.login-tabs :deep(.ant-tabs-nav::before) {
  border-bottom-color: #f1f5f9;
}

.login-tabs :deep(.ant-tabs-tab) {
  font-size: 15px;
  padding: 12px 0;
}

.login-tabs :deep(.ant-tabs-tab + .ant-tabs-tab) {
  margin-left: 32px;
}

/* ----------- Form ----------- */
.login-form :deep(.ant-form-item) {
  margin-bottom: 16px;
}

.login-form :deep(.ant-input-affix-wrapper) {
  padding: 8px 12px;
  border-radius: 8px;
}

.login-form :deep(.ant-input-affix-wrapper-lg) {
  padding: 10px 14px;
}

.login-form :deep(.ant-input) {
  font-size: 15px;
}

.input-icon {
  color: #9ca3af;
  font-size: 16px;
}

/* 验证码按钮（嵌入 Input 后缀） */
.code-btn {
  display: inline-block;
  padding-left: 12px;
  font-size: 13px;
  color: #4f46e5;
  white-space: nowrap;
  border-left: 1px solid #e5e7eb;
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.code-btn:hover {
  color: #6366f1;
}

.code-btn.is-disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

/* tip 文字 */
.form-tip {
  margin: -4px 0 16px;
  font-size: 12px;
  color: #9ca3af;
}

/* 主提交按钮 */
.submit-btn {
  height: 44px;
  font-size: 15px;
  font-weight: 500;
  border-radius: 8px;
  margin-top: 4px;
}

/* 切换链接（注册 / 登录） */
.switch-link {
  margin-top: 16px;
  font-size: 13px;
  color: #6b7280;
  text-align: center;
}

.switch-link a {
  color: #4f46e5;
  font-weight: 500;
  cursor: pointer;
}

.switch-link a:hover {
  color: #6366f1;
}

/* 注册表单：补足顶部间距，使其视觉与 Tabs 切换后高度接近 */
.register-form {
  padding-top: 8px;
}

/* ----------- 第三方登录 ----------- */
.other-divider {
  margin: 32px 0 20px;
}

.other-divider :deep(.ant-divider-inner-text) {
  padding: 0 16px;
}

.other-divider-text {
  font-size: 12px;
  color: #9ca3af;
}

.third-party {
  display: flex;
  justify-content: center;
}

.github-btn {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #1f2937;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.github-btn:hover {
  color: #fff;
  background: #111827;
  border-color: #111827;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(17, 24, 39, 0.18);
}

.github-btn:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
}

/* ----------- 底部协议 ----------- */
.login-footer {
  width: 100%;
  max-width: 420px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  padding: 16px 0;
}

.login-footer a {
  color: #6b7280;
  cursor: pointer;
}

.login-footer a:hover {
  color: #4f46e5;
}

/* ===================================================
 * 响应式：窄屏隐藏左侧，仅展示登录区
 * =================================================== */
@media (max-width: 992px) {
  .brand-aside {
    display: none;
  }

  .login-main {
    padding: 32px 20px 20px;
  }
}
</style>
