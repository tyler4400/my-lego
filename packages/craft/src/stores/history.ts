import type { CompFieldKey, EditableCompField, EditablePageField, PageProps } from '@/types/editor.ts'
import type { ActionHistory, ActionHistoryInput } from '@/types/history.ts'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, readonly, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.ts'

const applyAction = (action: ActionHistory, direction: 'undo' | 'redo') => {
  const editorStore = useEditorStore()
  switch (action.actionType) {
    case 'add':
      if (direction === 'undo') {
        editorStore.removeElement(action.componentId)
      }
      else {
        editorStore.addComponent(action.data)
      }
      return
    case 'delete':
      if (direction === 'undo') {
        editorStore.addComponent(action.data, action.index)
      }
      else {
        editorStore.removeElement(action.componentId)
      }
      return
    case 'reorder': {
      const { startIndex, endIndex } = action.data
      if (direction === 'undo') {
        editorStore.move(endIndex, startIndex)
      }
      else {
        editorStore.move(startIndex, endIndex)
      }
      return
    }
    case 'updateComp': {
      const val = direction === 'undo' ? action.data.oldValue : action.data.newValue
      if (action.target === 'props') {
        editorStore.updateCompProp(action.data.key as CompFieldKey, val, action.componentId)
      }
      else {
        editorStore.updateCompData(action.data.key as EditableCompField, val, action.componentId)
      }
      return
    }
    case 'updatePage': {
      const val = direction === 'undo' ? action.data.oldValue : action.data.newValue
      if (action.target === 'props') {
        editorStore.updatePageProp(action.data.key as keyof PageProps, val)
      }
      else {
        editorStore.updatePageData(action.data.key as EditablePageField, val)
      }
      return
    }
    default:
      console.warn('unknown action type', action)
      break
  }
}

export const useHistoryStore = defineStore('history', () => {
  // 历史记录栈
  const histories = ref<ActionHistory[]>([])

  // 当前游标位置，-1 表示无可撤销记录
  const historyIndex = ref(-1)

  const canUndo = computed(() => historyIndex.value >= 0 && histories.value.length > 0)
  const canRedo = computed(() => historyIndex.value < histories.value.length - 1)

  // 是否正处于 undo/redo 重放过程，重放期间触发的 pushAction 会被忽略，防止递归入栈
  let isApplying = false

  /**
   * 入栈一条新动作
   * 1. 重放期间不入栈
   * 2. 新动作发生时，丢弃当前游标之后的所有记录（标准编辑器行为）
   * 3. id 自动生成
   */
  const pushAction = (action: ActionHistoryInput) => {
    if (isApplying) return

    if (historyIndex.value < histories.value.length - 1) {
      histories.value.splice(historyIndex.value + 1)
    }
    histories.value.push({ ...action, id: uuidv4() } as ActionHistory)
    historyIndex.value++
  }

  const clear = () => {
    historyIndex.value = -1
    histories.value = []
  }

  const undo = () => {
    if (!canUndo.value) return

    const action = histories.value[historyIndex.value]
    if (!action) return

    isApplying = true
    try {
      applyAction(action, 'undo')
      historyIndex.value--
    }
    finally {
      isApplying = false
    }
  }

  const redo = () => {
    if (!canRedo.value) return

    const nextIndex = historyIndex.value + 1
    const action = histories.value[nextIndex]
    if (!action) return

    isApplying = true
    try {
      historyIndex.value = nextIndex
      applyAction(action, 'redo')
    }
    finally {
      isApplying = false
    }
  }

  return {
    historyIndex: readonly(historyIndex),
    histories: readonly(histories),
    pushAction,
    clear,
    undo,
    redo,
    canRedo,
    canUndo,
  }
})
