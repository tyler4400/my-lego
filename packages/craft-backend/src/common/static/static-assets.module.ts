import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ensureDirSync } from '@/utils/fs'
import { resolveRuntimeUploadRootPath } from './static-assets.utils'
import { StaticOriginAllowMiddleware } from './static-origin-allow.middleware'

/**
 * StaticAssetsModule：临时静态资源服务模块（用于承载前端上传后的资源文件）。
 *
 * 访问方式：
 * - 物理目录：`packages/craft-backend/static/*`
 * - URL 前缀：`/static/*`
 *
 * 说明：
 * - 这里使用 @nestjs/serve-static（官方推荐方案），参考文档：
 *   https://docs.nestjs.cn/recipes/serve-static
 */
@Module({
  imports: [
    ServeStaticModule.forRootAsync({
      useFactory: () => {
        // 运行时上传根目录：确保目录存在（避免首次访问/上传时才创建导致排查困难）
        const runtimeUploadRoot = resolveRuntimeUploadRootPath()
        ensureDirSync(runtimeUploadRoot)

        return [
          /**
           * 1) 运行时上传数据（更具体的路径前缀放在前面）
           * - /static/upload/** => ${RUNTIME_DATA_ROOT_PATH}/upload/**
           */
          {
            rootPath: runtimeUploadRoot,

            /**
             * serveRoot：静态资源的 URL 前缀。
             * - 例：rootPath 下的 `a.png` 将被暴露为 `GET /static/a.png`
             * - 推荐始终使用固定前缀，避免污染站点根路径 `/`
             */
            serveRoot: '/static/upload',

            /**
             * renderPath：用于“渲染静态应用（SPA）”的路径。
             * - 默认值是通配（相当于对很多路径回退到 index.html），更适合 SPA
             * - 本项目只需要“文件托管”，不需要 SPA 回退
             * - renderPath 必须是 string 因此用一个永不匹配的字符串禁用该能力，避免误吞路由/返回 index.html
             */
            renderPath: '/__static_render_disabled_random45683452679__',

            /**
             * useGlobalPrefix：是否在静态资源路径前拼接 `app.setGlobalPrefix()` 的前缀。
             * - 当前后端全局前缀为 /api（用于 controller）
             * - 静态资源希望挂在站点根路径下的 /static
             * - 因此必须为 false（否则会变成 /api/static）
             */
            useGlobalPrefix: false,

            /**
             * serveStaticOptions：传递给底层的 express.static 的配置项。
             * - 这些配置只影响“静态文件的响应行为”（缓存、index、dotfile、header 等）
             */
            serveStaticOptions: {
              /**
               * index：是否允许目录默认返回 index.html。
               * - 我们不托管 SPA，也不希望访问 /static/ 返回目录 index，因此关闭
               */
              index: false,

              /**
               * dotfiles：遇到点文件（以 . 开头）如何处理。
               * - deny：直接 403，更安全
               */
              dotfiles: 'deny',

              /**
               * redirect：当请求的是目录且不以 / 结尾时，是否自动重定向到带 / 的路径。
               * - 关闭可以减少非预期重定向行为
               */
              redirect: false,

              /**
               * fallthrough：当文件不存在时，是否“继续向下”交给后续路由处理。
               * - true：找不到静态文件就交给 Nest 其他路由/最终 404
               * - false：会在静态层面直接处理错误
               */
              fallthrough: true,

              /**
               * cacheControl：是否自动设置 Cache-Control 头。
               * - 默认 true；这里显式写出来，便于阅读
               */
              cacheControl: true,

              /**
               * immutable：是否在 Cache-Control 中追加 immutable。
               * - 适合“文件名带 hash、内容永不变”的资源
               */
              immutable: true,

              /**
               * maxAge：缓存时长（毫秒或 ms 字符串，如 "30d"）。
               * - 你们上传时会给文件名加 hash，资源内容不会变，非常适合长缓存
               */
              maxAge: '30d',

              /**
               * setHeaders：为静态资源响应设置自定义 header（同步执行）。
               * - 这里仅加 `X-Content-Type-Options: nosniff`，减少浏览器 MIME 猜测带来的风险
               */
              setHeaders: (res: any) => {
                res.setHeader('X-Content-Type-Options', 'nosniff')
              },
            },
          },

          /**
           * 2) 随代码发布的静态资源（维持现状，不改名）
           * - /static/** => dist/craft-backend/static/**
           */
          {
            /**
             * rootPath：静态文件的物理根目录（绝对路径）。
             * - packages/craft-backend/dist/craft-backend/static（由 nest-cli assets 拷贝）
             */
            rootPath: runtimeUploadRoot,
            serveRoot: '/static',
            renderPath: '/__static_render_disabled_random45683452679__',
            useGlobalPrefix: false,
            serveStaticOptions: {
              index: false,
              dotfiles: 'deny',
              redirect: false,
              fallthrough: true,
              cacheControl: true,
              immutable: true,
              maxAge: '30d',

              setHeaders: (res: any) => {
                res.setHeader('X-Content-Type-Options', 'nosniff')
              },
            },
          },
        ]
      },
    }),
  ],
  providers: [StaticOriginAllowMiddleware],
})
export class StaticAssetsModule {}
