<template>
  <Dropdown
    v-model:open="visible"
    placement="bottomLeft"
    :trigger="[]"
    :destroyPopupOnHide="true"
  >
    <span class="ctx-virtual-trigger" :style="{ left: `${position.x}px`, top: `${position.y}px` }" />
    <template #overlay>
      <Menu class="ctx-menu" @click="handMenuClick">
        <template v-for="item in items" :key="item.key">
          <MenuDivider v-if="item.type === 'divider'" />
          <MenuItem
            v-else
            :key="item.key"
            :disabled="item.disabled"
            :danger="item.danger"
            @click="item.onClick"
          >
            <div class="ctx-item">
              <span class="ctx-icon-slot">
                <component :is="item.icon" v-if="item.icon" />
              </span>
              <span class="ctx-label">{{ item.label }}</span>
              <span class="ctx-shortcut">{{ item.shortcut }}</span>
            </div>
          </MenuItem>
        </template>
      </Menu>
    </template>
  </Dropdown>
</template>

<script setup lang="ts">
import type { ContextMenuExposed, ContextMenuItem, ContextMenuOpenOption } from './types.ts'
import { useEventListener } from '@vueuse/core'
import { Dropdown, Menu, MenuDivider, MenuItem } from 'ant-design-vue'
import { nextTick, ref } from 'vue'

defineOptions({ name: 'ContextMenu' })

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const items = ref<ContextMenuItem[]>([])

const open = async (opt: ContextMenuOpenOption) => {
  /**
   * antd 的 Align（dom-align）只在 visible: false → true 时重新对齐。如果 visible 已经是 true，trigger 的 left/top 改变了，antd 不会重新计算 popup 位置。
   */
  if (visible.value) {
    visible.value = false
    await nextTick()
  }
  position.value = { x: opt.x, y: opt.y }
  items.value = opt.items
  visible.value = true
}

const close = () => {
  visible.value = false
}

const handMenuClick = () => {
  close()
}

/* 点击外层关闭菜单 */
useEventListener(document, 'mousedown', (e: MouseEvent) => {
  if (!visible.value) return
  if ((e.target as HTMLElement).closest('.ctx-menu')) return
  close()
})

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return
  if (!visible.value) return
  e.stopImmediatePropagation() // 阻止同节点的其它监听器（包括 hotkeys-js）
  close()
}, { capture: true })

defineExpose<ContextMenuExposed>({
  open,
  close,
})
</script>

<style scoped>
.ctx-virtual-trigger {
  position: fixed;
  /*
  ant-design-vue 4 的 Dropdown 内部用 dom-align 计算 popup 位置，会调用 trigger 元素的 getBoundingClientRect()。
  很多对齐库（包括 antd 的 Align 组件内部）在 trigger 的 width === 0 && height === 0 时会判定为"不可见元素"，跳过对齐计算——这是个常见的 guard 逻辑。
  我们的虚拟触发器恰好就是 0×0，正好踩中。
  把虚拟触发器从 0×0 改成 1×1。1px 在视觉上几乎看不见，加上 opacity: 0 兜底完全隐形
  */
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 180px;
}
.ctx-icon-slot {
  width: 14px;
  display: inline-flex;
  justify-content: center;
  flex-shrink: 0;
  font-size: 14px;
}
.ctx-label {
  flex: 1;
  white-space: nowrap;
}
.ctx-shortcut {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
  margin-left: 24px;
}
</style>
