import type { Component, PropType, SetupContext, VNode } from 'vue'
import type { TextComponentProps } from '@/defaultProps.ts'
import { reduce } from 'lodash-es'
import { computed, defineComponent } from 'vue'
import { mapPropsToForms } from '@/propsMap.tsx'

export interface FormProps {
  value?: string
  component: Component
  subComponent?: Component // 组件可能有子组件，例如Select - SelectOption。 后面重构的时候应该会被vnode替换掉
  options?: { label: string | VNode, value: string }[] // 有的组件是选项
  extraProps?: Record<string, any> // 组件额外参数
  label?: string // 表单项名称
  transferVal?: (val?: string) => any // 将value转换为组件的数据格式
  parseVal?: (val?: any) => any // 将组件值转换为表单数据格式

  /* 数据流 */
  valueKey?: string // 有的组件状态可能不叫 'value'， 例如CheckBox的状态是checked 所以新加此字段来指定value的名称. 默认value
  events?: Record<string, (e: any) => void>
}

/**
 * 组件对外暴露的 props 类型
 */
interface PropsTableProps {
  compProps?: Partial<TextComponentProps>
}

/**
 * 组件对外暴露的事件类型
 * 使用对象形式，在 TS 中可以精确推断 emit 的参数类型
 */
interface PropsTableEmits {
  change: [key: keyof TextComponentProps, value: unknown]
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

const propsToFormsMap = mapPropsToForms()

export default defineComponent({
  name: 'props-table-tsx',
  /* 如果脱离SFC(.vue)，使用tsx来写vue组件。那么必须写运行时的组件props声明。没有defineProps的宏 */
  props: {
    compProps: {
      type: Object as PropType<Partial<TextComponentProps>>,
      required: false,
    },
  },
  emits: {
    // eslint-disable-next-line unused-imports/no-unused-vars
    change: (key: keyof TextComponentProps, value: unknown) => {
      // 简单运行时校验：key 必须是字符串
      if (typeof key !== 'string') {
        return false
      }
      return true
    },
  },
  setup(props: PropsTableProps, { emit }: SetupContext<PropsTableEmits>) {
    const finalProps = computed<Record<string, FormProps>>(
      () => reduce(props.compProps ?? {}, (result, val, key) => {
        const newKey = key as keyof TextComponentProps
        const item = propsToFormsMap[newKey]
        if (item) {
          const { valueKey = 'value', eventName = 'change', parseVal, transferVal, ...other } = item

          const newItem: FormProps = {
            ...other,
            value: transferVal?.(val) ?? val,
            valueKey,
            events: {
              [`on${capitalizeFirstLetter(eventName)}`]: (e: any) => {
                const newVal = parseVal?.(e) ?? e
                emit('change', newKey, newVal)
              },
            },
          }
          result[newKey] = newItem
        }
        return result
      }, {} as Record<string, FormProps>),
    )

    return () => (
      <div class="props-table">
        {Object.keys(finalProps.value).map((key) => {
          const value = finalProps.value[key]!
          // 为了在 TSX 中正确渲染动态组件，这里将组件断言为 any
          const DynamicComponent = value.component as any
          const DynamicSubComponent = value.subComponent as any
          const componentProps = {
            [value.valueKey ?? 'value']: value.value,
            ...value.extraProps,
            ...value.events,
          }

          return (
            <div key={key} class="prop-item">
              {value.label && <span class="label">{value.label}</span>}
              <div class="prop-component">
                <DynamicComponent {...componentProps}>
                  {value.options
                    && value.subComponent
                    && value.options.map(option => (
                      <DynamicSubComponent key={option.value} value={option.value}>
                        {option.label}
                      </DynamicSubComponent>
                    ))}
                </DynamicComponent>
              </div>
            </div>
          )
        })}
      </div>
    )
  },
})
