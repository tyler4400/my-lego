import router from '@/router'
import { setupRouterGuards } from '@/router/guards'
import { setupHttpHandler } from './httpHandler'

/**
 * 业务胶水层
 * 将 UI ，或 具体业务store 和 基础能力（如api， 路由）耦合在一起
 *
 * 注册所有全局事件订阅
 * - 在 main.ts 中调用一次（必须在 app.use(pinia) 与 app.use(router) 之后）
 * - 未来新增的 xxx-handler 在此统一挂载
 */
export const setupEventHandlers = () => {
  setupHttpHandler()
  setupRouterGuards(router)
}
