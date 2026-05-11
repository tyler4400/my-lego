import type { Component, VNode } from 'vue'

interface ContextMenuItemInner {
  key: string
  type?: 'item' | 'link'
  label: string
  // 支持字符串（如 iconfont 名）、Vue 组件（如 ant-design-icons）、或已渲染的 VNode
  icon?: string | Component | VNode
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onClick?: () => void
}

export interface ContextMenuDivider {
  key: string
  type: 'divider'
}

export type ContextMenuItem = ContextMenuItemInner | ContextMenuDivider

export interface ContextMenuOpenOption {
  x: number
  y: number
  items: ContextMenuItem[]
}

export interface ContextMenuExposed {
  open: (opt: ContextMenuOpenOption) => void
  close: () => void
}

export interface ContextMenuTriggerOptions {
  selector: string
  buildItems: (target: HTMLElement, event: MouseEvent) => ContextMenuItem[]
  onBeforeOpen?: (target: HTMLElement, event: MouseEvent) => void
  root?: HTMLElement | (() => HTMLElement | null | undefined)
}
