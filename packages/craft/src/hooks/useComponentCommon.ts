import { computed } from 'vue'
import { pick } from 'lodash-es'
import type { TextComponentProps } from '@/defaultProps.ts'

const useComponentCommon = (props: Readonly<Partial<TextComponentProps>>, picks: string[]) => {
  const stylesProps = computed(() => pick(props, picks))

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
