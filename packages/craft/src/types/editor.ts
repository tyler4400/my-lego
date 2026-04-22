import type { ComponentKey } from '@/components'

export interface EditorProps {
  // 供中间编辑器渲染的数组
  components: ComponentData[]
  // 当前编辑的是哪个元素，uuid
  currentElement: string
  // 当然最后保存的时候还有有一些项目信息，这里并没有写出，等做到的时候再补充
}

export interface ComponentData {
  // id，uuid v4 生成 对应backend 数据库里的组件 id
  id: string
  // 这个元素的 属性，属性请详见下面
  props: Partial<AllComponentProps>
  // 业务组件库名称 LText，LImage 等等，相当于是key。 真正的组件名称是layerName
  name: ComponentKey
  // 组件是否隐藏
  isHidden?: boolean
  // 组件是否锁定
  isLocked?: boolean
  // 组件名称
  layerName?: string
}

export type EditableCompField = keyof Omit<ComponentData, 'id' | 'props' | 'name'>

/**
 * 通用组件属性类型定义
 * 使用显式 interface，避免 typeof 查询在 Vue 宏中被解析为 TSTypeQuery
 */
export interface CommonComponentProps {
  // actions
  actionType: string
  url: string

  // size
  height: string
  width: string
  paddingLeft: string
  paddingRight: string
  paddingTop: string
  paddingBottom: string

  // border type
  borderStyle: string
  borderColor: string
  borderWidth: string
  borderRadius: string

  // shadow and opacity
  boxShadow: string
  opacity: string

  // position and x,y
  position: string
  left: string
  top: string
  right: string
}

/**
 * 文本组件专用属性类型，基于 CommonComponentProps 扩展
 */
export interface TextComponentProps extends CommonComponentProps {
  text: string

  // basic props - font styles
  fontSize: string
  fontFamily: string
  fontWeight: string
  fontStyle: string
  textDecoration: string
  lineHeight: string
  textAlign: string
  color: string
  backgroundColor: string
}

export interface ImageComponentProps extends CommonComponentProps {
  src: string
  naturalWidth?: number
  naturalHeight?: number
}

/**
 * 整个页面的props
 */
export interface PageProps {
  backgroundColor: string
  backgroundImage: string
  backgroundRepeat: string
  backgroundSize: string
  height: string
}

export type AllComponentProps = TextComponentProps & ImageComponentProps & PageProps

export type CompFieldKey = keyof AllComponentProps
