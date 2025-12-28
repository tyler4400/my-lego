import { Module } from '@nestjs/common'
import { MongoModule } from '@/database/mongo/mongo.module'
import { TestEnabledGuard } from '@/module/test/guards/test-enabled.guard'
import { TestAuthController } from '@/module/test/test-auth.controller'
import { TestController } from '@/module/test/test.controller'
import { TestService } from '@/module/test/test.service'

/**
 * TestModule：测试专用模块
 *
 * 说明：
 * - 统一以 /test 为路由前缀（见各 Controller）
 * - 是否生效由 TestEnabledGuard 控制（禁用时返回 404）
 */
@Module({
  imports: [
    /**
     * MongoModule 非全局模块：
     * - TestController 需要注入 @InjectConnection/@InjectModel
     * - 因此在 TestModule 显式导入，确保相关 provider 可见
     */
    MongoModule,
  ],
  controllers: [TestController, TestAuthController],
  providers: [TestService, TestEnabledGuard],
})
export class TestModule {}

