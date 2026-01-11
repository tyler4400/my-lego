import type { WorkContent } from '@/ssr/types'
import { isArray } from '@my-lego/shared'
import { createPageApp } from '@/ssr/createPageApp'

declare global {
  interface Window {
    __LEGO_PAGE_DATA__?: WorkContent
  }
}

console.log('[lego-h5] client entry loaded')

const handleHydrate = () => {
  const content = window.__LEGO_PAGE_DATA__
  if (!content || !isArray(content.components)) {
    console.log('[lego-h5] no page data, skip hydration')
    return
  }

  console.log('[lego-h5] hydrating...', content)

  const app = createPageApp(content)
  app.mount('#app')
}

handleHydrate()
