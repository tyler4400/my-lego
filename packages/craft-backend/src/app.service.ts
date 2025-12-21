import { isFunction } from '@my-lego/shared'
import { Get, Inject, Injectable, Logger } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'

@Injectable()
export class AppService {
  constructor(

    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
  }

  getHello(): string {
    const aa = isFunction(12)

    this.logger.verbose(`aa 是不是一个方法${aa}`)

    return `Hello World ～！ - ${aa}`
  }

  @Get('/error')
  getError() {
    throw new Error('An error occurred')
  }
}
