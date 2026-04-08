import type { ComponentData } from '@/components'
import type { ImageComponentProps, TextComponentProps } from '@/defaultProps.ts'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { reactive, ref } from 'vue'

const testComponents: ComponentData[] = [
  {
    id: uuidv4(),
    name: 'LText',
    props: {
      text: '你好呀',
      fontSize: '20px',
      color: '#f5222d',
      lineHeight: '1',
      textAlign: 'left',
      fontFamily: '',
      fontStyle: 'normal',
      fontWeight: 'normal',
      textDecoration: 'none',
    },
  },
  {
    id: uuidv4(),
    name: 'LText',
    props: {
      text: 'hello2',
      fontSize: '10px',
      fontWeight: 'bold',
      lineHeight: '2',
      textAlign: 'left',
      fontFamily: '',
    },
  },
  {
    id: uuidv4(),
    name: 'LText',
    props: {
      text: '一个链接',
      fontSize: '15px',
      actionType: 'url',
      url: 'https://www.imooc-lego.com/',
      lineHeight: '3',
      textAlign: 'left',
      fontFamily: '',
    },
  },
  {
    name: 'LImage',
    id: uuidv4(),
    props: {
      src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69cf21f8b558154f039349b0.jpg',
      actionType: '',
      url: '',
      height: '',
      width: '373px',
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
      left: '0',
      top: '0',
      right: '0',
    },
  },
  {
    name: 'LImage',
    id: uuidv4(),
    props: {
      src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69cf69d4b558154f039349b1.png',
      actionType: '',
      url: '',
      height: '',
      width: '373px',
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
      left: '0',
      top: '0',
      right: '0',
    },
  },
  {
    name: 'LImage',
    id: uuidv4(),
    props: {
      src: 'http://typescript-vue.oss-cn-beijing.aliyuncs.com/vue-marker/69d4d224b558154f039349b2.jpg',
      actionType: '',
      url: '',
      height: '',
      width: '258px',
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
      left: '0',
      top: '0',
      right: '0',
    },
  },
]

export const useEditorStore = defineStore('editor', () => {
  // 供中间编辑器渲染的数组
  const components = reactive<ComponentData[]>(testComponents)
  // 当前编辑的是哪个元素，uuid
  const currentElement = ref<ComponentData>()

  const setCurrentElement = (id: string) => {
    currentElement.value = components.find(item => item.id === id)
  }

  const addComponent = (data: ComponentData): void => {
    if (data) components.push(data)
  }

  const updateComponent = (key: keyof (TextComponentProps | ImageComponentProps), value: string) => {
    if (currentElement.value) {
      currentElement.value.props[key] = value
    }
  }

  return { components, currentElement, addComponent, setCurrentElement, updateComponent }
})
