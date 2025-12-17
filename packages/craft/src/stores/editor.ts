import type { ImageComponentProps, TextComponentProps } from '@/defaultProps.ts'
import type { ComponentData } from '@/types/editor.ts'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { reactive, ref } from 'vue'
import LImage from '@/components/LImage.vue'
import LText from '@/components/LText.vue'

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

export const componentMap = {
  LText,
  LImage,
} as const
