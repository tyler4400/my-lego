import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { WorkController } from '@/module/work/work.controller'
import { WorkService } from '@/module/work/work.service'
import { WorkChannelService } from '@/module/work/workChannel.service'
import { WorkToH5Service } from '@/module/work/workToH5.service'

@Module({
  imports: [MongoModule, AuthModule],
  controllers: [WorkController],
  providers: [WorkService, WorkToH5Service, WorkChannelService],
})
export class WorkModule {}
