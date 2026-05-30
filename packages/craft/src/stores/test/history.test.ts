import type { ComponentData } from '@/types/editor.ts'
import type { ActionHistoryInput } from '@/types/history.ts'
import { createPinia, setActivePinia } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { imageDefaultProps } from '@/components/defaultProps.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { useHistoryStore } from '@/stores/history.ts'

// ---------------------------------------------------------------------------
// 测试辅助函数
// ---------------------------------------------------------------------------

/** 构造测试用 LImage 组件，必要字段可覆写 */
const createImageComponent = (overrides: Partial<ComponentData> = {}): ComponentData => ({
  id: uuidv4(),
  name: 'LImage',
  layerName: '测试图层',
  props: { ...imageDefaultProps, src: 'https://example.com/test.png' },
  ...overrides,
})

/** 构造 add 类型的入栈输入 */
const createAddInput = (componentId?: string): ActionHistoryInput => {
  const data = createImageComponent(componentId ? { id: componentId } : {})
  return {
    actionType: 'add',
    componentId: data.id,
    data,
  }
}

/** 构造 updateComp 类型的入栈输入 */
const createUpdateCompInput = (
  componentId: string,
  key: string,
  oldValue: unknown,
  newValue: unknown,
  target: 'props' | 'compData' = 'props',
): ActionHistoryInput => ({
  actionType: 'updateComp',
  componentId,
  target,
  data: { key: key as never, oldValue, newValue },
})

/** 构造 updatePage 类型的入栈输入 */
const createUpdatePageInput = (
  key: string,
  oldValue: unknown,
  newValue: unknown,
  target: 'props' | 'pageData' = 'props',
): ActionHistoryInput => ({
  actionType: 'updatePage',
  target,
  data: { key: key as never, oldValue, newValue },
})

// ---------------------------------------------------------------------------
// 纯逻辑用例：聚焦栈结构、过滤、合并、裁剪、事务等不依赖 editor 行为的逻辑
// 直接调用 history.pushAction 触发，不通过 editor，避免被 editor 内部行为干扰
// ---------------------------------------------------------------------------

