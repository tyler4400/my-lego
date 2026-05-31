import { useLocalStorage, watchDebounced } from '@vueuse/core'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { updateWork } from '@/api/modules/work.ts'
import { useService } from '@/hooks/useService.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { useHistoryStore } from '@/stores/history.ts'
import { formatClock } from '@/utils/time.ts'

/** 自动保存开关偏好的 localStorage key */
const AUTO_SAVE_STORAGE_KEY = 'craft:autoSaveEnabled'

/** 自动保存防抖：停手 30s 后才保存，不打扰用户 */
const AUTO_SAVE_DEBOUNCE_MS = 30 * 1000
/** 自动保存封顶：持续操作时最多 120s 兜底保存一次 */
const AUTO_SAVE_MAX_WAIT_MS = 120 * 1000

/** 状态区图标类型（由 EditorHeader 映射到具体图标组件） */
export type SaveStatusType = 'saving' | 'saved' | 'on' | 'off'

/**
 * useSaveWork：作品保存编排（自动保存 / 手动保存 / 离开拦截 / 关闭警告 / 状态指示）
 *
 * 设计：
 * - dirty 由 historyStore 维护（基于历史游标版本：当前版本 !== 上次保存版本），本 hook 只消费
 * - 自动 & 手动保存都 silentSuccess：不弹成功 toast（避免每隔几十秒打扰），反馈交给状态文案；
 *   保存失败仍会 toast 提示，401 由全局 http:unauthorized 统一接管
 * - 离开页面：自动保存开则静默存；关则弹 3 选 1 确认框
 * - 关闭页面：仅在脏时挂 beforeunload 原生警告，存完即摘（对 bfcache 友好）
 */
export const useSaveWork = () => {
  const editorStore = useEditorStore()
  const historyStore = useHistoryStore()

  // 自动保存开关：用户偏好，持久化到 localStorage（默认开启，数据安全优先）
  const autoSaveEnabled = useLocalStorage(AUTO_SAVE_STORAGE_KEY, true)

  // 上次成功保存的本地时间（自动 / 手动都会刷新；Topic 4-A：时间戳反映最近一次任意保存）
  const lastSavedAt = ref<Date | null>(null)

  // silentSuccess：成功不弹 toast（反馈交给状态文案）；失败仍 toast，401 由全局接管
  const [doSave, saving] = useService(updateWork, {
    config: { silentSuccess: true },
  })

  // 是否有可保存的作品（无 id：未加载 / 他人模版空白态 → 禁用保存）
  const canSave = computed(() => Boolean(editorStore.pageData.id))

  /**
   * 执行一次保存（自动 / 手动同源，措辞统一不区分）
   * @returns 是否保存成功（无作品 / 失败均返回 false）
   */
  const save = async (): Promise<boolean> => {
    const body = editorStore.toUpdateBody()
    if (!body) return false

    // 抓取「发起保存那一刻」的版本（与 body 同一同步时刻）；成功后据此标记，
    // 避免请求飞行途中的编辑被误判为已保存（静默丢数据）
    const savedVersion = historyStore.currentVersionId
    const [, err] = await doSave(body)
    if (err) return false

    historyStore.markSaved(savedVersion)
    lastSavedAt.value = new Date()
    return true
  }

  /** 手动保存（供保存按钮调用） */
  const saveNow = () => save()

  // 自动保存：监听 [游标位置, 栈顶记录时间]（commit/undo/redo 靠 index、合并靠 pushAt）
  // 防抖 + 封顶；受开关 + dirty 双门控
  watchDebounced(
    [
      () => historyStore.historyIndex,
      () => historyStore.lastPushAt,
      () => autoSaveEnabled.value,
    ],
    () => {
      if (autoSaveEnabled.value && historyStore.isDirty) save()
    },
    { debounce: AUTO_SAVE_DEBOUNCE_MS, maxWait: AUTO_SAVE_MAX_WAIT_MS },
  )

  // ====== 状态指示（Topic 4-A：优先级 saving > off > saved > on） ======
  // - off 时不显示时间戳 → 不存在「落后的时间」问题
  // - 自动保存开启时，手动保存也会刷新「已保存于」，措辞统一不区分自动/手动
  const saveStatusType = computed<SaveStatusType>(() => {
    if (saving.value) return 'saving'
    if (!autoSaveEnabled.value) return 'off'
    if (lastSavedAt.value) return 'saved'
    return 'on'
  })

  const saveStatusText = computed(() => {
    switch (saveStatusType.value) {
      case 'saving': return '保存中…'
      case 'off': return '自动保存已关闭'
      case 'saved': return lastSavedAt.value ? `已保存于 ${formatClock(lastSavedAt.value)}` : '自动保存已开启'
      case 'on': return '自动保存已开启'
    }
  })

  // ====== 关闭页面警告：仅脏时挂 beforeunload，存完即摘（bfcache 友好）======
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    // 现代浏览器只显示通用文案，preventDefault / returnValue 仅用于触发原生确认框
    e.preventDefault()
    e.returnValue = '' // Chrome requires returnValue to be set.
  }

  watch(() => historyStore.isDirty, (dirty) => {
    if (dirty) window.addEventListener('beforeunload', onBeforeUnload)
    else window.removeEventListener('beforeunload', onBeforeUnload)
  })

  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  // ====== 路由离开拦截 ======
  // 离开确认弹框状态（自动保存关闭 + 有未保存改动时使用）
  const leaveModalOpen = ref(false)
  let leaveResolver: ((leave: boolean) => void) | null = null

  const resolveLeave = (leave: boolean) => {
    leaveModalOpen.value = false
    leaveResolver?.(leave)
    leaveResolver = null
  }

  /** 保存并离开：保存失败则留在页面，避免丢数据 */
  const onLeaveSave = async () => {
    const ok = await save()
    resolveLeave(ok)
  }
  /** 不保存直接离开 */
  const onLeaveDiscard = () => resolveLeave(true)
  /** 取消离开，留在编辑器 */
  const onLeaveCancel = () => resolveLeave(false)

  onBeforeRouteLeave(async () => {
    if (!historyStore.isDirty) return true

    // 自动保存开启：静默存一次再放行；失败则降级到手动确认框
    if (autoSaveEnabled.value) {
      const ok = await save()
      if (ok) return true
    }

    // 自动保存关闭（或自动保存失败）：弹确认框，由用户决定
    return new Promise<boolean>((resolve) => {
      leaveResolver = resolve
      leaveModalOpen.value = true
    })
  })

  return {
    saving,
    canSave,
    autoSaveEnabled,
    saveStatusType,
    saveStatusText,
    saveNow,
    // 离开确认弹框
    leaveModalOpen,
    onLeaveSave,
    onLeaveDiscard,
    onLeaveCancel,
  }
}
