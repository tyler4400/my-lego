import type { VNodeChild } from 'vue'
import type { AllFormProps, CompFieldKey } from '@/types/editor.ts'
import { BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons-vue'
import { isNumber, isString } from '@my-lego/shared'
import { Col, InputNumber, RadioButton, RadioGroup, Row, Select, SelectOption, Slider, Textarea } from 'ant-design-vue'
import { commonDefaultProps } from '@/components'
import ColorPicker from '@/components/ColorPicker'
import IconSwitch from '@/components/IconSwitch'
import ImageProcesser from '@/components/ImageProcesser'

export interface FieldRenderContext<TValue = any> {
  /** 当前字段 key，比如 'fontSize' */
  key: CompFieldKey
  /** 传给 render 的“内部值”，是否做转换由 fromProps 决定 */
  value: TValue
  /** 通知外部值变更，是否做转换由 toProps 决定. 可自定义key，默认为当前对象的key */
  onChange: (val: TValue, key?: CompFieldKey) => void
  /** 当前组件的原始 props（用于某些字段间联动时可选使用） */
  rawProps: Partial<AllFormProps>
}

/**
 * 字段配置：
 *  - label：右侧属性面板显示的名称
 *  - visible: 是否显示。 若为false，则会display: none
 *  - render：完全由使用者控制如何渲染这个字段
 *  - fromProps / toProps：可选的“原始 props ↔ 内部值”转换函数
 */
export interface FieldConfig<TValue = any> {
  label?: string
  visible?: (rawProps: Partial<AllFormProps>) => boolean
  render: (ctx: FieldRenderContext<TValue>) => VNodeChild
  fromProps?: (raw: any, rawProps: Partial<AllFormProps>, key: CompFieldKey) => TValue
  toProps?: (val: TValue, rawProps: Partial<AllFormProps>, key: CompFieldKey) => any
}

export type PropsToForms = Partial<Record<CompFieldKey, FieldConfig | FieldConfig[]>>

const fontFamilyTemplates = [
  { label: '默认', value: '' },
  { label: '宋体', value: '"SimSun","STSong"' },
  { label: '黑体', value: '"SimHei","STHeiti"' },
  { label: '楷体', value: '"KaiTi","STKaiti"' },
  { label: '仿宋', value: '"FangSong","STFangsong"' },
]

const textAlignOptions = [
  { label: '左', value: 'left' },
  { label: '中', value: 'center' },
  { label: '右', value: 'right' },
]

const backgroundSizeOptions = [
  { label: '填充', value: 'cover' },
  { label: '包含', value: 'contain' },
  { label: '自动', value: 'auto' },
]

const borderStyleOptions = [
  { label: '无', value: 'none' },
  { label: '实线', value: 'solid' },
  { label: '破折线', value: 'dashed' },
  { label: '点状线', value: 'dotted' },
]

const backgroundRepeatOptions = [
  { label: '不重复', value: 'no-repeat' },
  { label: '横向重复', value: 'repeat-x' },
  { label: '纵向重复', value: 'repeat-y' },
  { label: '平铺', value: 'repeat' },
]

const actionTypeOptions = [
  { label: '无', value: '' },
  { label: '跳转链接', value: 'url' },
]

const numberToPx = (val: number | undefined) => {
  if (!isNumber(val)) return ''
  return `${val}px`
}

const pxToNumber = (raw: any) => {
  if (!isString(raw)) return undefined
  const parsed = Number.parseInt(raw, 10)
  return Number.isNaN(parsed) ? undefined : parsed
}

const pxToNumberFieldConfig: () => Omit<FieldConfig<number | undefined>, 'label'> = () => ({
  render: ({ value, onChange }) => (
    <InputNumber
      value={value}
      onChange={val => onChange(val as number)}
      addonAfter="px"
    />
  ),
  // 可以使用toProps/fromProps来转换value，也可以直接在render中完成。这里保留一个示例
  toProps: numberToPx,
  fromProps: pxToNumber,
})

export interface BoxShadowValue {
  offset: number
  blur: number
  color: string
}

/**
 *       // box shadow should like this
 *       // 10px 10px 0px red;
 *       // the first two should be sizes
 *       // the 3rd one should be blur
 *       // the last one should be color
 *
 *  约定 boxShadow 为 `offsetX offsetY blur color`。
 * “阴影尺寸”会同时控制前两个 offset 值。
 */
const parserBoxShadow = (raw: string): BoxShadowValue => {
  const rawVal = (!isString(raw) || !raw.trim()) ? commonDefaultProps.boxShadow : raw

  const [offsetX = '0', offsetY = offsetX, blur = '0', ...color] = rawVal.trim().split(/\s+/)

  return {
    offset: pxToNumber(offsetX) ?? pxToNumber(offsetY) ?? 0,
    blur: pxToNumber(blur) ?? 0,
    color: color?.join?.(' ') || '#000000',
  }
}

const stringifyBoxShadow = (val: BoxShadowValue) => {
  const offset = numberToPx(val.offset) || '0px'
  const blur = numberToPx(val.blur) || '0px'
  const color = val.color || '#000000'

  return `${offset} ${offset} ${blur} ${color}`
}

const patchBoxShadow = (rawProps: Partial<AllFormProps>, patch: Partial<BoxShadowValue>) => {
  return stringifyBoxShadow({
    ...parserBoxShadow(rawProps.boxShadow ?? commonDefaultProps.boxShadow),
    ...patch,
  })
}

export const mapPropsToForms: PropsToForms = {
  text: {
    label: '文本',
    // 不做 fromProps/toProps，直接在 render 里处理原始 string
    render: ({ value, onChange }) => (
      <Textarea
        rows={3}
        value={value as string | undefined}
        onChange={e => onChange(e.target.value)}
      />
    ),
  },

  fontSize: {
    ...pxToNumberFieldConfig(),
    label: '字号',
  },

  lineHeight: {
    label: '行高',
    fromProps: (raw) => {
      if (raw == null) return undefined
      const num = Number.parseFloat(String(raw))
      return Number.isNaN(num) ? undefined : num
    },
    toProps: (val) => {
      if (!isNumber(val)) return ''
      return val.toString()
    },
    render: ({ value, onChange }) => (
      <Row gutter={8}>
        <Col span="12">
          <Slider
            min={0}
            max={3}
            step={0.1}
            value={value}
            onChange={val => onChange(val)}
          />
        </Col>
        <Col span="12">
          <InputNumber
            min={0}
            max={3}
            step={0.1}
            value={value}
            onChange={val => onChange(val as number)}
          />
        </Col>
      </Row>
    ),
  },

  textAlign: {
    label: '对齐方式',
    // 不用 fromProps/toProps，直接把原始 string 当成 value
    render: ({ value, onChange }) => (
      <RadioGroup
        buttonStyle="solid"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
      >
        {textAlignOptions.map(opt => (
          <RadioButton key={opt.value} value={opt.value}>
            {opt.label}
          </RadioButton>
        ))}
      </RadioGroup>
    ),
  },

  fontFamily: {
    label: '字体',
    render: ({ value, onChange }) => (
      <Select
        style={{ width: '100%' }}
        value={value}
        onChange={val => onChange(val)}
      >
        {fontFamilyTemplates.map(opt => (
          <SelectOption key={opt.value} value={opt.value}>
            <span style={{ fontFamily: opt.value || undefined }}>
              {opt.label}
            </span>
          </SelectOption>
        ))}
      </Select>
    ),
  },

  color: {
    label: '文字颜色',
    render: ({ value, onChange }) => (
      <ColorPicker
        value={value}
        onChange={(val: string) => onChange(val)}
      />
    ),
  },

  backgroundColor: {
    label: '背景颜色',
    render: ({ value, onChange }) => (
      <ColorPicker
        value={value}
        onChange={(val: string) => onChange(val)}
      />
    ),
  },

  fontWeight: {
    label: '粗体',
    render: ({ value, onChange }) => (
      <IconSwitch
        checked={value === 'bold'}
        tip="加粗"
        icon={<BoldOutlined />}
        onChange={checked => onChange(checked ? 'bold' : 'normal')}
      />
    ),
  },

  fontStyle: {
    label: '斜体',
    render: ({ value, onChange }) => (
      <IconSwitch
        checked={value === 'italic'}
        tip="斜体"
        icon={<ItalicOutlined />}
        onChange={checked => onChange(checked ? 'italic' : 'normal')}
      />
    ),
  },

  textDecoration: {
    label: '下划线',
    render: ({ value, onChange }) => (
      <IconSwitch
        checked={value === 'underline'}
        tip="下划线"
        icon={<UnderlineOutlined />}
        onChange={checked => onChange(checked ? 'underline' : 'normal')}
      />
    ),
  },
  src: {
    // label: '图片',
    render: ({ value, onChange }) => (
      <ImageProcesser
        value={value}
        showDelete
        ratio={0}
        onChange={url => onChange(url)}
      />
    ),
  },
  width: {
    ...pxToNumberFieldConfig(),
    label: '宽度',
  },
  height: {
    ...pxToNumberFieldConfig(),
    label: '高度',
  },
  paddingLeft: {
    ...pxToNumberFieldConfig(),
    label: '左边距',
  },
  paddingRight: {
    ...pxToNumberFieldConfig(),
    label: '右边距',
  },
  paddingTop: {
    ...pxToNumberFieldConfig(),
    label: '上边距',
  },
  paddingBottom: {
    ...pxToNumberFieldConfig(),
    label: '下边距',
  },
  borderWidth: {
    ...pxToNumberFieldConfig(),
    label: '边框宽度',
    visible: rawProps => rawProps.borderStyle !== 'none',
  },
  borderRadius: {
    label: '边框圆角',
    fromProps: pxToNumber,
    toProps: numberToPx,
    visible: rawProps => rawProps.borderStyle !== 'none',
    render: ({ value, onChange }) => (
      <Row gutter={8}>
        <Col span="12">
          <Slider
            min={0}
            max={100}
            tipFormatter={numberToPx}
            value={value}
            onChange={val => onChange(val)}
          />
        </Col>
        <Col span="12">
          <InputNumber
            min={0}
            max={100}
            value={value}
            onChange={val => onChange(val as number)}
            addonAfter="px"
          />
        </Col>
      </Row>
    ),
  },
  borderStyle: {
    label: '边框类型',
    render: ({ value, onChange }) => (
      <Select
        style={{ width: '100%' }}
        value={value}
        onChange={val => onChange(val)}
      >
        {borderStyleOptions.map(opt => (
          <SelectOption key={opt.value} value={opt.value}>
            <span style={{ borderStyle: opt.value || undefined }}>
              {opt.label}
            </span>
          </SelectOption>
        ))}
      </Select>
    ),
  },
  borderColor: {
    label: '边框颜色',
    visible: rawProps => rawProps.borderStyle !== 'none',
    render: ({ value, onChange }) => (
      <ColorPicker
        value={value}
        onChange={(val: string) => onChange(val)}
      />
    ),
  },
  left: {
    ...pxToNumberFieldConfig(),
    label: 'X轴坐标',
  },
  top: {
    ...pxToNumberFieldConfig(),
    label: 'Y轴坐标',
  },
  boxShadow: [
    {
      label: '阴影颜色',
      fromProps: (raw) => {
        return parserBoxShadow(raw).color
      },
      toProps: (val, rawProps) => {
        return patchBoxShadow(rawProps, { color: val })
      },
      render: ({ value, onChange }) => (
        <ColorPicker
          value={value}
          onChange={(val: string) => onChange(val)}
        />
      ),
    },
    {
      label: '阴影大小',
      fromProps: (raw) => {
        return parserBoxShadow(raw).offset
      },
      toProps: (val, rawProps) => {
        return patchBoxShadow(rawProps, { offset: val })
      },
      render: ({ value, onChange }) => (
        <Row gutter={8}>
          <Col span="12">
            <Slider
              min={0}
              max={20}
              tipFormatter={numberToPx}
              value={value}
              onChange={val => onChange(val)}
            />
          </Col>
          <Col span="12">
            <InputNumber
              min={0}
              max={20}
              value={value}
              onChange={val => onChange(val as number)}
              addonAfter="px"
            />
          </Col>
        </Row>
      ),
    },
    {
      label: '阴影模糊',
      fromProps: (raw) => {
        return parserBoxShadow(raw).blur
      },
      toProps: (val, rawProps) => {
        return patchBoxShadow(rawProps, { blur: val })
      },
      render: ({ value, onChange }) => (
        <Row gutter={8}>
          <Col span="12">
            <Slider
              min={0}
              max={20}
              tipFormatter={numberToPx}
              value={value}
              onChange={val => onChange(val)}
            />
          </Col>
          <Col span="12">
            <InputNumber
              min={0}
              max={20}
              value={value}
              onChange={val => onChange(val as number)}
              addonAfter="px"
            />
          </Col>
        </Row>
      ),
    },
  ],
  opacity: {
    label: '透明度',
    render: ({ value, onChange }) => {
      const num = Number.parseFloat(String(value))
      const valFromProp = Number.isNaN(num) ? 100 : (num * 100)

      return (
        <Row gutter={8}>
          <Col span="12">
            <Slider
              min={0}
              max={100}
              tipFormatter={val => `${(val ?? 100)}%`}
              value={valFromProp}
              onChange={val => onChange(`${val as number / 100}`)}
            />
          </Col>
          <Col span="12">
            <InputNumber
              min={0}
              max={100}
              addonAfter="%"
              value={valFromProp}
              onChange={val => onChange(`${val as number / 100}`)}
            />
          </Col>
        </Row>
      )
    },
  },
  actionType: {
    label: '动作类型',
    render: ({ value, onChange }) => (
      <Select
        style={{ width: '100%' }}
        value={value}
        onChange={val => onChange(val)}
      >
        {actionTypeOptions.map(opt => (
          <SelectOption key={opt.value} value={opt.value}>
            {opt.label}
          </SelectOption>
        ))}
      </Select>
    ),
  },
  url: {
    label: '链接地址',
    visible: rawProps => rawProps.actionType === 'url',
    render: ({ value, onChange }) => (
      <Textarea
        rows={2}
        value={value as string | undefined}
        onChange={e => onChange(e.target.value)}
      />
    ),
  },
  backgroundImage: {
    render: ({ value, onChange }) => (
      <ImageProcesser
        value={value}
        showDelete
        ratio={0}
        onChange={url => onChange(url)}
      />
    ),
  },
  backgroundRepeat: {
    label: '背景重复',
    render: ({ value, onChange }) => (
      <Select
        style={{ width: '100%' }}
        value={value}
        onChange={val => onChange(val)}
      >
        {backgroundRepeatOptions.map(opt => (
          <SelectOption key={opt.value} value={opt.value}>
            <span>
              {opt.label}
            </span>
          </SelectOption>
        ))}
      </Select>
    ),
  },
  backgroundSize: {
    label: '背景大小',
    render: ({ value, onChange }) => (
      <RadioGroup
        buttonStyle="solid"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
      >
        {backgroundSizeOptions.map(opt => (
          <RadioButton key={opt.value} value={opt.value}>
            {opt.label}
          </RadioButton>
        ))}
      </RadioGroup>
    ),
  },
}
