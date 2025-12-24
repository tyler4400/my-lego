import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { RedisModule } from '@/common/cache/redis.module'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { MetaModule } from '@/common/meta/meta.module'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { UserModule } from '@/module/user/user.module'

@Module({
  imports: [
    ConfigModule,
    MetaModule,
    LoggerModule,
    MongoModule,
    AuthModule,
    UserModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