describe('useHistoryStore - 纯逻辑', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 接管 Date.now / setTimeout 等，便于精确测试合并时间窗
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('初始状态 / clear', () => {
    it('初始 historyIndex=-1, histories=[], canUndo/canRedo 都为 false', () => {
      const history = useHistoryStore()

      expect(history.historyIndex).toBe(-1)
      expect(history.histories).toEqual([])
      expect(history.canUndo).toBe(false)
      expect(history.canRedo).toBe(false)
    })

    it('clear() 重置 histories 和 historyIndex', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      history.pushAction(createAddInput('c2'))
      expect(history.histories.length).toBe(2)

      history.clear()

      expect(history.historyIndex).toBe(-1)
      expect(history.histories).toEqual([])
      expect(history.canUndo).toBe(false)
      expect(history.canRedo).toBe(false)
    })
  })

  describe('pushAction - 基础入栈与游标', () => {
    it('入栈一条后 length=1, historyIndex=0, canUndo=true', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))

      expect(history.histories.length).toBe(1)
      expect(history.historyIndex).toBe(0)
      expect(history.canUndo).toBe(true)
      expect(history.canRedo).toBe(false)
    })

    it('入栈多条按顺序排列', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      history.pushAction(createAddInput('c2'))
      history.pushAction(createAddInput('c3'))

      expect(history.histories.length).toBe(3)
      expect(history.historyIndex).toBe(2)
      const ids = history.histories.map(h => (h as { componentId: string }).componentId)
      expect(ids).toEqual(['c1', 'c2', 'c3'])
    })

    it('自动给入栈记录补一个非空字符串 id', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      const record = history.histories[0]!

      expect(typeof record.id).toBe('string')
      expect(record.id.length).toBeGreaterThan(0)
    })
  })

  describe('pushAction - 等值过滤', () => {
    it('updateComp 且 oldValue===newValue 时被忽略', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '14px'))

      expect(history.histories.length).toBe(0)
    })

    it('updatePage 且 oldValue===newValue 时被忽略', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdatePageInput('backgroundColor', '#fff', '#fff'))

      expect(history.histories.length).toBe(0)
    })

    it('add / reorder 不会被等值过滤', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      history.pushAction({
        actionType: 'reorder',
        data: { startIndex: 0, endIndex: 0 },
      })

      expect(history.histories.length).toBe(2)
    })
  })

  describe('pushAction - 栈顶合并', () => {
    it('1000ms 内同 type/target/key/componentId → 合并 newValue, length 不变', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
      vi.advanceTimersByTime(500)
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '16px'))

      expect(history.histories.length).toBe(1)
      const record = history.histories[0] as { data: { oldValue: string, newValue: string } }
      // 合并保留最早的 oldValue，覆盖 newValue
      expect(record.data.oldValue).toBe('12px')
      expect(record.data.newValue).toBe('16px')
    })

    it('超过 1000ms → 不合并', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
      vi.advanceTimersByTime(1500)
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '16px'))

      expect(history.histories.length).toBe(2)
    })

    it('不同 componentId → 不合并', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
      vi.advanceTimersByTime(500)
      history.pushAction(createUpdateCompInput('c2', 'fontSize', '14px', '16px'))

      expect(history.histories.length).toBe(2)
    })

    it('不同 target（props vs compData）→ 不合并', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px', 'props'))
      vi.advanceTimersByTime(500)
      history.pushAction(createUpdateCompInput('c1', 'layerName', 'old', 'new', 'compData'))

      expect(history.histories.length).toBe(2)
    })

    it('不同 key → 不合并', () => {
      const history = useHistoryStore()
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
      vi.advanceTimersByTime(500)
      history.pushAction(createUpdateCompInput('c1', 'color', 'red', 'blue'))

      expect(history.histories.length).toBe(2)
    })

    it('add / remove / reorder 不会被合并', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      vi.advanceTimersByTime(100)
      history.pushAction(createAddInput('c2'))

      expect(history.histories.length).toBe(2)
    })

    it('合并发生时若存在 forward 也会被裁剪', () => {
      const history = useHistoryStore()
      // 第一条 update（栈顶 → 后续合并目标）
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
      // 第二条 update 与第一条合并 → length 仍为 1
      vi.advanceTimersByTime(100)
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '16px'))
      expect(history.histories.length).toBe(1)

      // add 与 update 不会合并，用它在 [0] 之后制造一条 forward 记录（保持时间窗内）
      history.pushAction(createAddInput('c2'))
      expect(history.histories.length).toBe(2)

      // undo 一次 → 游标退回到 [0]，[1] 成为 forward
      history.undo()
      expect(history.historyIndex).toBe(0)
      expect(history.canRedo).toBe(true)

      // 再 push 一条能与 [0] 合并的 update（[0] 自身 pushAt 仍在时间窗内、各字段一致）
      history.pushAction(createUpdateCompInput('c1', 'fontSize', '16px', '20px'))

      // 合并 + forward 裁剪：length=1，最新 newValue=20px，redo 不可用
      expect(history.histories.length).toBe(1)
      expect(history.historyIndex).toBe(0)
      expect(history.canRedo).toBe(false)
      const record = history.histories[0] as { data: { oldValue: string, newValue: string } }
      expect(record.data.newValue).toBe('20px')
    })
  })

  describe('pushAction - 新动作裁剪 forward', () => {
    it('undo 后 push 一条不可合并的新动作 → forward 被丢弃', () => {
      const history = useHistoryStore()
      history.pushAction(createAddInput('c1'))
      history.pushAction(createAddInput('c2'))
      history.pushAction(createAddInput('c3'))
      expect(history.histories.length).toBe(3)
      expect(history.historyIndex).toBe(2)

      history.undo()
      history.undo()
      expect(history.historyIndex).toBe(0)
      expect(history.canRedo).toBe(true)

      history.pushAction(createAddInput('c4'))

      expect(history.histories.length).toBe(2)
      expect(history.historyIndex).toBe(1)
      expect(history.canRedo).toBe(false)
      // 新栈顶应是 c4
      expect((history.histories[1] as { componentId: string }).componentId).toBe('c4')
    })
  })

  describe('pushAction - 栈深裁剪 (MAX_HISTORY_LENGTH=100)', () => {
    it('push 第 101 条时丢弃最旧一条，historyIndex 仍指向最新', () => {
      const history = useHistoryStore()

      for (let i = 0; i < 101; i++) {
        // 用 add + 不同 id，避免触发合并；推时间避免任何潜在边界
        vi.advanceTimersByTime(2000)
        history.pushAction(createAddInput(`c${i}`))
      }

      expect(history.histories.length).toBe(100)
      expect(history.historyIndex).toBe(99)
      // 最旧的 c0 已被 shift 掉，[0] 是 c1，[99] 是 c100
      expect((history.histories[0] as { componentId: string }).componentId).toBe('c1')
      expect((history.histories[99] as { componentId: string }).componentId).toBe('c100')
    })
  })

  describe('compose / 事务', () => {
    it('compose 内多条 → 落栈一条 batch，data 按 push 顺序排列', () => {
      const history = useHistoryStore()
      history.compose(() => {
        history.pushAction(createAddInput('c1'))
        history.pushAction(createUpdateCompInput('c1', 'opacity', '1', '0.5'))
      })

      expect(history.histories.length).toBe(1)
      const record = history.histories[0] as unknown as { actionType: string, data: ActionHistoryInput[] }
      expect(record.actionType).toBe('batch')
      expect(record.data.length).toBe(2)
      expect(record.data[0]!.actionType).toBe('add')
      expect(record.data[1]!.actionType).toBe('updateComp')
    })

    it('compose 内仅一条 → 直接入栈，不包 batch', () => {
      const history = useHistoryStore()
      history.compose(() => {
        history.pushAction(createAddInput('c1'))
      })

      expect(history.histories.length).toBe(1)
      expect((history.histories[0] as { actionType: string }).actionType).toBe('add')
    })

    it('compose 内零条 → 不入栈', () => {
      const history = useHistoryStore()
      history.compose(() => {})

      expect(history.histories.length).toBe(0)
    })

    it('compose 中 fn 抛异常仍能 endCompose 落栈已 push 的内容', () => {
      const history = useHistoryStore()

      expect(() => {
        history.compose(() => {
          history.pushAction(createAddInput('c1'))
          throw new Error('oops')
        })
      }).toThrow('oops')

      // 已 push 的 1 条仍应落栈（单条不包 batch）
      expect(history.histories.length).toBe(1)
      expect((history.histories[0] as { actionType: string }).actionType).toBe('add')
    })

    it('嵌套 compose 被扁平化，仅外层 endCompose 时落栈', () => {
      const history = useHistoryStore()

      history.startCompose()
      history.pushAction(createAddInput('c1'))

      history.startCompose()
      history.pushAction(createUpdateCompInput('c1', 'opacity', '1', '0.5'))
      history.endCompose()
      // 内层结束不落栈
      expect(history.histories.length).toBe(0)

      history.pushAction(createAddInput('c2'))
      history.endCompose()

      // 外层结束，3 条进 batch
      expect(history.histories.length).toBe(1)
      const record = history.histories[0] as unknown as { actionType: string, data: ActionHistoryInput[] }
      expect(record.actionType).toBe('batch')
      expect(record.data.length).toBe(3)
    })

    it('compose 期间不触发栈顶合并（直接进 buffer）', () => {
      const history = useHistoryStore()
      history.compose(() => {
        // 在 compose 外这两条是会合并的
        history.pushAction(createUpdateCompInput('c1', 'fontSize', '12px', '14px'))
        history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '16px'))
      })

      const record = history.histories[0] as unknown as { actionType: string, data: ActionHistoryInput[] }
      expect(record.actionType).toBe('batch')
      // 没有合并：buffer 内 2 条都被保留
      expect(record.data.length).toBe(2)
    })

    it('compose 期间等值仍被过滤（不进 buffer）', () => {
      const history = useHistoryStore()
      history.compose(() => {
        history.pushAction(createUpdateCompInput('c1', 'fontSize', '14px', '14px'))
      })

      expect(history.histories.length).toBe(0)
    })
  })
})

