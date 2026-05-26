<template>
  <div class="not-found-page">
    <!-- 装饰光晕：呼应 404 插画的紫色调，做柔和氛围，绝对定位不参与布局 -->
    <div class="glow glow-top" aria-hidden="true" />
    <div class="glow glow-bottom" aria-hidden="true" />

    <section class="not-found-card">
      <!-- 插画容器：图片 + 椭圆投影组合，整体上下浮动 -->
      <div class="illustration">
        <img
          :src="notFoundImage"
          alt="404 页面未找到"
          class="illustration-img"
          loading="eager"
          draggable="false"
        >
        <div class="illustration-shadow" aria-hidden="true" />
      </div>

      <h1 class="title">
        哎呀，页面迷路了
      </h1>
      <p class="subtitle">
        抱歉，您访问的页面不存在或已被移除。
      </p>

      <div class="actions">
        <!-- 主按钮：紫色 primary，与全站主色一致 -->
        <Button type="primary" size="large" class="action-btn" @click="handleGoHome">
          回到首页
        </Button>
        <!-- 次按钮：默认样式，仅作辅助选择 -->
        <Button size="large" class="action-btn" @click="handleGoBack">
          返回上一页
        </Button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Button } from 'ant-design-vue'
import { useRouter } from 'vue-router'

import notFoundImage from '@/assets/404.png'

const router = useRouter()

// 跳首页：用 replace 避免「后退又回到 404」
const handleGoHome = () => {
  router.replace('/')
}

// 返回上一页：没有历史记录时兜底跳首页
const handleGoBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.replace('/')
}
</script>

<style scoped>
/* ===================================================
 * 整体页面：全屏居中 + 浅色渐变背景
 * 与 LoginView 右侧白色登录区基调保持一致，让 404 插画成为视觉焦点
 * =================================================== */
.not-found-page {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  background: linear-gradient(180deg, #f7f8fa 0%, #ffffff 100%);
  overflow: hidden;
}

/* 装饰光晕：模糊径向渐变，紫色调呼应插画，不干扰主体 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.glow-top {
  top: -120px;
  left: -120px;
  width: 360px;
  height: 360px;
  background: radial-gradient(circle, rgba(125, 90, 220, 0.18) 0%, transparent 70%);
}

.glow-bottom {
  right: -120px;
  bottom: -160px;
  width: 420px;
  height: 420px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.16) 0%, transparent 70%);
}

/* ===================================================
 * 卡片：垂直居中，最大宽度限制，整体入场动画
 * =================================================== */
.not-found-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 520px;
  text-align: center;
  animation: fade-up 0.5s ease-out;
}

/* ===================================================
 * 插画：图片 + 下方椭圆投影，做漂浮动效
 * =================================================== */
.illustration {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin-bottom: 8px;
}

.illustration-img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 24px;
  box-shadow: 0 24px 60px -20px rgba(45, 27, 105, 0.35);
  user-select: none;
  animation: floating 6s ease-in-out infinite;
}

/* 椭圆投影：缩放与浮动反向呼应，营造图片"离开地面"的真实感 */
.illustration-shadow {
  width: 60%;
  height: 16px;
  margin: 16px auto 0;
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(45, 27, 105, 0.25) 0%, transparent 70%);
  animation: shadow-pulse 6s ease-in-out infinite;
}

/* ===================================================
 * 文案：主标题 + 副标题
 * =================================================== */
.title {
  margin: 32px 0 12px;
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  letter-spacing: 1px;
}

.subtitle {
  margin: 0 0 32px;
  font-size: 15px;
  line-height: 1.6;
  color: #6b7280;
}

/* ===================================================
 * 按钮组
 * =================================================== */
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

.action-btn {
  min-width: 132px;
  height: 44px;
  font-size: 15px;
  border-radius: 8px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.18);
}

/* ===================================================
 * 动画定义
 * =================================================== */
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes floating {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

@keyframes shadow-pulse {
  0%,
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.8);
  }
}

/* ===================================================
 * 响应式：窄屏插画缩小、按钮纵向堆叠占满宽度
 * =================================================== */
@media (max-width: 640px) {
  .illustration {
    max-width: 320px;
  }

  .title {
    margin-top: 24px;
    font-size: 26px;
  }

  .subtitle {
    font-size: 14px;
  }

  .actions {
    width: 100%;
    flex-direction: column;
  }

  .action-btn {
    width: 100%;
  }
}

/* 尊重用户系统的"减少动效"偏好（无障碍） */
@media (prefers-reduced-motion: reduce) {
  .not-found-card,
  .illustration-img,
  .illustration-shadow {
    animation: none;
  }
}
</style>
