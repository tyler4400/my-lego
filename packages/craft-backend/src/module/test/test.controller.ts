import type { Connection, Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import type { WorkDocument } from '@/database/mongo/schema/work.schema'
import { randomUUID } from 'node:crypto'
import { BadRequestException, Body, Controller, Get, Logger, Post, Query, UnauthorizedException, UseGuards, Version } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { IsEmail, IsString, MinLength } from 'class-validator'
import { RedisService } from '@/common/cache/redis.service'
import { BizException } from '@/common/error/biz.exception'
import { User } from '@/database/mongo/schema/user.schema'
import { Work } from '@/database/mongo/schema/work.schema'
import { TestEnabledGuard } from '@/module/test/guards/test-enabled.guard'
import { TestService } from '@/module/test/test.service'

/**
 * DemoValidateDto：用于演示全局 ValidationPipe 的 DTO 校验失败场景。
 *
 * 注意：
 * - 校验失败会在 ValidationPipe.exceptionFactory 阶段被转换为 BizException(userValidateFail)
 * - 最终会由 MetaExceptionFilter 统一包装成 MetaResponse
 */
class DemoValidateDto {
  @IsEmail({}, { message: 'email 格式不正确' })
  email!: string

  @IsString({ message: 'password 必须是字符串' })
  @MinLength(6, { message: 'password 长度不能少于 6 位' })
  password!: string
}

/**
 * TestController：测试/联调专用接口（统一挂载在 /test 下）。
 *
 * 说明：
 * - 这些接口不会在生产环境对外提供（由 TestEnabledGuard 控制）
 * - 主要用于快速验证基础设施（redis/mongo）、全局拦截器/过滤器、校验管道等
 */
@UseGuards(TestEnabledGuard)
@Controller('test')
export class TestController {
  private readonly logger = new Logger(TestController.name)

  constructor(
    private readonly testService: TestService,
    private readonly redisService: RedisService,
    @InjectConnection() private readonly mongoConnection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Work.name) private readonly workModel: Model<WorkDocument>,
  ) {}

  @Get()
  getHello(): string {
    return this.testService.getHello()
  }

  @Post()
  @Version('2')
  testVersion(): string {
    return 'this is version 2'
  }

  @Get('error')
  getError() {
    // 用于测试全局异常过滤器（MetaExceptionFilter）对未知异常的处理
    throw new Error('An error occurred')
  }

  @Get('ping')
  async ping(): Promise<string> {
    const redisPing = await this.redisService.ping()
    this.logger.debug(`Redis ping: ${redisPing}`)

    return `\n redis服务:  ${redisPing === 'PONG' ? '✅' : '❌'}  ${redisPing}\n`
  }

  @Get('get-redis')
  async getRedis(@Query('key') key: string): Promise<string> {
    const value = await this.redisService.get(key)
    return `redis获取的${key}的值是:${JSON.stringify(value)}`
  }

  @Get('set-redis')
  async setRedis(@Query('value') value: string): Promise<string> {
    await this.redisService.set('nest-template', value)
    return 'redis设置成功'
  }

  /**
   * Mongo 连通性检测：用于快速验证 @nestjs/mongoose 集成是否成功
   */
  @Get('mongo-ping')
  async mongoPing() {
    const readyState = this.mongoConnection.readyState
    if (readyState !== 1 || !this.mongoConnection.db) {
      return { readyState, connected: false }
    }

    const pingResult = await this.mongoConnection.db.admin().ping()
    const userCount = await this.userModel.countDocuments()
    const workCount = await this.workModel.countDocuments()

    return {
      readyState,
      connected: true,
      pingResult,
      counts: { userCount, workCount },
    }
  }

  /**
   * Mongo 快速写入测试数据：验证 schema / 自增 id
   *
   * - 如果 username 已存在，则复用旧用户
   * - 每次都会创建一条新的 work（uuid 唯一）
   */
  @Post('mongo-seed')
  async mongoSeed(@Body('username') username?: string) {
    const safeUsername = username?.trim() || `mongo_user_${Date.now()}`

    const existedUser = await this.userModel.findOne({ username: safeUsername })
    const user = existedUser
      ?? await this.userModel.create({
        username: safeUsername,
        // 仅用于写入测试 password（生产流程请走正式注册/登录）
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

    return { user: user.toJSON(), work: work.toJSON() }
  }

  /**
   * Demo 场景（用于学习与联调）：
   * - A：成功返回（由 MetaResponseInterceptor 统一包装）
   * - B：业务异常 BizException（由 MetaExceptionFilter 的 Biz 分支包装）
   * - C：DTO 校验失败（ValidationPipe -> BizException(userValidateFail)）
   * - D：系统异常（BadRequestException / UnauthorizedException，走 HttpException 分支）
   */

  @Get('demo/success')
  demoSuccess() {
    return { hello: 'world', from: 'demo' }
  }

  @Get('demo/biz-exception')
  demoBizException() {
    throw new BizException({ errorKey: 'createUserAlreadyExists' })
  }

  @Post('demo/validate')
  demoValidate(@Body() dto: DemoValidateDto) {
    // 如果请求体不合法，会在进入该方法前抛出 BizException(userValidateFail)
    return { received: dto }
  }

  @Get('demo/bad-request')
  demoBadRequest() {
    throw new BadRequestException('演示：参数不合法')
  }

  @Get('demo/unauthorized')
  demoUnauthorized() {
    throw new UnauthorizedException('演示：未登录或 token 无效')
  }
}

