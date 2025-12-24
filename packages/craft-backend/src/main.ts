import { VERSION_NEUTRAL, VersioningType } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { createGlobalValidationPipe } from '@/common/validation/validation.pipe'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
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
