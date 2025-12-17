import type { ImageComponentProps, TextComponentProps } from '@/defaultProps.ts'
import type { componentMap } from '@/stores/editor.ts'

export interface EditorProps {
  // 供中间编辑器渲染的数组
  components: ComponentData[]
  // 当前编辑的是哪个元素，uuid
  currentElement: string
  // 当然最后保存的时候还有有一些项目信息，这里并没有写出，等做到的时候再补充
}
export interface ComponentData {
  // 这个元素的 属性，属性请详见下面
  props: Partial<TextComponentProps | ImageComponentProps>
  // id，uuid v4 生成
  id: string
  // 业务组件库名称 c-text，c-image 等等
  name: keyof typeof componentMap
}
