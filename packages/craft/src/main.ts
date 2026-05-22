import { createPinia } from 'pinia'

import { createApp } from 'vue'
import App from './App.vue'

import { setupEventHandlers } from './handlers'
import router from './router'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// 注册全局事件订阅（http 错误 → UI 反馈等），必须在 pinia / router 安装之后
setupEventHandlers()

app.mount('#app')
