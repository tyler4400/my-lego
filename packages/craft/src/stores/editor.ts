import type { WorkDetailDto, WorkUpdateReq } from '@/api/modules/work.ts'
import type { AllFormProps, CompFieldKey, ComponentData, EditableCompField, EditablePageField, PageData, PageProps } from '@/types/editor.ts'
import { isNumber } from '@my-lego/shared'
import { cloneDeep } from 'lodash-es'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { reactive, readonly, ref } from 'vue'
import { useHistoryStore } from '@/stores/history.ts'

/**
 * 页面级样式默认值（对应后端 content.props）
 * - export 供「创建空白作品」时拼装初始 content 复用
 * - 使用处一律 spread 拷贝，避免共享同一引用被意外修改
 */
export const defaultPageProps: PageProps = {
  backgroundColor: '#ffffff',
  backgroundImage: '',
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  height: '560px',
}

/**
 * 页面级元信息默认值（空白作品）
 * - 工厂函数，避免多处复用时共享同一对象引用
 */
export const createDefaultPageData = (): PageData => ({
  title: '未命名作品',
})

export const useEditorStore = defineStore('editor', () => {
  // 供中间编辑器渲染的元素数组
  const components = reactive<ComponentData[]>([])
  // 当前编辑的是哪个元素
  const currentElement = ref<ComponentData>()
  // 当前复制的是哪个元素
  const copiedElement = ref<ComponentData>()
  // 页面级样式（对应后端 content.props）
  const pageProps = ref<PageProps>({ ...defaultPageProps })
  // 页面级元信息（对应后端 work 表除 content 外的顶层列）
  const pageData = ref<PageData>(createDefaultPageData())

  const setCurrentElement = (id?: string) => {
    if (id) {
      currentElement.value = components.find(item => item.id === id)
    }
    else {
      currentElement.value = undefined
    }
  }

  const addComponent = (data: ComponentData, index?: number): void => {
    if (!data) return

    const newComp: ComponentData = {
      layerName: `元素${components.length + 1}`,
      ...data,
    }

    if (isNumber(index)) {
      components.splice(index, 0, newComp)
    }
    else {
      components.push(newComp)
    }

    setCurrentElement(data.id)

    useHistoryStore().pushAction({
      actionType: 'add',
      componentId: data.id,
      data: cloneDeep(newComp),
    })
  }

  const reorder = (startIndex: number, endIndex: number) => {
    if (startIndex === endIndex || startIndex === undefined || endIndex === undefined) return
    if (startIndex < 0 || endIndex < 0) return
    if (startIndex >= components.length || endIndex >= components.length) return

    const deleteComp = components[startIndex] as ComponentData
    components.splice(startIndex, 1)
    components.splice(endIndex, 0, deleteComp)

    useHistoryStore().pushAction({
      actionType: 'reorder',
      data: { startIndex, endIndex },
    })
  }

  const updateCompProp = <K extends CompFieldKey>(key: K, value: AllFormProps[K], id?: string) => {
    const targetId = id ?? currentElement.value?.id
    if (!targetId) return

    const element = components.find(item => item.id === targetId)
    if (!element) return

    const oldValue = element.props[key]
    element.props[key] = value

    useHistoryStore().pushAction({
      actionType: 'updateComp',
      componentId: targetId,
      target: 'props',
      data: { key, oldValue, newValue: value },
    })
  }

  const updateCompData = <T extends EditableCompField>(key: T, value: ComponentData[T], id?: string) => {
    const targetId = id ?? currentElement.value?.id
    if (!targetId) return

    const element = components.find(item => item.id === targetId)
    if (!element) return

    const oldValue = element[key]
    element[key] = value

    useHistoryStore().pushAction({
      actionType: 'updateComp',
      componentId: targetId,
      target: 'compData',
      data: { key, oldValue, newValue: value },
    })
  }

  const updatePageProp = <T extends keyof PageProps>(key: T, value: PageProps[T]) => {
    const oldValue = pageProps.value[key]
    pageProps.value[key] = value

    useHistoryStore().pushAction({
      actionType: 'updatePage',
      target: 'props',
      data: { key, oldValue, newValue: value },
    })
  }

  const updatePageData = <T extends EditablePageField>(key: T, value: PageData[T]) => {
    const oldValue = pageData.value[key]
    pageData.value[key] = value

    useHistoryStore().pushAction({
      actionType: 'updatePage',
      target: 'pageData',
      data: { key, oldValue, newValue: value },
    })
  }

  const copyElement = (id?: string) => {
    if (id) {
      copiedElement.value = components.find(item => item.id === id)
    }
    else {
      copiedElement.value = currentElement.value
    }
    return !!copiedElement.value
  }

  const removeElement = (id?: string) => {
    const targetId = id ?? currentElement.value?.id
    if (!targetId) return

    const index = components.findIndex(item => item.id === targetId)
    if (index < 0) return

    const removed = components[index] as ComponentData
    components.splice(index, 1)

    if (targetId === currentElement.value?.id) setCurrentElement(undefined)

    useHistoryStore().pushAction({
      actionType: 'remove',
      componentId: targetId,
      data: cloneDeep(removed),
      index,
    })
  }

  const pasteElement = () => {
    if (copiedElement.value) {
      const clone = cloneDeep(copiedElement.value)
      clone.id = uuidv4()
      clone.layerName += '副本'
      addComponent(clone)
      return true
    }
    return false
  }

  /**
   * 批量更新事务：fn 内的多次 setter 调用会合并成一条 history
   * 业务侧无需感知 history store
   */
  const batchUpdate = (fn: () => void) => {
    useHistoryStore().compose(fn)
  }

  /**
   * 重置编辑器到空白态（离开编辑器、切换作品前调用）
   */
  const reset = () => {
    components.splice(0, components.length)
    pageProps.value = { ...defaultPageProps }
    pageData.value = createDefaultPageData()
    currentElement.value = undefined
    copiedElement.value = undefined

    useHistoryStore().clear()
  }

  /**
   * 用作品详情回填编辑器状态（进入编辑器时调用）
   * - content.components → components（整批替换，深拷贝避免与服务端数据互相引用）
   * - content.props → pageProps（缺省回落默认值，兼容空/旧数据）
   * - work 顶层列 → pageData
   * - 重置选中态/复制态，并清空历史栈（新作品是全新基线，不可撤销到上一个作品）
   */
  const applyDetail = (work: WorkDetailDto) => {
    reset()
    const nextComponents = work.content?.components ?? []
    components.splice(0, components.length, ...cloneDeep(nextComponents))

    pageProps.value = { ...defaultPageProps, ...work.content?.props }

    pageData.value = {
      id: work.id,
      uuid: work.uuid,
      title: work.title,
      desc: work.desc,
      coverImg: work.coverImg,
      status: work.status,
      isTemplate: work.isTemplate,
      isPublic: work.isPublic,
      isHot: work.isHot,
      author: work.author,
      copiedCount: work.copiedCount,
      latestPublishAt: work.latestPublishAt,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
      user: work.user ?? undefined,
    }
  }

  /**
   * 序列化当前编辑器状态为「编辑作品」请求体
   * - 无 id（如未加载作品/模版非本人）时返回 null，调用方据此拦截保存
   * - components/props 均做拷贝，避免请求体与响应式状态互相引用
   */
  const toUpdateBody = (): WorkUpdateReq | null => {
    const id = pageData.value.id
    if (!id) return null

    return {
      id,
      title: pageData.value.title,
      desc: pageData.value.desc,
      coverImg: pageData.value.coverImg,
      content: {
        components: cloneDeep(components),
        props: { ...pageProps.value },
      },
    }
  }

  return {
    components: readonly(components),
    currentElement: readonly(currentElement),
    copiedElement: readonly(copiedElement),
    pageProps: readonly(pageProps),
    pageData: readonly(pageData),
    addComponent,
    setCurrentElement,
    updateCompProp,
    updateCompData,
    reorder,
    updatePageData,
    updatePageProp,
    copyElement,
    pasteElement,
    removeElement,
    batchUpdate,
    applyDetail,
    reset,
    toUpdateBody,
  }
})
