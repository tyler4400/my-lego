import { Module } from '@nestjs/common'
import { RedisModule } from '@/common/cache/redis.module'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { MetaModule } from '@/common/meta/meta.module'
import { StaticAssetsModule } from '@/common/static/static-assets.module'
import { UploadModule } from '@/common/upload/upload.module'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { OauthModule } from '@/module/oauth/oauth.module'
import { TestModule } from '@/module/test/test.module'
import { UserModule } from '@/module/user/user.module'
import { WorkModule } from '@/module/work/work.module'

@Module({
  imports: [
    ConfigModule,
    MetaModule,
    LoggerModule,
    StaticAssetsModule,
    MongoModule,
    AuthModule,
    RedisModule,
    /**
     * TestModule 始终注册，但通过 Guard 控制是否生效：
     * - TEST_MODULE_ON=true 且非 production：开放 /test/* 测试端点
     * - 否则：/test/* 返回 404
     */
    TestModule,
    UploadModule,

    /* biz modules */
    OauthModule,
    UserModule,
    WorkModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
