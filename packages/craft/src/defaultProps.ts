import { mapValues, without } from 'lodash-es'

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
  opacity: number

  // position and x,y
  position: string
  left: string
  top: string
  right: string
}

/**
 * 通用默认属性对象，实现 CommonComponentProps 接口
 */
export const commonDefaultProps: CommonComponentProps = {
  // actions
  actionType: '',
  url: '',

  // size
  height: '',
  width: '318px',
  paddingLeft: '0px',
  paddingRight: '0px',
  paddingTop: '0px',
  paddingBottom: '0px',

  // border type
  borderStyle: 'none',
  borderColor: '#000',
  borderWidth: '0',
  borderRadius: '0',

  // shadow and opacity
  boxShadow: '0 0 0 #000000',
  opacity: 1,

  // position and x,y
  position: 'absolute',
  left: '0',
  top: '0',
  right: '0',
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

/**
 * 文本组件默认属性对象，实现 TextComponentProps 接口
 */
export const textDefaultProps: TextComponentProps = {
  ...commonDefaultProps,

  text: '正文内容',

  // basic props - font styles
  fontSize: '14px',
  fontFamily: '',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  lineHeight: '1',
  textAlign: 'left',
  color: '#000000',
  backgroundColor: '',
}

/**
 * 将属性对象转换为 Vue 运行时 props 声明所需的对象结构
 * 目前在部分组件中使用泛型 props 声明，该方法保留用于兼容课程原始写法
 */
export function transformToComponentProps(props: TextComponentProps) {
  return mapValues(props, (item) => {
    return {
      // 根据默认值推断构造器类型（string 或 number）
      type: item.constructor as StringConstructor | NumberConstructor,
      default: item,
    }
  })
}

/**
 * 文本组件的运行时 props 类型定义（课程原始写法中使用）
 */
export const textPropType = transformToComponentProps(textDefaultProps)

/**
 * 参与样式计算的文本组件属性 key 列表
 * 用于从 props 中挑选出会体现在 style 上的字段
 */
export const textStylePropsKeys = without(Object.keys(textDefaultProps), 'actionType', 'url', 'text')
