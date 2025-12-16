import type { ExtractPublicPropTypes, PropType, SlotsType, VNodeChild } from 'vue'
import { isBoolean } from '@my-lego/shared'
import { Button, Tooltip } from 'ant-design-vue'
import { defineComponent } from 'vue'

/**
 * 下面是tsx写vue组件(或选项式组件)的话， props, emit slots, attrs的【最佳实践】
 */

/**
 * Props：
 * 先写运行时 props 定义对象，as const 固定结构；
 * 再用 ExtractPublicPropTypes（对外）/ ExtractPropTypes（对内）提取类型；
 * 保持“运行时声明 + 类型声明共用一份源数据”。
 */
const iconSwitchProps = {
  checked: {
    type: Boolean,
    default: false,
  },
  tip: {
    type: String,
  },
  icon: {
    // PropType用于在用运行时 props 声明时给一个 prop 标注更复杂的类型定义。
    type: Object as PropType<VNodeChild>,
    required: true,
  },
} as const

// 导出供外部使用的类型
export type IconSwitchProps = ExtractPublicPropTypes<typeof iconSwitchProps>
// 如果组件内部要用“永远有值”的视角，可以再加：
// type IconSwitchInnerProps = ExtractPropTypes<typeof iconSwitchProps>

/**
 * Emits：
 * 运行时 + 类型导出。 需要分开写，没有类型工具
 */
export interface IconSwitchEmits {
  (e: 'change', checked: boolean): void
}
const iconSwitchEmits = {
  change: (checked: boolean) => isBoolean(checked),
}

/**
 * Slots:
 * 在选项里增加 slots: Object as SlotsType<...>
 * 把SlotsType<...> 导出即可
 */
export type IconSwitchSlots = SlotsType<{
  default?: () => any
}>

export default defineComponent({
  name: 'IconSwitch',
  props: iconSwitchProps,
  emits: iconSwitchEmits,
  slots: Object as IconSwitchSlots,

  setup(props, { emit, slots, attrs }) {
    // ❌ 下面解构会导致丢失响应式。只能在<script setup> 语法糖里解构 props才会被编译为带getter的访问，不会丢失响应式。
    // const { checked, tip } = props

    return () => (
      <div class="icon-Switch" onClick={() => emit('change', !props.checked)} {...attrs}>
        <Tooltip placement="top" title={props.tip}>
          <Button icon={props.icon} shape="circle" type={props.checked ? 'primary' : 'default'}>
            {slots.default?.()}
          </Button>
        </Tooltip>
      </div>
    )
  },

})
