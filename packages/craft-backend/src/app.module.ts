import { Module } from '@nestjs/common'
import { AppController } from '@/app.controller'
import { AppService } from '@/app.service'
import { ConfigModule } from '@/common/config/config.module'
import { LoggerModule } from '@/common/logger/logger.module'
import { AuthModule } from '@/module/auth/auth.module'

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
