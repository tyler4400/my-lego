import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { AuthModule } from '@/module/auth/auth.module'
import { WorkAbilityFactory } from '@/module/work/casl/work-ability.factory'
import { WorkPolicyGuard } from '@/module/work/casl/work-policy.guard'
import { WorkController } from '@/module/work/work.controller'
import { WorkService } from '@/module/work/work.service'
import { WorkChannelService } from '@/module/work/workChannel.service'
import { WorkToH5Service } from '@/module/work/workToH5.service'

@Module({
  imports: [MongoModule, AuthModule],
  controllers: [WorkController],
  providers: [WorkService, WorkToH5Service, WorkChannelService, WorkAbilityFactory, WorkPolicyGuard],
})
export class WorkModule {}
