import type { NestExpressApplication } from '@nestjs/platform-express'
import path from 'node:path'
import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { StaticOriginAllowMiddleware } from '@/common/static/static-origin-allow.middleware'
import { createGlobalValidationPipe } from '@/pipe/validation.pipe'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const configService = app.get(ConfigService)

  // 使用 Winston 作为 Nest Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  // 全局校验管道
  // 说明：Validation 失败会被转换为 BizException（userValidateFail），并进入 MetaResponse 体系
  app.useGlobalPipes(createGlobalValidationPipe())

  // 全局前缀 + 版本
  const prefix = configService.get<string>('PREFIX', '/api')
  const version = configService.get<string>('VERSION')
  let versions: string[] = []

  if (typeof version === 'string' && version.length > 0) {
    versions = version.includes(',') ? version.split(',') : [version]
  }

  app.setGlobalPrefix(prefix)

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: versions.length === 0 ? VERSION_NEUTRAL : versions,
  })

  // CORS 开关
  const corsFlag = configService.get<string>('CORS', 'true')
  if (corsFlag === 'true') {
    app.enableCors({
      // 配置文档： https://github.com/expressjs/cors#configuration-options
      origin: true, // 后面可以根据前端域名做更严格配置
      credentials: true,
    })
  }

  /**
   * 静态资源来源限制（非常重要）：
   *
   * 为什么不放在 StaticAssetsModule.configure(consumer.apply...) 里？
   * - @nestjs/serve-static 会在 onModuleInit() 阶段直接对 Express app 注册：
   *   app.use('/static', express.static(...))
   * - 如果我们用 consumer.apply() 绑定 Nest Middleware，有概率会排在静态中间件之后，
   *   请求被 express.static 直接处理掉，导致中间件完全不执行（你遇到的“没日志、没拦截”现象）。
   * - 因此这里用 app.use('/static', ...) 把校验挂到 Express 层，并且在 app.listen 之前注册，
   *   以保证“所有 /static 请求一定先过校验”。
   */
  const staticOriginAllowMiddleware = app.get(StaticOriginAllowMiddleware)
  app.use('/static', (req, res, next) => staticOriginAllowMiddleware.use(req, res, next))

  // 使用模板渲染 https://docs.nestjs.cn/techniques/mvc
  app.setBaseViewsDir(path.join(__dirname, '..', 'views'))
  app.setViewEngine('hbs')

  const port = configService.get<number>('PORT', 3000)

  await app.listen(port)
  console.log(`Craft backend listening on http://localhost:${port}/`)
}

bootstrap()
