import type { ImageComponentProps, TextComponentProps } from '@/defaultProps.ts'
import LImage from '@/components/LImage.vue'
import LText from '@/components/LText.vue'

export const componentMap = {
  LText,
  LImage,
} as const

export type ComponentKey = keyof typeof componentMap

export interface ComponentData {
  // id，uuid v4 生成 对应backend 数据库里的组件 id
  id: string
  // 这个元素的 属性，属性请详见下面
  props: Partial<TextComponentProps | ImageComponentProps>
  // 业务组件库名称 LText，LImage 等等，相当于是key。 真正的组件名称是layerName
  name: ComponentKey
  // 组件是否隐藏
  isHidden?: boolean
  // 组件是否锁定
  isLocked?: boolean
  // 组件名称
  layerName?: string
}

export type EditableCompField = keyof Omit<ComponentData, 'id' | 'props' | 'name'>
