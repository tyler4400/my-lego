import type { Component } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { Input } from 'ant-design-vue'

export interface PropsToForm {
  component: Component
  value?: string
}

export type PropsToForms = Partial<Record<keyof TextComponentProps, PropsToForm>>

export const mapPropsToForms: PropsToForms = {
  text: {
    component: Input,
  },
}
