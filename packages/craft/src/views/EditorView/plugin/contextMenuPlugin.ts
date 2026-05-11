import type { ContextMenuItem } from '@/components/ContextMenu'
import {
  CopyOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  SnippetsOutlined,
  UnlockOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { useContextMenuTrigger } from '@/components/ContextMenu'
import { useEditorStore } from '@/stores/editor.ts'

export default function initContextMenu(selector: string) {
  const editorStore = useEditorStore()

  const buildItems = (compId: string): ContextMenuItem[] => {
    const comp = editorStore.components.find(c => c.id === compId)
    if (!comp) return []

    return [
      {
        key: 'copy',
        label: '复制',
        icon: CopyOutlined,
        shortcut: 'Ctrl+C',
        onClick: () => {
          if (editorStore.copyElement(compId)) message.success('已复制当前元素')
        },
      },
      {
        key: 'paste',
        label: '粘贴',
        icon: SnippetsOutlined,
        shortcut: 'Ctrl+V',
        disabled: !editorStore.copiedElement,
        onClick: () => {
          if (editorStore.pasteElement()) message.success('已粘贴当前元素')
          else message.warn('没有可以粘贴的元素')
        },
      },
      { type: 'divider', key: 'd1' },
      {
        key: 'lock',
        label: comp.isLocked ? '解锁' : '锁定',
        icon: comp.isLocked ? UnlockOutlined : LockOutlined,
        shortcut: 'Ctrl+L',
        onClick: () => editorStore.updateCompData('isLocked', !comp.isLocked, compId),
      },
      {
        key: 'hide',
        label: '隐藏',
        icon: EyeInvisibleOutlined,
        shortcut: 'Ctrl+H',
        onClick: () => editorStore.updateCompData('isHidden', true, compId),
      },
      { type: 'divider', key: 'd2' },
      {
        key: 'delete',
        label: '删除',
        icon: DeleteOutlined,
        shortcut: 'Delete',
        danger: true,
        onClick: () => editorStore.removeElement(compId),
      },
    ]
  }

  useContextMenuTrigger({
    selector,
    onBeforeOpen: (target) => {
      const compId = target.dataset.compId
      if (compId) editorStore.setCurrentElement(compId)
    },
    buildItems: (target) => {
      const compId = target.dataset.compId
      if (!compId) return []
      return buildItems(compId)
    },
  })
}
