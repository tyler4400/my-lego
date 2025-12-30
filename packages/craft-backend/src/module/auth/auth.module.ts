import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthTokenService } from '@/module/auth/auth-token.service'
import { JwtStrategy } from './strategy/jwt.strategy'

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      // global: true, // JwtService 全局可用
      useFactory: (configService: ConfigService) => {
        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: '1d',
          },
        }
      },
    }),
  ],
  /**
   * 注意：
   * - 之前的 `GET /auth/me` 属于联调示例接口，已迁移到 TestModule（/test/auth/me）
   * - AuthModule 仍然负责注册 JwtStrategy/JwtModule，供业务模块签发与校验 JWT 使用
   */
  controllers: [],
  providers: [JwtStrategy, AuthTokenService],
  exports: [JwtModule, AuthTokenService],
})
export class AuthModule {}
