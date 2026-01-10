import type { WorkContent } from '@/ssr/types'
import { renderToString } from 'vue/server-renderer'
import { createPageApp } from '@/ssr/createPageApp'

/** 仅在 Node 侧使用：把 work.content 渲染成 HTML */
export const renderWorkToHTML = async (content: WorkContent) => {
  const app = createPageApp(content)
  const html = await renderToString(app)
  return { html }
}
