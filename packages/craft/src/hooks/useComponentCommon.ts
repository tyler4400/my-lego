import type { CSSProperties } from 'vue'
import type { CommonComponentProps } from '@/defaultProps.ts'
import { pick } from 'lodash-es'
import { computed } from 'vue'

function useComponentCommon<T extends CommonComponentProps>(props: Partial<T>, picks: string[]) {
  const stylesProps = computed(() => pick(props, picks) as CSSProperties)

  const handleClick = () => {
    if (props.actionType === 'url' && props.url) {
      // window.location.href = props.url // todo
      // eslint-disable-next-line no-alert
      alert(`页面跳转：${props.url}`)
    }
  }

  return {
    stylesProps,
    handleClick,
  }
}

export default useComponentCommon
