import { setupHttpHandler } from './http-handler'

/**
 * 注册所有全局事件订阅
 * - 在 main.ts 中调用一次（必须在 app.use(pinia) 与 app.use(router) 之后）
 * - 未来新增的 xxx-handler 在此统一挂载
 */
export const setupEventHandlers = () => {
  setupHttpHandler()
}
