import type { AllFormProps, CompFieldKey, ComponentData, EditableCompField, EditablePageField, PageData, PageProps } from '@/types/editor.ts'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { reactive, ref } from 'vue'
import { imageDefaultProps } from '@/components/defaultProps.ts'

const testComponents: ComponentData[] = [
  // {
  //   id: uuidv4(),
  //   name: 'LText',
  //   layerName: '元素1',
  //   props: {
  //     ...textDefaultProps,
  //     text: '你好呀',
  //     fontSize: '20px',
  //     color: '#f5222d',
  //     lineHeight: '1',
  //     textAlign: 'left',
  //     fontFamily: '',
  //     fontStyle: 'normal',
  //     fontWeight: 'normal',
  //     textDecoration: 'none',
  //     position: 'relative',
  //   },
  // },
  // {
  //   id: uuidv4(),
  //   name: 'LText',
  //   layerName: '元素2',
  //   props: {
  //     ...textDefaultProps,
  //     text: 'hello2',
  //     fontSize: '10px',
  //     fontWeight: 'bold',
  //     lineHeight: '2',
  //     textAlign: 'left',
  //     fontFamily: '',
  //     position: 'relative',
  //   },
  // },
  // {
  //   id: uuidv4(),
  //   name: 'LText',
  //   layerName: '元素3',
  //   props: {
  //     ...textDefaultProps,
  //     text: '一个链接',
  //     fontSize: '15px',
  //     actionType: 'url',
  //     url: 'https://www.imooc-lego.com/',
  //     lineHeight: '3',
  //     textAlign: 'left',
  //     fontFamily: '',
  //     position: 'relative',
  //   },
  // },
  {
    name: 'LImage',
    id: uuidv4(),
    layerName: '元素4',
    props: {
      ...imageDefaultProps,
      src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69cf21f8b558154f039349b0.jpg',
      actionType: '',
      url: '',
      paddingLeft: '0px',
      paddingRight: '0px',
      paddingTop: '0px',
      paddingBottom: '0px',
      borderStyle: 'none',
      borderColor: '#000',
      borderWidth: '0',
      borderRadius: '0',
      boxShadow: '0 0 0 #000000',
      opacity: '1',
      position: 'absolute',
      top: '10px',
      left: '10px',
      width: '130px',
      height: '100px',
    },
  },
  // {
  //   name: 'LImage',
  //   id: uuidv4(),
  //   layerName: '元素5',
  //   props: {
  //     ...imageDefaultProps,
  //     src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69cf69d4b558154f039349b1.png',
  //     actionType: '',
  //     url: '',
  //     height: '',
  //     width: '373px',
  //     paddingLeft: '0px',
  //     paddingRight: '0px',
  //     paddingTop: '0px',
  //     paddingBottom: '0px',
  //     borderStyle: 'none',
  //     borderColor: '#000',
  //     borderWidth: '0',
  //     borderRadius: '0',
  //     boxShadow: '0 0 0 #000000',
  //     opacity: '1',
  //     position: 'relative',
  //     // position: 'absolute',
  //     left: '0',
  //     top: '0',
  //     right: '0',
  //   },
  // },
  // {
  //   name: 'LImage',
  //   layerName: '元素6',
  //   id: uuidv4(),
  //   props: {
  //     ...imageDefaultProps,
  //     src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69d4d224b558154f039349b2.jpg',
  //     actionType: '',
  //     url: '',
  //     height: '',
  //     width: '258px',
  //     paddingLeft: '0px',
  //     paddingRight: '0px',
  //     paddingTop: '0px',
  //     paddingBottom: '0px',
  //     borderStyle: 'none',
  //     borderColor: '#000',
  //     borderWidth: '0',
  //     borderRadius: '0',
  //     boxShadow: '0 0 0 #000000',
  //     opacity: '1',
  //     position: 'relative',
  //     // position: 'absolute',
  //     left: '0',
  //     top: '0',
  //     right: '0',
  //   },
  // },
]

const pageDefaultProps = {
  backgroundColor: '#ffffff',
  backgroundImage: '',
  // backgroundImage: 'url("http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69e9f073b558154f039349eb.jpg")',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  height: '560px',
}

export const useEditorStore = defineStore('editor', () => {
  // 供中间编辑器渲染的数组
  const components = reactive<ComponentData[]>(testComponents)
  // 当前编辑的是哪个元素，uuid
  const currentElement = ref<ComponentData>()
  // 编辑页的整体页面信息
  const pageData = ref<PageData>({
    props: pageDefaultProps,
    title: 'new page',
  })

  const setCurrentElement = (id: string) => {
    currentElement.value = components.find(item => item.id === id)
  }

  const addComponent = (data: ComponentData): void => {
    if (data) {
      components.push({
        layerName: data.name,
        ...data,
      })
    }
  }

  const move = (startIndex: number, endIndex: number) => {
    if (startIndex === endIndex || startIndex === undefined || endIndex === undefined) return
    if (startIndex < 0 || endIndex < 0) return
    if (startIndex >= components.length || endIndex >= components.length) return

    const deleteComp = components[startIndex] as ComponentData
    components.splice(startIndex, 1)
    components.splice(endIndex, 0, deleteComp)
  }

  const updateCompProp = <K extends CompFieldKey>(key: K, value: AllFormProps[K], id?: string) => {
    if (id) {
      const element = components.find(item => item.id === id)
      if (element) element.props[key] = value
    }
    else if (currentElement.value) {
      currentElement.value.props[key] = value
    }
  }

  const updateCompData = <T extends EditableCompField>(id: string, key: T, value: ComponentData[T]) => {
    const element = components.find(item => item.id === id)
    if (!element) return

    element[key] = value
  }

  const updatePageProp = <T extends keyof PageProps>(key: T, value: PageProps[T]) => {
    pageData.value.props[key] = value
  }

  const updatePageData = <T extends EditablePageField>(key: T, value: PageData[T]) => {
    pageData.value[key] = value
  }

  return {
    components,
    currentElement,
    addComponent,
    setCurrentElement,
    updateCompProp,
    updateCompData,
    move,
    pageData,
    updatePageData,
    updatePageProp,
  }
})
