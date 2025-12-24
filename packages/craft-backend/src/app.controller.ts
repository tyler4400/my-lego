import type { Connection, Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import type { WorkDocument } from '@/database/mongo/schema/work.schema'
import { randomUUID } from 'node:crypto'
import { BadRequestException, Body, Controller, Get, Inject, Logger, Post, Query, UnauthorizedException, Version } from '@nestjs/common'
import { InjectConnection, InjectModel } from '@nestjs/mongoose'
import { IsEmail, IsString, MinLength } from 'class-validator'
import { WINSTON_MODULE_PROVIDER } from 'nest-winston'
import { AppService } from '@/app.service'
import { RedisService } from '@/common/cache/redis.service'
import { BizException } from '@/common/error/biz.exception'
import { User } from '@/database/mongo/schema/user.schema'
import { Work } from '@/database/mongo/schema/work.schema'

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

    return { user: user.toJSON(), work: work.toJSON() }
  }

  /**
   * Demo 场景（用于学习与联调）：
   * - A：成功返回（由 MetaResponseInterceptor 统一包装）
   * - B：业务异常 BizException（由 MetaExceptionFilter 的 Biz 分支包装）
   * - C：DTO 校验失败（ValidationPipe -> BizException(userValidateFail)）
   * - D：系统异常（BadRequestException / UnauthorizedException，走 HttpException 分支）
   */

  /**
   * 场景 A：成功返回（HTTP 200，body.code=0）
   */
  @Get('/demo/success')
  demoSuccess() {
    return { hello: 'world', from: 'demo' }
  }

  /**
   * 场景 B：业务异常（默认 HTTP 200，但 body.code=errno）
   */
  @Get('/demo/biz-exception')
  demoBizException() {
    throw new BizException({ errorKey: 'createUserAlreadyExists' })
  }

  /**
   * 场景 C：DTO 校验失败（HTTP 400，body.code=101001）
   */
  @Post('/demo/validate')
  demoValidate(@Body() dto: DemoValidateDto) {
    // 如果请求体不合法（如 email 非邮箱、password 太短），会在进入该方法前抛出 BizException
    return { received: dto }
  }

  /**
   * 场景 D-1：系统异常 BadRequestException（HTTP 400，body.code=400）
   */
  @Get('/demo/bad-request')
  demoBadRequest() {
    throw new BadRequestException('演示：参数不合法')
  }

  /**
   * 场景 D-2：系统异常 UnauthorizedException（HTTP 401，body.code=401）
   */
  @Get('/demo/unauthorized')
  demoUnauthorized() {
    throw new UnauthorizedException('演示：未登录或 token 无效')
  }
}
