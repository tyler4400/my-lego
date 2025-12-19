import { isFunction } from '@my-lego/shared'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    const aa = isFunction(12)
    return `Hello World ～！ - ${aa}`
  }
}
