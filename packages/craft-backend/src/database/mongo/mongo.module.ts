import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose'
import type { Connection } from 'mongoose'
import AutoIncrementFactory from 'mongoose-sequence'
import { User, UserSchema } from '@/database/mongo/schema/user.schema'
import { Work, WorkSchema } from '@/database/mongo/schema/work.schema'

@Module({
  imports: [
    /**
     * 与 nest-template 保持一致：使用 forRootAsync + ConfigService 注入动态配置。
     *
     * 注意：
     * - 如果你的 Mongo 用户不是在目标 DB 中创建的，可能需要在 uri 追加 `?authSource=admin`
     *   这点在 `.env-example` 里也有提示。
     */
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.getOrThrow<string>('MONGO_DB_LEGO_URL')
        const user = configService.get<string>('MONGO_DB_LEGO_USERNAME')
        const pass = configService.get<string>('MONGO_DB_LEGO_PASSWORD')

        return { uri, user, pass }
      },
    }),
    /**
     * 在此处注册 User / Work，保证全局可注入对应 Model：
     * - @InjectModel(User.name)
     * - @InjectModel(Work.name)
     */
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const schema = UserSchema
          const AutoIncrement = AutoIncrementFactory(connection)
          schema.plugin(AutoIncrement, { inc_field: 'id', id: 'users_id_counter' })
          return schema
        },
      },
      {
        name: Work.name,
        inject: [getConnectionToken()],
        useFactory: (connection: Connection) => {
          const schema = WorkSchema
          const AutoIncrement = AutoIncrementFactory(connection)
          schema.plugin(AutoIncrement, { inc_field: 'id', id: 'works_id_counter' })
          return schema
        },
      },
    ]),
  ],
  exports: [MongooseModule],
})
export class MongoModule {}
