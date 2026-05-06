import type { CompFieldKey, ComponentData, EditableCompField, EditablePageField, PageProps } from '@/types/editor.ts'

/**
 * 各 actionType 对应的 payload 形状（不含 id 和 actionType 自身）
 * 这是单一数据源：未来新增动作类型只需在此扩展一项
 */
export interface ActionPayloadMap {
  add: {
    componentId: string
    data: ComponentData
  }
  // 删除组件（保存原位置以便 undo 插回）
  delete: {
    componentId: string
    data: ComponentData
    index: number
  }
  // 调整图层顺序
  reorder: {
    data: { startIndex: number, endIndex: number }
  }
  // 修改组件级字段：props.xxx 或 ComponentData 自身字段（layerName/isHidden/isLocked）
  updateComp: {
    componentId: string
    target: 'props' | 'compData'
    data: {
      key: CompFieldKey | EditableCompField
      oldValue: any
      newValue: any
    }
  }
  // 修改页面级字段：PageProps.xxx 或 PageData 自身字段
  updatePage: {
    target: 'props' | 'pageData'
    data: {
      key: keyof PageProps | EditablePageField
      oldValue: any
      newValue: any
    }
  }
}

/**
 * 单条历史记录的联合类型
 * actionType 与对应 payload 一一绑定，在 switch (h.actionType) 中可被自动收窄
 */
export type ActionHistory = {
  [K in keyof ActionPayloadMap]: { id: string, actionType: K } & ActionPayloadMap[K]
}[keyof ActionPayloadMap]

/**
 * 去除Id，入栈时 的类型
 */
export type ActionHistoryInput = {
  [K in keyof ActionPayloadMap]: { actionType: K } & ActionPayloadMap[K]
}[keyof ActionPayloadMap]
