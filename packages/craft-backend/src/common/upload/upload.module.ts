import { Module } from '@nestjs/common'
import { UploadController } from '@/common/upload/upload.controller'
import { UploadService } from '@/common/upload/upload.service'
import { AuthModule } from '@/module/auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
