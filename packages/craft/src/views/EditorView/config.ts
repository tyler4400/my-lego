import type { PropGroup } from '@/components/PropsTable'

export const compPropGroupList: PropGroup[] = [
  { groupKey: 'content', text: '基本属性', keys: ['text', 'fontSize', 'lineHeight', 'textAlign', 'fontFamily', 'fontWeight', 'fontStyle', 'textDecoration', 'src', 'color', 'backgroundColor'] },
  { groupKey: 'size', text: '尺寸', keys: ['height', 'width', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] },
  { groupKey: 'border', text: '边框', keys: ['borderStyle', 'borderColor', 'borderWidth', 'borderRadius'] },
  { groupKey: 'shadowAndOpacity', text: '阴影与透明度', keys: ['opacity', 'boxShadow'] },
  { groupKey: 'position', text: '位置', keys: ['left', 'top'] },
  { groupKey: 'action', text: '事件功能', keys: ['actionType', 'url'] },
] as const

export const pagePropGroupPropList: PropGroup[] = [
  { groupKey: 'background', text: '背景', keys: ['backgroundColor', 'backgroundSize', 'backgroundRepeat', 'backgroundImage', 'height'] },
] as const
