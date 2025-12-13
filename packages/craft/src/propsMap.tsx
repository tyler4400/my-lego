import type { Component, VNode } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons-vue'
import { InputNumber, RadioButton, RadioGroup, Select, SelectOption, Slider, Textarea } from 'ant-design-vue'
import ColorPicker from '@/components/ColorPicker'
import IconSwitch from '@/components/IconSwitch'

export interface PropsToForm {
  /**
   *  todo
   *  针对于component和subComponent这样的写写法， map还是依赖于PropsTable组件中的结构
   *  我的想法是只暴露一个component即可， 在mapPropsToForms中使用jsx拼接好想要的结构，在外部组件只需要渲染这一个vnode即可
   */
  component: Component
  subComponent?: Component // 组件可能有子组件，例如Select - SelectOption。 后面重构的时候应该会被vnode替换掉
  options?: { label: string | VNode, value: string }[] // 有的组件是选项
  extraProps?: Record<string, any> // 组件额外参数
  label?: string // 表单项名称
  transferVal?: (val?: string) => any // 将value转换为组件的数据格式
  parseVal?: (val?: any) => any // 将组件值转换为表单数据格式

  /* 数据流 */
  valueKey?: string // 有的组件状态可能不叫 'value'， 例如CheckBox的状态是checked 所以新加此字段来指定value的名称. 默认value
  eventName?: string // 组件修改value的时候发射事件的名称
}

export type PropsToForms = Partial<Record<keyof TextComponentProps, PropsToForm>>

const fontFamilyTemplates = [
  { label: '默认', value: '' },
  { label: '宋体', value: '"SimSun","STSong"' },
  { label: '黑体', value: '"SimHei","STHeiti"' },
  { label: '楷体', value: '"KaiTi","STKaiti"' },
  { label: '仿宋', value: '"FangSong","STFangsong"' },
]
const fontFamilyOptions: PropsToForm['options'] = fontFamilyTemplates.map(item => ({
  value: item.value,
  label: (
    <span style={{ fontFamily: item.value || undefined }}>{item.label}</span>
  ),
}))

export const mapPropsToForms: () => PropsToForms = () => ({
  text: {
    label: '文本',
    component: Textarea,
    extraProps: {
      rows: 3,
    },
    parseVal: (e: any) => e.target.value,
  },
  fontSize: {
    label: '字号',
    component: InputNumber,
    transferVal: (v?: string) => v === undefined ? undefined : Number.parseInt(v),
    parseVal: (e: any) => (e ? `${e}px` : ''),
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
    parseVal: (e: any) => e.toString(),
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
    parseVal: (e: any) => e.target.value,
  },
  fontFamily: {
    label: '字体',
    component: Select,
    subComponent: SelectOption,
    options: fontFamilyOptions,
  },
  color: {
    label: '文字颜色',
    component: ColorPicker,
  },
  backgroundColor: {
    label: '背景颜色',
    component: ColorPicker,
  },
  fontWeight: {
    label: '粗体',
    component: IconSwitch,
    valueKey: 'checked',
    /**
     * 不能这样写：extraProps: { tip: '加粗', icon: BoldOutlined },
     * <BoldOutlined /> 会被编译为h(BoldOutlined, null, null)  // 一个 VNode 对象
     * 而如果直接写icon: BoldOutlined， 就是直接对象或函数本身。
     * 所以下面要么写<BoldOutlined />，tsx帮忙转成h(BoldOutlined)，或者直接写h(BoldOutlined)
     */
    extraProps: { tip: '加粗', icon: <BoldOutlined /> },
    transferVal: (v?: string) => v === 'bold',
    parseVal: (e: boolean) => e ? 'bold' : 'normal',
  },
  fontStyle: {
    label: '斜体',
    component: IconSwitch,
    valueKey: 'checked',
    extraProps: { tip: '斜体', icon: <ItalicOutlined /> },
    transferVal: (v?: string) => v === 'italic',
    parseVal: (e: boolean) => e ? 'italic' : 'normal',
  },
  textDecoration: {
    label: '下划线',
    component: IconSwitch,
    valueKey: 'checked',
    extraProps: { tip: '下划线', icon: <UnderlineOutlined /> },
    transferVal: (v?: string) => v === 'underline',
    parseVal: (e: boolean) => e ? 'underline' : 'normal',
  },
})
