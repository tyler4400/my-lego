export interface WorkContent {
  /** 画布组件列表 */
  components: ComponentData[]
  /** 未来扩展：page/bodyStyle/meta...（先不做） */
  props?: Record<string, string | number>
}

/**
 * SSR 渲染所需的最小组件数据结构。
 *
 * 说明：
 * - 这里刻意不从 `@/components` 里 re-export 类型，避免 `vite-plugin-dts` 在打包 d.ts 时
 *   生成类似 `../components` 的悬空导入（dist-ssr 产物目录下并不存在对应路径）。
 * - 该类型仅用于 SSR 输入数据的“形状约束”，与前端编辑器内部更细的 props 类型解耦。
 */
export interface ComponentData {
  /** 组件实例 id（uuid v4 或其它唯一标识） */
  id: string
  /** 业务组件名（与 `componentMap` 的 key 保持一致） */
  name: 'LText' | 'LImage' | (string & {})
  /**
   * 组件 props（SSR 侧只需要可序列化的普通对象即可）
   * - 渲染时会被透传到具体组件
   */
  props?: Record<string, unknown>
}
