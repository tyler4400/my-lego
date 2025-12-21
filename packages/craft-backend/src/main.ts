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

  const port = configService.get<number>('PORT', 3000)

  await app.listen(port)
  console.log(`Craft backend listening on http://localhost:${port}/`)
}

bootstrap()
