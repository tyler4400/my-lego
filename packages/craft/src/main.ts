import { isFunction } from '@my-lego/shared'
import { createPinia } from 'pinia'

import { createApp } from 'vue'
import App from './App.vue'

import router from './router'
import './styles/index.css'

console.log('main.ts--isFunction: ', isFunction(234))

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
