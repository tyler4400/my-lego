import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { UserController } from '@/module/user/user.controller'
import { UserService } from '@/module/user/user.service'

@Module({
  imports: [
    /**
     * 需要注入 User/Work 对应的 Mongoose Model，因此引入 MongoModule。
     */
    MongoModule,
    AuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
