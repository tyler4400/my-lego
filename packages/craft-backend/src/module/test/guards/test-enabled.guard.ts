import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

/**
 * TestEnabledGuard：用于控制 TestModule 下的测试专用端点是否生效。
 *
 * 设计目标：
 * - 默认关闭（避免误暴露）
 * - 生产环境强制关闭
 * - 关闭时返回 404（更符合“接口不存在”的语义）
 */
@Injectable()
export class TestEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(): true {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')
    if (nodeEnv === 'production') {
      throw new NotFoundException()
    }

    const testModuleFlag = this.configService.get<string>('TEST_MODULE_ON', 'false')
    if (testModuleFlag !== 'true') {
      throw new NotFoundException()
    }

    return true
  }
}
