import { isFunction } from '@my-lego/shared'
import { Injectable, Logger } from '@nestjs/common'

/**
 * TestService：承载测试模块里的轻量逻辑。
 * 说明：这里的能力仅用于联调/验证，不应被生产业务依赖。
 */
@Injectable()
export class TestService {
  private readonly logger = new Logger(TestService.name)

  getHello(): string {
    const isFn = isFunction(12)
    this.logger.verbose(`isFunction(12) 的结果：${isFn}`)
    return `Hello World ～！ - ${isFn}`
  }
}

