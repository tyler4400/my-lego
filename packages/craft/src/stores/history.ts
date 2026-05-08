import type { CompFieldKey, EditableCompField, EditablePageField, PageProps } from '@/types/editor.ts'
import type { ActionHistory, ActionHistoryInput } from '@/types/history.ts'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, readonly, ref } from 'vue'
import { useEditorStore } from '@/stores/editor.ts'

// 高频合并时间
const MERGE_WINDOW_MS = 1000
// 最大桟深
const MAX_HISTORY_LENGTH = 100

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
    case 'remove':
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
        editorStore.reorder(endIndex, startIndex)
      }
      else {
        editorStore.reorder(startIndex, endIndex)
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
    case 'batch':
      if (direction === 'undo') {
        // 反序 undo：从最后一条开始往前回滚
        for (let i = action.data.length - 1; i >= 0; i--) {
          applyAction(action.data[i]!, 'undo')
        }
      }
      else {
        for (const item of action.data) {
          applyAction(item, 'redo')
        }
      }
      return
    default: {
      const exhaustive: never = action
      console.warn('[history store] unknown action type', exhaustive)
      break
    }
  }
}

/**
 * 判断 next 能否合并到栈顶 top
 * 条件：同 actionType + 同 componentId（如有）+ 同 target + 同 key
 */
const canMerge = (top: ActionHistory, next: ActionHistoryInput): boolean => {
  if (top.actionType !== next.actionType) return false
  if (top.actionType !== 'updateComp' && top.actionType !== 'updatePage') return false
  // 类型已收窄到 updateComp | updatePage，target / data.key 都安全访问
  if (top.actionType === 'updateComp' && next.actionType === 'updateComp') {
    if (top.componentId !== next.componentId) return false
  }
  if (top.target !== (next as typeof top).target) return false
  if (top.data.key !== (next as typeof top).data.key) return false

  return true
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

  // 最后入栈时间
  let lastPushAt = 0

  // 事务相关api
  let composing = false
  let composeBuffer: ActionHistory[] = []

  const startCompose = () => {
    if (composing) {
      console.warn('[history store] nested compose is not supported')
      return
    }
    composing = true
    composeBuffer = []
  }

  const endCompose = () => {
    if (!composing) return
    composing = false

    const buffer = composeBuffer
    composeBuffer = []

    if (buffer.length === 0) return

    if (buffer.length === 1) { // 单条没必要包 batch，直接当普通记录走 push 流程
      // eslint-disable-next-line ts/no-use-before-define
      commitRecord(buffer[0]!)
    }
    else {
      // eslint-disable-next-line ts/no-use-before-define
      commitRecord({ id: uuidv4(), data: buffer, actionType: 'batch' })
    }
  }

  const compose = <T>(fn: () => T): T => {
    startCompose()
    try {
      return fn()
    }
    finally {
      endCompose()
    }
  }

  /**
   * 真正落栈 + 栈深和forward裁剪
   * 给 pushAction（普通） 和 endCompose（事务） 共用
   */
  const commitRecord = (record: ActionHistory) => {
    // 新动作发生时，丢弃当前游标之后的所有记录（标准编辑器行为）
    if (historyIndex.value < histories.value.length - 1) {
      histories.value.splice(historyIndex.value + 1)
    }

    // 核心: 入栈
    histories.value.push(record)
    historyIndex.value++ // 游标位置始终跟着栈走

    // 超出最大栈深时丢弃最早的
    if (histories.value.length > MAX_HISTORY_LENGTH) {
      histories.value.shift()
      historyIndex.value-- // ⚠️ shift 后必须 historyIndex--，否则游标错位
    }

    lastPushAt = Date.now()
  }
  /**
   * pushAction 的职责变成"前置过滤 + 路由"：
   * 重放期间 → 忽略
   * 等值 → 忽略
   * composing → 进 buffer
   * 否则 → 走栈顶合并 / commit
   */
  const pushAction = (action: ActionHistoryInput) => {
    // 重放期间 → 忽略
    if (isApplying) return

    // 等值过滤：updateComp / updatePage 的 old===new 时直接忽略
    if (action.actionType === 'updateComp' || action.actionType === 'updatePage') {
      if (action.data.oldValue === action.data.newValue) {
        console.log('等值过滤', action)
        return
      }
    }

    // composing 中：进 buffer，不走栈顶合并 / 不真入栈, 在事务结束的时候统一入栈
    if (composing) {
      composeBuffer.push({ ...action, id: uuidv4() })
      return
    }

    // 栈顶合并 // 因为我们在上一步丢弃了forward，所以这样写也OK： const top = histories.value[histories.value.length - 1]
    const top = histories.value[historyIndex.value]
    const now = Date.now()
    if (top && (now - lastPushAt) < MERGE_WINDOW_MS && canMerge(top, action)) {
      // 此时 top 的 actionType 一定是 updateComp或者updatePage，data 一定有 newValue
      (top.data as any).newValue = (action as any).data.newValue
      console.log('栈顶合并', action)

      // 栈顶合并也要裁剪forward
      if (historyIndex.value < histories.value.length - 1) {
        histories.value.splice(historyIndex.value + 1)
      }
      // 刷新入栈时间
      lastPushAt = now
    }
    else {
      // 不能栈顶合并就入栈
      commitRecord({ ...action, id: uuidv4() })
    }
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
    startCompose,
    endCompose,
    compose,
  }
})
