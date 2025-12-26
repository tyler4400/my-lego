import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().default(3000),

  CORS: Joi.string().valid('true', 'false').default('true'),
  PREFIX: Joi.string().default('/api'),
  VERSION: Joi.string().optional(),

  LOG_ON: Joi.string().valid('true', 'false').default('true'),

  JWT_SECRET: Joi.string().required(),

  /**
   * 测试模块开关：
   * - true：启用 /test 下的测试专用端点
   * - false：禁用（所有 /test 端点返回 404，避免在生产环境暴露）
   */
  TEST_MODULE_ON: Joi.string().valid('true', 'false').default('false'),
})

// 指定数组时， 如果一个变量在多个文件中被找到，则以第一个为准。
const envFilePath = [`.env.${process.env.NODE_ENV || 'development'}`, '.env']

@Module({
  imports: [
    NestConfigModule.forRoot({
      envFilePath,
      isGlobal: true, // ConfigService 全局可用
      validationSchema,
    }),
  ],
})
export class ConfigModule {}
