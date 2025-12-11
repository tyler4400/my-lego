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
              :id="comp.id"
              :key="comp.id"
              :active="editorStore.currentElement?.id === comp.id"
              @setActive="editorStore.setCurrentElement"
            >
              <component
                :is="comp.name"
                v-bind="comp.props"
              />
            </EditWrapper>
          </div>
        </LayoutContent>
      </Layout>
      <LayoutSider
        width="300"
        style="background: #fff"
        class="settings-panel"
      >
        组件属性
        <PropsTable :compProps="editorStore.currentElement?.props" @change="handleChange" />
        <pre>
          {{ editorStore.currentElement }}
        </pre>
      </LayoutSider>
    </Layout>
  </div>
</template>

<script setup lang="ts">
import type { TextComponentProps } from '@/defaultProps.ts'
import { Layout, LayoutContent, LayoutSider } from 'ant-design-vue'
import ComponentList from '@/components/ComponentList.vue'
import EditWrapper from '@/components/EditWrapper.vue'
import LText from '@/components/LText.vue'
import PropsTable from '@/components/PropsTable.vue'
import { defaultTextTemplates } from '@/defaultTemplates.ts'
import { useEditorStore } from '@/stores/editor.ts'

defineOptions({
  components: {
    LText,
  },
})

const editorStore = useEditorStore()

const addComponent = (item: Partial<TextComponentProps>) => {
  editorStore.addComponent(item)
}

const handleChange = (key: string, value: any) => {
  console.log('handleChange', key, value)
  editorStore.updateComponent(key as keyof TextComponentProps, value)
}
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
  position: fixed;
  margin: 50px 0 0;
  max-height: 80vh;
}
</style>
