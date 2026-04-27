import type { ComponentData } from '@/types/editor.ts'

export interface EditWrapperProps {
  active: boolean
  comp: ComponentData/* 这里拿了完整对象，也可以只拿相关props */
}

export type ResizeDirection = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'
export interface PositionPayload {
  left?: string
  top?: string
  width?: string
  height?: string
}
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}
