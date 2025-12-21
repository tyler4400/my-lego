import { ValidationPipe, VERSION_NEUTRAL, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpAdapterHost, NestFactory } from '@nestjs/core'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { AllExceptionFilter } from '@/common/all-exception/all-exception.filter'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // 使用 Winston 作为 Nest Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  // 启用全局异常过滤器
  const errorFilterFlag = configService.get<string>('ERROR_FILTER', 'true')
  if (errorFilterFlag === 'true') {
    const httpAdapterHost = app.get(HttpAdapterHost)
    app.useGlobalFilters(new AllExceptionFilter(httpAdapterHost))
  }

  // 全局校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除 DTO 中未声明的多余字段。
      // 遇到多余字段直接抛错（更严格、更安全）。
      // forbidNonWhitelisted: true
      // transform: 自动转换请求对象到 DTO 实例
      transform: true,
      transformOptions: {
        // 允许类转换器隐式转换字段类型，如将字符串转换为数字等。
        enableImplicitConversion: true,
      },
    }),
  )

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

  // 4. CORS 开关
  const corsFlag = configService.get<string>('CORS', 'true')
  if (corsFlag === 'true') {
    app.enableCors({
      // 配置文档： https://github.com/expressjs/cors#configuration-options
      origin: true, // 后面可以根据前端域名做更严格配置
      credentials: true,
    })
  }

  const port = configService.get<number>('PORT', 3000)

  await app.listen(port)
  console.log(`Craft backend listening on http://localhost:${port}/`)
}

bootstrap()
