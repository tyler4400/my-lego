<template>
  <div class="editor-container">
    <Layout>
      <LayoutSider
        width="300"
        style="background: #fff"
      >
        <div class="sidebar-container">
          组件列表
          <ComponentList
            :list="defaultTextTemplates"
            @onItemClick="addComponent"
          />
        </div>
      </LayoutSider>
      <LayoutContent class="preview-container" style="padding: 0 24px 24px">
        <p>画布区域</p>
        <Spin :spinning="loadingWork" tip="正在加载作品..." size="large">
          <div id="canvas-area" ref="canvasArea" class="preview-list">
            <div class="body-container" :style="editorStore.pageProps">
              <EditWrapper
                v-for="comp in editorStore.components"
                v-show="!comp.isHidden"
                id="edit-wrapper"
                :key="comp.id"
                :active="editorStore.currentElement?.id === comp.id"
                :comp="comp"
                @setActive="editorStore.setCurrentElement"
                @updatePosition="handlePositionChange"
              >
                <component
                  :is="componentMap[comp.name]"
                  v-bind="comp.props"
                />
              </EditWrapper>
            </div>
          </div>
        </Spin>
        <pre>
              {{ editorStore.pageData }}
          </pre>
      </LayoutContent>
      <LayoutSider
        width="300"
        style="background: #fff"
        class="settings-panel"
      >
        <Tabs v-model:activeKey="activeKey" type="card">
          <TabPane key="component" tab="元素属性" class="no-top-radius">
            <Alert v-if="editorStore.currentElement?.isHidden" message="当前元素已隐藏" banner>
              <template #action>
                <Button
                  size="small"
                  type="text"
                  @click="() => handleLayerChange(editorStore.currentElement!.id, 'isHidden', false)"
                >
                  显示
                </Button>
              </template>
            </Alert>
            <div v-if="!editorStore.currentElement">
              <Empty description="请在画布中选择元素" />
            </div>
            <PropsTable
              v-else-if="!editorStore.currentElement?.isLocked"
              :compProps="editorStore.currentElement?.props"
              :currentElementId="editorStore.currentElement?.id"
              :propGroup="compPropGroupList"
              defaultActiveKey="content"
              @change="handleCompChange"
            />
            <div v-else>
              <Empty description="该元素已被锁定，无法编辑">
                <Button @click="() => handleLayerChange(editorStore.currentElement!.id, 'isLocked', false)">
                  解除锁定
                </Button>
              </Empty>
            </div>
          </TabPane>
          <TabPane key="layer" tab="元素列表">
            <LayerList
              :list="editorStore.components"
              :currentElementId="editorStore.currentElement?.id"
              @setActive="editorStore.setCurrentElement"
              @change="handleLayerChange"
              @reorder="editorStore.reorder"
            />
          </TabPane>
          <TabPane key="page" tab="页面设置">
            <PropsTable
              :compProps="editorStore.pageProps"
              :propGroup="pagePropGroupPropList"
              defaultActiveKey="background"
              @change="handlePagePropChange"
            />
          </TabPane>
        </Tabs>
        <pre>
          {{ editorStore.currentElement }}
        </pre>
      </LayoutSider>
    </Layout>
  </div>
</template>

<script setup lang="ts">
import type { PositionPayload } from '@/components/EditWrapper'
import type { CompFieldKey, ComponentData, EditableCompField, PageProps } from '@/types/editor.ts'
import { isNullOrUndefined } from '@my-lego/shared'
import { Alert, Button, Empty, Layout, LayoutContent, LayoutSider, Spin, TabPane, Tabs } from 'ant-design-vue'
import { provide, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { componentMap } from '@/components'
import ComponentList from '@/components/ComponentList.vue'
import EditWrapper from '@/components/EditWrapper'
import LayerList from '@/components/LayerList'
import PropsTable from '@/components/PropsTable'
import { defaultTextTemplates } from '@/defaultTemplates.ts'
import { useWork } from '@/hooks/useWork.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { canvasKey } from '@/views/EditorView/canvasContext.ts'
import { compPropGroupList, pagePropGroupPropList } from '@/views/EditorView/config.ts'
import initContextMenu from '@/views/EditorView/plugin/contextMenuPlugin.ts'
import initHotKeys from '@/views/EditorView/plugin/hotKeysPlugin.ts'

// 插件
initHotKeys()
initContextMenu('#edit-wrapper')

// 初始化work
const route = useRoute()
const [loadingWork] = useWork(() => route.params.id, true)

export type TabType = 'component' | 'layer' | 'page'
const activeKey = ref<TabType>('component')

const editorStore = useEditorStore()

const addComponent = (item: ComponentData) => {
  editorStore.addComponent(item)
}

const handleCompChange = (key: string, value: any, id?: ComponentData['id']) => {
  editorStore.updateCompProp(key as CompFieldKey, value, id)
}

const handlePagePropChange = (key: string, value: any) => {
  editorStore.updatePageProp(key as keyof PageProps, value)
}

const handleLayerChange = <T extends EditableCompField>(
  id: ComponentData['id'],
  key: T,
  value: ComponentData[T],
) => {
  editorStore.updateCompData(key, value, id)
}

const handlePositionChange = (id: ComponentData['id'], position: PositionPayload) => {
  const { left, top, width, height } = position
  editorStore.batchUpdate(() => {
    if (!isNullOrUndefined(left)) handleCompChange('left', left, id)
    if (!isNullOrUndefined(top)) handleCompChange('top', top, id)
    if (!isNullOrUndefined(width)) handleCompChange('width', width, id)
    if (!isNullOrUndefined(height)) handleCompChange('height', height, id)
  })
}

const canvasAreaRef = useTemplateRef('canvasArea')
const getCanvasRect = () => canvasAreaRef.value?.getBoundingClientRect()
provide(canvasKey, getCanvasRect)
</script>

<style scoped>
.editor-container {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding-top: 10px;
}

.editor-container :deep(.ant-layout) {
  flex: 1;
  min-height: 0;
}

.editor-container .preview-container {
  flex: 1;
  padding: 24px;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.editor-container .preview-list {
  padding: 0;
  min-width: 375px;
  min-height: 200px;
  border: 1px solid #efefef;
  background: #fff;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  margin: 50px 0 0;
  max-height: 80vh;
}

.settings-panel :deep(.ant-tabs-nav-wrap) {
  justify-content: center;
}
</style>
