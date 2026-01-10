import type { ComponentKey } from '@/components'
import type { WorkContent } from '@/ssr/types'
import { createSSRApp, defineComponent } from 'vue'
import { componentMap } from '@/components'

/**
 * 共享的“创建页面 App”方法
 * - server 侧：renderToString(createPageApp(content))
 * - client 侧：createPageApp(content).mount('#app')（Hydration）
 */
export const createPageApp = (content: WorkContent) => {
  const { components = [] } = content

  const RootApp = defineComponent({
    name: 'LegoH5Page',
    setup() {
      return () => (
        <div class="LegoH5Root">
          {components.map((comp) => {
            const Comp = componentMap[comp.name as ComponentKey]
            if (!Comp) return null
            return <Comp key={comp.id} {...(comp.props as any || {})} />
          })}
        </div>
      )
    },
  })

  return createSSRApp(RootApp)
}
