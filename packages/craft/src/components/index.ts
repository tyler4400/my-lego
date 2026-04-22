import LImage from '@/components/LImage.vue'
import LText from '@/components/LText.vue'

export const componentMap = {
  LText,
  LImage,
} as const

export type ComponentKey = keyof typeof componentMap

export * from './defaultProps'
