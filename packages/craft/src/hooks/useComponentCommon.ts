import type { CSSProperties } from 'vue'
import type { CommonComponentProps } from '@/types/editor.ts'
import { pick } from 'lodash-es'
import { computed } from 'vue'

function useComponentCommon<T extends CommonComponentProps>(props: Partial<T>, picks: string[]) {
  const stylesProps = computed(() => pick(props, picks) as CSSProperties)

  const handleClick = () => {
    if (props.actionType === 'url' && props.url) {
      window.location.href = props.url
    }
  }

  return {
    stylesProps,
    handleClick,
  }
}

export default useComponentCommon
