import type { ExtractPublicPropTypes, PropType } from 'vue'
import type { FieldConfig } from '@/components/PropsTable/propsMap.tsx'
import type { AllComponentProps, CompFieldKey } from '@/defaultProps.ts'
import { computed, defineComponent, toRef } from 'vue'

const renderPropFieldProps = {
  fieldKey: {
    type: String as PropType<CompFieldKey>,
    required: true,
  },
  config: {
    type: Object as PropType<FieldConfig>,
    required: true,
  },
  compProps: {
    type: Object as PropType<Partial<AllComponentProps>>,
    required: true,
  },
} as const

export type RenderPropFieldProps = ExtractPublicPropTypes<typeof renderPropFieldProps>

export interface RenderPropFieldEmits {
  (e: 'change', key: CompFieldKey, value: any): void
}

const renderPropFieldEmits = {
  change: (_key: CompFieldKey, _value: any) => true,
}
/**
 * 之前是compProps的任意一个字段改变，都会重新渲染整个compProps
 * 改造后只会渲染对应的 RenderPropField
 * 这行 toRef(() => props.compProps[props.fieldKey]) 负责让当前子组件只盯住自己的那个 key。
 *
 * 例如：修改了 fontSize
 * 优化前：
 * compProps.fontSize 变化
 * -> PropsTable.fields 重新执行
 * -> 再次遍历全部字段
 * -> 全部 config.render() 重跑
 * -> 整表 patch
 * 优化后：
 * compProps.fontSize 变化
 * -> RenderPropField(fontSize) 的 fieldValue 重新计算
 * -> RenderPropField(fontSize) 自己重新 render
 * -> 仅 fontSize 这一行 patch
 */
export default defineComponent({
  name: 'RenderPropField',
  props: renderPropFieldProps,
  emits: renderPropFieldEmits,
  setup(props, { emit }) {
    const rawValue = toRef(() => props.compProps[props.fieldKey])

    const fieldValue = computed(() => {
      return props.config.fromProps?.(rawValue.value, props.compProps, props.fieldKey) ?? rawValue.value
    })

    const visible = computed(() => {
      return props.config.visible?.(props.compProps) ?? true
    })

    const handleValueChange = (val: any, key: CompFieldKey = props.fieldKey) => {
      const nextVal = props.config.toProps?.(val, props.compProps, props.fieldKey) ?? val
      emit('change', key, nextVal)
    }

    return () => {
      if (!visible.value) return null

      return (
        <div class="prop-item">
          {props.config.label && <span class="label">{props.config.label}</span>}
          <div class="prop-component">
            {props.config.render({
              key: props.fieldKey,
              value: fieldValue.value,
              rawProps: props.compProps,
              onChange: handleValueChange,
            })}
          </div>
        </div>
      )
    }
  },
})
