# Component 的 is 属性与 rendervnode
_Exported on 2025/12/14 at GMT+8 23:42:15 from Cursor (2.1.49)_

---

**User**

@packages/craft/src/components/PropsTable.vue:12 cmponent的is属性如果是string，vnode，组件，分别是怎么处理的，我使用component而不是rendervnode是否是ok的？

@packages/craft/src/utils/RenderVnode.ts @packages/craft/src/views/EditorView/EditorView.vue @packages/craft/src/views/EditorView/propsMap.tsx @packages/craft/src/components/PropsTable.vue 

---

**Cursor**

### 先直接回答你的问题

**在 Vue 3 里，`<component :is="xxx">` 对三种类型的处理：**

- **`string`**
  - 如果是内置标签名（`'div'`, `'span'` 等）⇒ 渲染对应的原生 DOM 元素。
  - 如果是组件名（`'LText'`）⇒ 通过 `app.component` / `components` 选项去查找已注册组件，找到就渲染对应组件，找不到就当作自定义元素标签 `<LText>`。
- **组件定义（options / `defineComponent` 结果 / 函数组件 / 异步组件）**
  - 直接把这个对象当作组件类型，等价于 `<MyComp />`。
- **`VNode`（通过 `h()` 或 JSX/TSX 返回的虚拟节点）**
  - 编译后内部会执行 `createVNode(resolveDynamicComponent(is), …)`。
  - 当 `is` 是一个 VNode 对象时，`createVNode` 会识别它是 VNode，然后调用 `cloneVNode(is, props, children)`。
  - 也就是说：**`<component :is="someVNode" />` 的效果就是“克隆并渲染这颗 VNode”**，附加在 `<component>` 上的 props/children 会 merge 进这颗 VNode。

官方文档里没有特别大书特书，但 runtime 里就是这么实现的（`createVNode` + `isVNode` + `cloneVNode`）。

---

### 结合你现在的代码说结论

`PropsTable.vue` 里：

```vue
<!-- 原来 -->
<!-- <RenderVnode :node="field.node" /> -->

<!-- 现在 -->
<component :is="field.node" />
```

`field.node` 的来源在 `propsMap.tsx`：

```ts
render: ({ value, onChange }) => (
  <Textarea
    rows={3}
    value={value as string | undefined}
    onChange={e => onChange(e.target.value)}
  />
)
```

这里 `render` 返回的是 **JSX 生成的 VNode**，类型也写死成了 `VNode`：

```ts
interface FinalField {
  key: keyof TextComponentProps
  label: string
  node: VNode
}
```

`RenderVnode` 的实现是：

```ts
const RenderVnode = defineComponent({
  props: {
    node: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props) {
    return () => props.node
  },
})
```

也就是 **原来只是“把传进来的 VNode 原样 return 出去”**。

而 `<component :is="field.node" />` 在当前写法下等价于：

- 内部会做一次 `cloneVNode(field.node)`，
- 没有额外传 props/children，所以基本就是 **“和 `RenderVnode` 一样渲染这一颗 VNode，只是多 clone 一层”**。

所以在你当前这套实现里：

- **`field.node` 永远是 VNode，不是 string。**
- `<component :is="field.node" />` 在行为上和 `RenderVnode` 几乎等价，是 **完全 OK** 的。
- 你可以不用 `RenderVnode` 这个小组件（除非你以后又要支持 `string` 直接显示文本）。

---

### 唯一需要注意的一点

你代码里的这句注释其实已经点到本质了：

```vue
<!-- RenderVnode也可以换成component.is，只不过如果option.label不能是纯字符串 -->
```

含义就是：

- **用 `<RenderVnode>` 时**：`node` 可以是 `string` 或 `VNode`，如果是 `string` 就直接当纯文本渲染。
- **改成 `<component :is="node">` 时**：
  - 如果 `node` 是 `string`，Vue 会尝试把它当“标签 / 组件名”，而不是“纯文本”。
  - 所以像 `option.label = '纯文本'` 这种场景，就不再适合用 `<component :is="option.label">`，得把 label 包成一个 VNode（例如 `<span>纯文本</span>`），或者继续用 `RenderVnode` 这种“直接 return”的组件。

**总结成一句话：**

- **在你现在的 `PropsTable` 里，`field.node` 明确是 `VNode`，用 `<component :is="field.node" />` 是安全且正确的，可以认为等价于 `RenderVnode`。**
- 只有当你需要同时支持“纯字符串”这种 label 时，才更适合继续用 `RenderVnode` 这种“原样返回”的写法，而不是 `<component :is="string">`。

```vue
<!-- 原来 -->
<!-- <RenderVnode :node="field.node" /> -->

<!-- 现在 -->
<component :is="field.node" />
```

```typescript
render: ({ value, onChange }) => (
  <Textarea
    rows={3}
    value={value as string | undefined}
    onChange={e => onChange(e.target.value)}
  />
)
```

```typescript
interface FinalField {
  key: keyof TextComponentProps
  label: string
  node: VNode
}
```

```typescript
const RenderVnode = defineComponent({
  props: {
    node: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props) {
    return () => props.node
  },
})
```

```vue
<!-- RenderVnode也可以换成component.is，只不过如果option.label不能是纯字符串 -->
```

