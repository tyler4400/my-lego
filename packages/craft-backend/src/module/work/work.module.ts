import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { WorkController } from '@/module/work/work.controller'
import { WorkService } from '@/module/work/work.service'

@Module({
  imports: [MongoModule, AuthModule],
  controllers: [WorkController],
  providers: [WorkService],
})
export class WorkModule {}
