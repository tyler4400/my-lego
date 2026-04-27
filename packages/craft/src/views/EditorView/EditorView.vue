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
      <Layout style="padding: 0 24px 24px">
        <LayoutContent class="preview-container">
          <p>画布区域</p>
          <div id="canvas-area" ref="canvasArea" class="preview-list">
            <div class="body-container" :style="editorStore.pageData.props">
              <EditWrapper
                v-for="comp in editorStore.components"
                v-show="!comp.isHidden"
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
          <pre>
              {{ editorStore.pageData }}
          </pre>
        </LayoutContent>
      </Layout>
      <LayoutSider
        width="300"
        style="background: #fff"
        class="settings-panel"
      >
        <Tabs v-model:activeKey="activeKey" type="card">
          <TabPane key="component" tab="元素属性" class="no-top-radius">
            <div v-if="!editorStore.currentElement">
              <Empty description="请在画布中选择元素" />
            </div>
            <PropsTable
              v-else-if="!editorStore.currentElement?.isLocked"
              :compProps="editorStore.currentElement?.props"
              :currentElementId="editorStore.currentElement?.id"
              :propGroup="compPropGroupList"
              defaultActiveKey="position"
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
              @move="editorStore.move"
            />
          </TabPane>
          <TabPane key="page" tab="页面设置">
            <PropsTable
              :compProps="editorStore.pageData.props"
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
import { Button, Empty, Layout, LayoutContent, LayoutSider, TabPane, Tabs } from 'ant-design-vue'
import { provide, ref, useTemplateRef } from 'vue'
import { componentMap } from '@/components'
import ComponentList from '@/components/ComponentList.vue'
import EditWrapper from '@/components/EditWrapper'
import LayerList from '@/components/LayerList'
import PropsTable from '@/components/PropsTable'
import { defaultTextTemplates } from '@/defaultTemplates.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { canvasKey } from '@/views/EditorView/canvasContext.ts'
import { compPropGroupList, pagePropGroupPropList } from '@/views/EditorView/config.ts'

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
  editorStore.updateCompData(id, key, value)
}

const handlePositionChange = (id: ComponentData['id'], position: PositionPayload) => {
  const { left, top, width, height } = position
  if (!isNullOrUndefined(left)) handleCompChange('left', left, id)
  if (!isNullOrUndefined(top)) handleCompChange('top', top, id)
  if (!isNullOrUndefined(width)) handleCompChange('width', width, id)
  if (!isNullOrUndefined(height)) handleCompChange('height', height, id)
}

const canvasAreaRef = useTemplateRef('canvasArea')
const getCanvasRect = () => canvasAreaRef.value?.getBoundingClientRect()
provide(canvasKey, getCanvasRect)
</script>

<style>
.editor-container .preview-container {
  padding: 24px;
  margin: 0;
  min-height: 85vh;
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
  /*position: fixed; 临时替换为relative*/
  position: relative;
  margin: 50px 0 0;
  max-height: 80vh;
}
</style>
