import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { GithubOauthService } from '@/module/oauth/github-oauth.service'
import { OauthStateService } from '@/module/oauth/oauth-state.service'
import { OauthController } from '@/module/oauth/oauth.controller'

@Module({
  imports: [
    // 需要注入 User/Work 对应的 Mongoose Model，因此引入 MongoModule。
    MongoModule,
    /* 通过 AuthTokenService 统一签发 token（AuthModule exports AuthTokenService） */
    AuthModule,
  ],
  controllers: [OauthController],
  providers: [OauthStateService, GithubOauthService],
})
export class OauthModule {}
