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
            @on-item-click="addComponent"
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
            <component
              :is="comp.name"
              v-for="comp in editorStore.components"
              :key="comp.id"
              v-bind="comp.props"
            />
          </div>
        </LayoutContent>
      </Layout>
      <layoutSider
        width="300"
        style="background: purple"
        class="settings-panel"
      >
        组件属性
      </layoutSider>
    </Layout>
  </div>
</template>

<script setup lang="ts">
import { Layout, LayoutContent, LayoutSider } from 'ant-design-vue'
import { useEditorStore } from '@/stores/editor.ts'
import LText from '@/components/LText.vue'
import ComponentList from '@/components/ComponentList.vue'
import { defaultTextTemplates } from '@/defaultTemplates.ts'
import type { TextComponentProps } from '@/defaultProps.ts'

const editorStore = useEditorStore()

defineOptions({
  components: {
    LText,
  },
})

const addComponent = (item: Partial<TextComponentProps>) => {
  console.log('EditorView.vue.58.addComponent.item: ', item)
  editorStore.addComponent(item)
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
