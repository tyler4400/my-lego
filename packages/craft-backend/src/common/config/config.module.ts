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
   * 静态资源允许的来源（Origin）白名单：
   * - 为空/未配置：不做任何 Origin 限制（完全放开）
   * - 配置后：仅允许白名单内的 Origin 访问 /static/* 资源（尽力而为：优先使用 Origin，其次尝试从 Referer 推导）
   *
   * 推荐配置形式：
   * - JSON 数组：["http://localhost:5173","https://your-frontend.com"]
   * - 或逗号分隔字符串：http://localhost:5173,https://your-frontend.com
   */
  STATIC_ALLOWED_ORIGINS: Joi.string().optional().allow(''),

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
