import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

// 启动时就能发现漏配，而不是运行中报错
const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production').default('development'),
  PORT: Joi.number().default(3000),

  CORS: Joi.string().valid('true', 'false').default('true'),
  PREFIX: Joi.string().default('/api'),
  VERSION: Joi.string().optional(),

  LOG_ON: Joi.string().valid('true', 'false').default('true'),

  JWT_SECRET: Joi.string().required(),

  TEST_MODULE_ON: Joi.string().valid('true', 'false').default('false'),

  /* GitHub */
  GITHUB_OAUTH_CLIENT_ID: Joi.string().required(),
  GITHUB_OAUTH_CLIENT_SECRET: Joi.string().required(),
  GITHUB_OAUTH_CALLBACK_URL: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().required(),

  /**
   * Mongo 索引同步开关：
   * - true：启动时执行 Model.syncIndexes()（会删除 DB 中“Schema 未声明”的索引）
   * - false：不执行索引同步
   *
   * 默认行为在 `MongoIndexSyncService` 中实现：
   * - development：默认 true
   * - production：默认 false
   */
  MONGO_SYNC_INDEXES: Joi.string().valid('true', 'false').optional(),
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
