import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { RedisModule } from '@/common/cache/redis.module'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { MetaModule } from '@/common/meta/meta.module'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'

@Module({
  imports: [
    ConfigModule,
    MetaModule,
    LoggerModule,
    MongoModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
