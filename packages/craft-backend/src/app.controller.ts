import type { Connection, Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import type { WorkDocument } from '@/database/mongo/schema/work.schema'
import { randomUUID } from 'node:crypto'
import { Body, Controller, Get, Inject, Logger, Post, Query, Version } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { AppService } from '@/app.service'
import { RedisService } from '@/common/cache/redis.service'
import { User } from '@/database/mongo/schema/user.schema'
import { Work } from '@/database/mongo/schema/work.schema'

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redisService: RedisService,
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Work.name) private readonly workModel: Model<WorkDocument>,
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

  /**
   * Mongo 连通性检测（阶段 1：用于快速验证 @nestjs/mongoose 集成是否成功）
   */
  @Get('/mongo-ping')
  async mongoPing() {
    const readyState = this.mongoConnection.readyState

    if (readyState !== 1 || !this.mongoConnection.db) {
      return {
        code: 200,
        data: { readyState, connected: false },
        message: 'Mongo is not connected yet',
      }
    }

    const pingResult = await this.mongoConnection.db.admin().ping()
    const userCount = await this.userModel.countDocuments()
    const workCount = await this.workModel.countDocuments()

    return {
      code: 200,
      data: {
        readyState,
        pingResult,
        counts: { userCount, workCount },
      },
      message: 'Mongo ping successfully',
    }
  }

  /**
   * Mongo 快速写入测试数据（阶段 1：验证 schema / 自增 id）
   *
   * - 如果 username 已存在，则复用旧用户
   * - 每次都会创建一条新的 work（uuid 唯一）
   */
  @Post('/mongo-seed')
  async mongoSeed(@Body('username') username?: string) {
    const safeUsername = username?.trim() || `mongo_user_${Date.now()}`

    const existedUser = await this.userModel.findOne({ username: safeUsername })
    const user = existedUser
      ?? await this.userModel.create({
        username: safeUsername,
        // 仅用于写入测试 password，阶段 2 会替换为 bcrypt hash
        password: 'seed_only_password',
        email: safeUsername.includes('@') ? safeUsername : undefined,
        type: 'email',
      })

    const uuid = randomUUID()
    const work = await this.workModel.create({
      uuid,
      title: `测试作品-${uuid.slice(0, 8)}`,
      desc: 'mongo seed work',
      author: safeUsername,
      copiedCount: 0,
      status: 1,
      user: user._id,
      channels: [],
      content: {},
    })

    return {
      code: 200,
      data: {
        user: user.toJSON(),
        work: work.toJSON(),
      },
      message: 'Mongo seed successfully',
    }
  }
}
