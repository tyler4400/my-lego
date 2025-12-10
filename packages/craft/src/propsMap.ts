import type { Component } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { Input, InputNumber, Slider } from 'ant-design-vue'

export interface PropsToForm {
  component: Component
  value?: string
  extraProps?: Record<string, any>
  label?: string
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
  },
  lineHeight: {
    label: '行高',
    component: Slider,
    extraProps: {
      min: 0,
      max: 3,
      step: 0.1,
    },
  },
}
