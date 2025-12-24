import type { MiddlewareConsumer, NestModule } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { MetaContextMiddleware } from '@/common/meta/meta-context.middleware'
import { MetaExceptionFilter } from '@/common/meta/meta-exception.filter'
import { MetaFlagGuard } from '@/common/meta/meta-flag.guard'
import { MetaResponseInterceptor } from '@/common/meta/meta.interceptor'

/**
 * MetaModule：注册全局 MetaResponse 体系。
 * - Middleware：注入 traceId/requestTime/version/protocol
 * - Guard：提前把 SkipMetaRes 标记写入 req，供 Filter 使用
 * - Interceptor：成功响应统一包装
 * - Filter：异常响应统一包装（并保持 401/404/500 等 HTTP status）
 *
 * APP_GUARD / APP_INTERCEPTOR / APP_FILTER 是什么概念？做什么用？
 * 它们是从 @nestjs/core 导出的全局增强器（Global Enhancer）注册 Token（本质是 Nest 的 DI 注入 token）。
 * 它们和 main.ts 里 app.useGlobalGuards(...) / app.useGlobalInterceptors(...) / app.useGlobalFilters(...) 的目标一致，
 * 注册为全局 Guard / 全局 Interceptor / 全局 Exception Filter  但 APP_* 的优势是：
 * 更模块化：你可以把一整套“全局响应体系”封装成一个 MetaModule，在 AppModule 里引一次就生效。
 * 更适合 DI：这些类可以正常注入 ConfigService、Reflector 等依赖（你这里就大量用到了）。
 * 更利于复用/测试：把横切能力当成模块能力管理，而不是散落在 main.ts。
 */
@Global()
@Module({
  providers: [
    MetaContextMiddleware,
    { provide: APP_GUARD, useClass: MetaFlagGuard },
    { provide: APP_INTERCEPTOR, useClass: MetaResponseInterceptor },
    { provide: APP_FILTER, useClass: MetaExceptionFilter },
  ],
})
export class MetaModule implements NestModule {
  /**
   * 这个写法是nestjs的应用中间件写法，参见文档：
   * https://docs.nestjs.cn/overview/middlewares#%E5%BA%94%E7%94%A8%E4%B8%AD%E9%97%B4%E4%BB%B6
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetaContextMiddleware).forRoutes('*')
  }
}
