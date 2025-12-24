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
