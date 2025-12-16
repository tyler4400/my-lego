import type { VNode } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { BoldOutlined, ItalicOutlined, UnderlineOutlined } from '@ant-design/icons-vue'
import { isNumber, isString } from '@my-lego/shared'
import { InputNumber, RadioButton, RadioGroup, Select, SelectOption, Slider, Textarea } from 'ant-design-vue'
import ColorPicker from '@/components/ColorPicker'
import IconSwitch from '@/components/IconSwitch'

export interface FieldRenderContext<TValue = any> {
  /** 当前字段 key，比如 'fontSize' */
  key: keyof TextComponentProps
  /** 传给 render 的“内部值”，是否做转换由 fromProps 决定 */
  value: TValue
  /** 通知外部值变更，是否做转换由 toProps 决定 */
  onChange: (val: TValue) => void
  /** 当前组件的原始 props（用于某些字段间联动时可选使用） */
  rawProps: Partial<TextComponentProps>
}

/**
 * 字段配置：
 *  - label：右侧属性面板显示的名称
 *  - render：完全由使用者控制如何渲染这个字段
 *  - fromProps / toProps：可选的“原始 props ↔ 内部值”转换函数
 */
export interface FieldConfig<TValue = any> {
  label: string
  render: (ctx: FieldRenderContext<TValue>) => VNode
  fromProps?: (raw: any, rawProps: Partial<TextComponentProps>, key: keyof TextComponentProps) => TValue
  toProps?: (val: TValue, rawProps: Partial<TextComponentProps>, key: keyof TextComponentProps) => any
}

export type PropsToForms = Partial<Record<keyof TextComponentProps, FieldConfig<any>>>

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
    label: '字号',
    render: ({ value, onChange }) => (
      <InputNumber
        value={value as number | undefined}
        onChange={val => onChange(val)}
        addonAfter="px"
      />
    ),
    toProps: (val) => {
      if (!isNumber(val)) return ''
      return `${val}px`
    },
    fromProps: (raw) => {
      if (!isString(raw)) return undefined
      const parsed = Number.parseInt(raw, 10)
      return Number.isNaN(parsed) ? undefined : parsed
    },
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
      <Slider
        min={0}
        max={3}
        step={0.1}
        value={value}
        onChange={val => onChange(val)}
      />
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
}
