import type { InjectionKey } from 'vue'

export const canvasKey: InjectionKey<() => DOMRect | undefined> = Symbol('CanvasRectGetter')
