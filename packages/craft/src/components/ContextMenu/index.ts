import type { ContextMenuExposed, ContextMenuOpenOption, ContextMenuTriggerOptions } from '@/components/ContextMenu/types.ts'
import { isFunction } from '@my-lego/shared'
import { useEventListener } from '@vueuse/core'
import { h, render } from 'vue'
import ContextMenu from '@/components/ContextMenu/ContextMenu.vue'

// 右键菜单是唯一实例，所以提到的顶部写是ok的
let instance: ContextMenuExposed | null = null
let container: HTMLDivElement | null = null

// 仅挂载一次。
const mountContextMenu = () => {
  if (instance) return

  const vnode = h(ContextMenu)
  container = document.createElement('div')
  render(vnode, container)
  document.body.appendChild(container)
  instance = vnode.component?.exposed as ContextMenuExposed
}

const open = (opt: ContextMenuOpenOption) => {
  mountContextMenu()
  instance?.open(opt)
}

const close = () => {
  instance?.close()
}

/**
 * 卸载单例。一般无需调用，详见文件顶部说明。
 * 注意：调用后下次 open() 会重新挂载（有少量初始化开销）。
 */
const destroy = () => {
  if (!container) return
  render(null, container)
  // container.remove()
  instance = null
  container = null
}

/**
 * ContextMenu 单例：模块级常驻，懒挂载 + 复用同一个 Vue 实例。
 *
 * - open()    懒挂载（首次调用时 createVNode + render），后续复用
 * - close()   仅隐藏菜单。底层 Dropdown 配合 destroyPopupOnHide，
 *             浮层 DOM 关闭时已自动销毁，常驻成本仅 1×1 虚拟触发器
 * - destroy() "逃生口"，业务通常无需调用：
 *               · 路由切换时复用单例反而更快
 *               · 页面卸载时浏览器自动回收
 *               · 仅在 SSR 卸载、单测隔离等特殊场景需要手动调用
 */
const contextMenuInstance = { open, close, destroy }
export default contextMenuInstance

export function useContextMenuTrigger(opt: ContextMenuTriggerOptions) {
  const { root, selector, onBeforeOpen, buildItems } = opt

  const handleContextMenu = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>(selector)
    if (!target) return

    e.preventDefault()
    onBeforeOpen?.(target, e)

    const items = buildItems(target, e)
    if (items.length === 0) return

    contextMenuInstance.open({ x: e.clientX, y: e.clientY, items })
  }

  const resolvedRoot = (isFunction(root) ? root() : root) ?? document
  useEventListener(resolvedRoot, 'contextmenu', handleContextMenu)
}

export * from './types.ts'