// ---------------------------------------------------------------------------
// 集成用例：通过 useEditorStore 真实触发，验证 undo/redo 的状态回放
// 刻意不 mock editor，能同时校验 applyAction 调用 editor 的接口签名是否正确
// ---------------------------------------------------------------------------

describe('useHistoryStore + useEditorStore 集成', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('undo/redo 守卫', () => {
    it('空栈 undo 不变化', () => {
      const history = useHistoryStore()
      history.undo()
      expect(history.historyIndex).toBe(-1)
    })

    it('已在末尾 redo 不变化', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'guard-1' }))

      const beforeIdx = history.historyIndex
      history.redo()
      expect(history.historyIndex).toBe(beforeIdx)
    })

    it('undo / redo 后 historyIndex 正确变化', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'idx-1' }))
      vi.advanceTimersByTime(2000)
      editor.addComponent(createImageComponent({ id: 'idx-2' }))

      const top = history.historyIndex
      history.undo()
      expect(history.historyIndex).toBe(top - 1)
      history.redo()
      expect(history.historyIndex).toBe(top)
    })
  })

  describe('add 的 undo/redo', () => {
    it('add → undo 后组件消失；redo 后组件恢复', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      const comp = createImageComponent({ id: 'add-1' })

      editor.addComponent(comp)
      expect(editor.components.find(c => c.id === 'add-1')).toBeTruthy()
      expect((history.histories[history.historyIndex] as { actionType: string }).actionType).toBe('add')

      history.undo()
      expect(editor.components.find(c => c.id === 'add-1')).toBeFalsy()

      history.redo()
      expect(editor.components.find(c => c.id === 'add-1')).toBeTruthy()
    })
  })

  describe('remove 的 undo/redo', () => {
    it('remove → undo 后组件回到原索引；redo 后再次删除', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'rm-1' }))
      vi.advanceTimersByTime(2000)
      const idxBefore = editor.components.findIndex(c => c.id === 'rm-1')

      editor.removeElement('rm-1')
      expect(editor.components.find(c => c.id === 'rm-1')).toBeFalsy()

      history.undo()
      const idxAfter = editor.components.findIndex(c => c.id === 'rm-1')
      expect(idxAfter).toBe(idxBefore)

      history.redo()
      expect(editor.components.find(c => c.id === 'rm-1')).toBeFalsy()
    })
  })

  describe('reorder 的 undo/redo', () => {
    it('reorder → undo 后顺序还原；redo 后顺序再次交换', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'r-1' }))
      vi.advanceTimersByTime(2000)
      editor.addComponent(createImageComponent({ id: 'r-2' }))
      vi.advanceTimersByTime(2000)

      const idx1 = editor.components.findIndex(c => c.id === 'r-1')
      const idx2 = editor.components.findIndex(c => c.id === 'r-2')

      editor.reorder(idx1, idx2)
      expect(editor.components.findIndex(c => c.id === 'r-1')).toBe(idx2)

      history.undo()
      expect(editor.components.findIndex(c => c.id === 'r-1')).toBe(idx1)
      expect(editor.components.findIndex(c => c.id === 'r-2')).toBe(idx2)

      history.redo()
      expect(editor.components.findIndex(c => c.id === 'r-1')).toBe(idx2)
    })
  })

  describe('updateComp 的 undo/redo', () => {
    it('updateCompProp(props) → undo/redo 切换属性值', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'u-1' }))
      vi.advanceTimersByTime(2000)

      editor.updateCompProp('opacity', '0.5', 'u-1')
      expect(editor.components.find(c => c.id === 'u-1')?.props.opacity).toBe('0.5')

      history.undo()
      // imageDefaultProps.opacity 默认值 = '1'
      expect(editor.components.find(c => c.id === 'u-1')?.props.opacity).toBe('1')

      history.redo()
      expect(editor.components.find(c => c.id === 'u-1')?.props.opacity).toBe('0.5')
    })

    it('updateCompData(compData) → undo/redo 切换 layerName', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'u-2', layerName: '原图层' }))
      vi.advanceTimersByTime(2000)

      editor.updateCompData('layerName', '新图层', 'u-2')
      expect(editor.components.find(c => c.id === 'u-2')?.layerName).toBe('新图层')

      history.undo()
      expect(editor.components.find(c => c.id === 'u-2')?.layerName).toBe('原图层')

      history.redo()
      expect(editor.components.find(c => c.id === 'u-2')?.layerName).toBe('新图层')
    })
  })

  describe('updatePage 的 undo/redo', () => {
    it('updatePageProp → undo/redo 切换 backgroundColor', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      const oldColor = editor.pageProps.backgroundColor

      editor.updatePageProp('backgroundColor', '#ff0000')
      expect(editor.pageProps.backgroundColor).toBe('#ff0000')

      history.undo()
      expect(editor.pageProps.backgroundColor).toBe(oldColor)

      history.redo()
      expect(editor.pageProps.backgroundColor).toBe('#ff0000')
    })

    it('updatePageData → undo/redo 切换 title', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      const oldTitle = editor.pageData.title

      editor.updatePageData('title', '新标题')
      expect(editor.pageData.title).toBe('新标题')

      history.undo()
      expect(editor.pageData.title).toBe(oldTitle)

      history.redo()
      expect(editor.pageData.title).toBe('新标题')
    })
  })

  describe('batch (compose 包裹) 的 undo/redo', () => {
    it('batchUpdate 内多次操作 → 一次 undo 全部反序回滚；一次 redo 全部前进', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()

      editor.batchUpdate(() => {
        editor.addComponent(createImageComponent({ id: 'b-1' }))
        editor.addComponent(createImageComponent({ id: 'b-2' }))
      })

      // history 中应有一条 batch 在栈顶
      expect((history.histories[history.historyIndex] as { actionType: string }).actionType).toBe('batch')
      expect(editor.components.find(c => c.id === 'b-1')).toBeTruthy()
      expect(editor.components.find(c => c.id === 'b-2')).toBeTruthy()

      history.undo()
      expect(editor.components.find(c => c.id === 'b-1')).toBeFalsy()
      expect(editor.components.find(c => c.id === 'b-2')).toBeFalsy()

      history.redo()
      expect(editor.components.find(c => c.id === 'b-1')).toBeTruthy()
      expect(editor.components.find(c => c.id === 'b-2')).toBeTruthy()
    })
  })

  describe('isApplying 重入保护', () => {
    it('undo 期间 editor 反向调用不会再次入栈', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'reentry-1' }))
      vi.advanceTimersByTime(2000)

      const lengthBefore = history.histories.length
      history.undo()
      // undo 内部触发 editor.removeElement，editor 又会尝试 push 一条 remove
      // 但 isApplying=true 守卫住，最终 histories 长度不变
      expect(history.histories.length).toBe(lengthBefore)
    })
  })

  describe('dirty 与 markSaved（基于历史游标版本）', () => {
    it('空栈 isDirty=false；编辑后置脏；markSaved 后变干净', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()

      expect(history.isDirty).toBe(false)

      editor.addComponent(createImageComponent({ id: 'dirty-1' }))
      expect(history.isDirty).toBe(true)

      history.markSaved(history.currentVersionId)
      expect(history.isDirty).toBe(false)
    })

    it('保存后 undo 回到保存点变干净，redo 离开保存点又变脏', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()

      editor.addComponent(createImageComponent({ id: 'dirty-a' }))
      history.markSaved(history.currentVersionId) // 在 a 处保存
      expect(history.isDirty).toBe(false)

      vi.advanceTimersByTime(2000)
      editor.addComponent(createImageComponent({ id: 'dirty-b' }))
      expect(history.isDirty).toBe(true)

      history.undo() // 回到保存点 a
      expect(history.isDirty).toBe(false)

      history.redo() // 前进到 b，离开保存点
      expect(history.isDirty).toBe(true)
    })

    it('clear 后 isDirty=false', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()

      editor.addComponent(createImageComponent({ id: 'dirty-clear' }))
      expect(history.isDirty).toBe(true)

      history.clear()
      expect(history.isDirty).toBe(false)
    })
  })

  describe('合并闸门：非脏（已保存版本）不并入栈顶', () => {
    it('脏状态下同属性编辑合并到栈顶（不新增记录）', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'merge-1' }))
      editor.updateCompProp('opacity', '0.5', 'merge-1') // 记录 B（updateComp）

      const lenBefore = history.histories.length
      editor.updateCompProp('opacity', '0.7', 'merge-1') // 脏 + 同属性 + 时间窗内 → 合并进 B
      expect(history.histories.length).toBe(lenBefore)
    })

    it('markSaved 后同属性编辑不合并，而是提交新记录并重新置脏', () => {
      const history = useHistoryStore()
      const editor = useEditorStore()
      editor.addComponent(createImageComponent({ id: 'merge-2' }))
      editor.updateCompProp('opacity', '0.5', 'merge-2') // 记录 B

      const lenBeforeSave = history.histories.length
      history.markSaved(history.currentVersionId) // 在 B 处保存
      expect(history.isDirty).toBe(false)

      // 同属性、时间窗内：仅靠 isDirty 闸门阻止合并 → 应提交新记录
      editor.updateCompProp('opacity', '0.7', 'merge-2')
      expect(history.histories.length).toBe(lenBeforeSave + 1)
      expect(history.isDirty).toBe(true)
    })
  })
})
