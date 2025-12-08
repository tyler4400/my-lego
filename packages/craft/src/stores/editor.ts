import { reactive } from 'vue'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import type { ComponentData } from '@/types/editor.ts'

export const useEditorStore = defineStore('editor', () => {
  // 供中间编辑器渲染的数组
  const components = reactive<ComponentData[]>(testComponents)
  // 当前编辑的是哪个元素，uuid
  const currentElement: string | null = null

  const addComponent = (props: Record<string, any>): void => {
    const newComp = {
      id: uuidv4(),
      name: 'LText',
      props,
    }
    components.push(newComp)
  }

  return { components, currentElement, addComponent }
})

const testComponents: ComponentData[] = [
  {
    id: uuidv4(),
    name: 'LText',
    props: {
      text: 'hello',
      fontSize: '20px',
      color: 'red',
      lineHeight: '1',
      textAlign: 'left',
      fontFamily: '',
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
      text: 'hello3',
      fontSize: '15px',
      actionType: 'url',
      url: 'https://www.imooc-lego.com/',
      lineHeight: '3',
      textAlign: 'left',
      fontFamily: '',
    },
  },
]
