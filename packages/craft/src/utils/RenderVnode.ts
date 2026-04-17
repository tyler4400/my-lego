import type { PropType, VNodeChild } from 'vue'
import { defineComponent } from 'vue'

const RenderVnode = defineComponent({
  props: {
    node: {
      type: null as unknown as PropType<VNodeChild>,
      required: true,
    },
  },
  setup(props) {
    return () => props.node
  },
})

export default RenderVnode
