import type { ComponentData } from '@/components'

export interface WorkContent {
  /** 画布组件列表 */
  components: ComponentData[]
  /** 未来扩展：page/bodyStyle/meta...（先不做） */
  // bodyStyle: Record<string, string | number>
}

export type { ComponentData } from '@/components'
