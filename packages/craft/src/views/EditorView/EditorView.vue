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
          <div
            id="canvas-area"
            class="preview-list"
          >
            <EditWrapper
              v-for="comp in editorStore.components"
              v-show="!comp.isHidden"
              :id="comp.id"
              :key="comp.id"
              :active="editorStore.currentElement?.id === comp.id"
              @setActive="editorStore.setCurrentElement"
            >
              <component
                :is="componentMap[comp.name]"
                v-bind="comp.props"
              />
            </EditWrapper>
          </div>
          <pre>
              {{ editorStore.components }}
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
              @change="handleChange"
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
            <p>页面设置</p>
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
import type { ComponentData, EditableCompField } from '@/components'
import type { ImageComponentProps, TextComponentProps } from '@/defaultProps.ts'
import { Button, Empty, Layout, LayoutContent, LayoutSider, TabPane, Tabs } from 'ant-design-vue'
import { ref } from 'vue'
import { componentMap } from '@/components'
import ComponentList from '@/components/ComponentList.vue'
import EditWrapper from '@/components/EditWrapper.vue'
import LayerList from '@/components/LayerList'
import PropsTable from '@/components/PropsTable'
import { defaultTextTemplates } from '@/defaultTemplates.ts'
import { useEditorStore } from '@/stores/editor.ts'

export type TabType = 'component' | 'layer' | 'page'

const editorStore = useEditorStore()

const addComponent = (item: ComponentData) => {
  editorStore.addComponent(item)
}

const handleChange = (key: string, value: any) => {
  console.log('handleChange', key, value)
  editorStore.updateCompProp(key as keyof (TextComponentProps | ImageComponentProps), value)
}

const handleLayerChange = <T extends EditableCompField>(
  id: ComponentData['id'],
  key: T,
  value: ComponentData[T],
) => {
  editorStore.updateCompData(id, key, value)
}

const activeKey = ref<TabType>('component')
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
