import { Module } from '@nestjs/common'
import { UploadController } from '@/common/upload/upload.controller'
import { AuthModule } from '@/module/auth/auth.module'

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
})
export class UploadModule {}
