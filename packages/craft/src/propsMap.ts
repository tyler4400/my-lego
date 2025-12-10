import type { Component } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { Input, InputNumber, RadioButton, RadioGroup, Select, SelectOption, Slider } from 'ant-design-vue'

export interface PropsToForm {
  component: Component
  subComponent?: Component // 组件可能有子组件，例如Select - SelectOption。 后面重构的时候应该会被vnode替换掉
  options?: { label: string, value: string }[] // 有的组件是选项
  value?: string
  extraProps?: Record<string, any> // 组件额外参数
  label?: string // 表单项名称
  transferVal?: (val?: string) => any // 有的value可能需要转换
  valueKey?: string // 有的组件状态可能不叫 'value'， 例如CheckBox的状态是checked 所以新加此字段来指定value的名称. 默认value
  eventName?: string // 组件修改value的时候发射事件的名称
}

export type PropsToForms = Partial<Record<keyof TextComponentProps, PropsToForm>>

export const mapPropsToForms: PropsToForms = {
  text: {
    label: '文本',
    component: Input,
    extraProps: {
      rows: 3,
    },
  },
  fontSize: {
    label: '字号',
    component: InputNumber,
    transferVal: (v?: string) => v === undefined ? undefined : Number.parseInt(v),
  },
  lineHeight: {
    label: '行高',
    component: Slider,
    extraProps: {
      min: 0,
      max: 3,
      step: 0.1,
    },
    transferVal: (v?: string) => v === undefined ? undefined : Number.parseFloat(v),
  },
  textAlign: {
    label: '对齐方式',
    component: RadioGroup,
    subComponent: RadioButton,
    extraProps: { buttonStyle: 'solid' },
    options: [
      {
        label: '左',
        value: 'left',
      },
      {
        label: '中',
        value: 'center',
      },
      {
        label: '右',
        value: 'right',
      },
    ],
  },
  fontFamily: {
    label: '字体',
    component: Select,
    subComponent: SelectOption,
    options: [
      {
        label: '默认',
        value: '',
      },
      {
        label: '微软雅黑',
        value: 'Microsoft YaHei',
      },
      {
        label: '宋体',
        value: 'SimSun',
      },
      {
        label: 'Arial',
        value: 'Arial',
      },
    ],
  },
}
