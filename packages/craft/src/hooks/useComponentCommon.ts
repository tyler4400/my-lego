import { computed } from 'vue'
import { pick } from 'lodash-es'

const useComponentCommon = <T extends Record<string, any>>(props: T, picks: string[]) => {
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
