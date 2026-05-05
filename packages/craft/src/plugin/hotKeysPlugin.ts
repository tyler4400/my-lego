import type { HotkeysEvent, KeyHandler } from 'hotkeys-js'
import { isNumber } from '@my-lego/shared'
import { message } from 'ant-design-vue'
import useHotKey from '@/hooks/useHotKey.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { numberToPx, pxToNumber } from '@/utils/utils.ts'

const preventDefaultWrap = (callback: KeyHandler) => {
  return (e: KeyboardEvent, event: HotkeysEvent) => {
    e.preventDefault()
    callback(e, event)
  }
}

export default function initHotKeys() {
  const editorStore = useEditorStore()

  useHotKey('ctrl+c, command+c', () => {
    const flag = editorStore.copyElement()
    if (flag) {
      message.success('已复制当前元素')
    }
    else {
      message.warn('请先选择当前想要复制的元素')
    }
  })

  useHotKey('ctrl+v, command+v', () => {
    const flag = editorStore.pasteElement()
    if (flag) {
      message.success('已粘贴当前元素')
    }
    else {
      message.warn('没有可以粘贴的元素')
    }
  })

  useHotKey('delete, backspace', () => {
    editorStore.removeElement()
  })

  useHotKey('esc', () => {
    editorStore.setCurrentElement(undefined)
  })

  useHotKey('up', preventDefaultWrap(() => {
    const current = pxToNumber(editorStore.currentElement?.props?.top)
    if (isNumber(current)) {
      editorStore.updateCompProp('top', numberToPx(current - 1))
    }
  }))

  useHotKey('down', preventDefaultWrap(() => {
    const current = pxToNumber(editorStore.currentElement?.props?.top)
    if (isNumber(current)) {
      editorStore.updateCompProp('top', numberToPx(current + 1))
    }
  }))

  useHotKey('left', preventDefaultWrap(() => {
    const current = pxToNumber(editorStore.currentElement?.props?.left)
    if (isNumber(current)) {
      editorStore.updateCompProp('left', numberToPx(current - 1))
    }
  }))

  useHotKey('right', preventDefaultWrap(() => {
    const current = pxToNumber(editorStore.currentElement?.props?.left)
    if (isNumber(current)) {
      editorStore.updateCompProp('left', numberToPx(current + 1))
    }
  }))
}
