import { Controller, Get, Inject, Logger, Post, Query, Version } from '@nestjs/common'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { AppService } from '@/app.service'
import { RedisService } from '@/common/cache/redis.service'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  @Post()
  @Version('2')
  testVersion(): string {
    return 'this is version 2'
  }

  @Get('/error')
  getError() {
    throw new Error('An error occurred')
    // return 123
  }

  @Get('/ping')
  async ping(): Promise<string> {
    const redisPing = await this.redisService.ping()
    this.logger.debug(`Redis ping ${redisPing}`)
    return `
      \n redis服务:  ${redisPing === 'PONG' ? '✅' : '❌'}  ${redisPing}
    `
  }

  @Get('/get-redis')
  async testRedis(@Query('key') key: string): Promise<string> {
    const value = await this.redisService.get(key)
    return `redis获取的${key}的值是:${JSON.stringify(value)}`
  }

  @Get('/set-redis')
  async testRedis2(@Query('value') val: string): Promise<string> {
    await this.redisService.set('nest-template', val)
    return `redis设置成功`
  }
}
