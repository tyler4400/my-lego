import type { Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import type { UserPayload } from '@/types/type'
import { hashPassword, verifyPassword } from '@my-lego/shared'
import { Injectable } from '@nestjs/common'
import { HttpStatus } from '@nestjs/common/enums/http-status.enum'
import { JwtService } from '@nestjs/jwt'
import { InjectModel } from '@nestjs/mongoose'
import { RedisService } from '@/common/cache/redis.service'
import { BizException } from '@/common/error/biz.exception'
import { User } from '@/database/mongo/schema/user.schema'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  private readonly VERIFY_CODE_TTL_SECONDS = 60

  /**
   * 邮箱注册（严格邮箱）
   */
  async createByEmail(username: string, password: string) {
    const existedUser = await this.userModel.findOne({ username })
    if (existedUser) {
      throw new BizException({ errorKey: 'createUserAlreadyExists' })
    }

    const passwordHash = await hashPassword(password)
    const created = await this.userModel.create({
      username, // 邮箱登录的时候，username就是邮箱
      email: username,
      password: passwordHash,
      type: 'email',
    } satisfies User)

    // 双保险：由于 create 返回的 doc 可能包含 password（内存字段），这里再查一次拿“默认不含 password”版本
    const safeUser = await this.userModel.findById(created._id)
    if (!safeUser) {
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    return safeUser
  }

  /**
   * 邮箱登录（返回 token + 用户信息）
   */
  async loginByEmail(username: string, password: string) {
    const userWithPassword = await this.userModel.findOne({ username }).select('+password')
    if (!userWithPassword || !userWithPassword.password) {
      throw new BizException({ errorKey: 'loginCheckFailInfo' })
    }

    const isValid = await verifyPassword(password, userWithPassword.password)
    if (!isValid) {
      throw new BizException({ errorKey: 'loginCheckFailInfo' })
    }

    if (!userWithPassword.id) {
      // 约定：JWT payload 必须是 { id, username }，这里缺 id 视为异常
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    const accessToken = await this.jwtService.signAsync({
      id: userWithPassword.id,
      username: userWithPassword.username,
    })

    const safeUser = await this.userModel.findById(userWithPassword._id)
    if (!safeUser) {
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    return { accessToken, userInfo: safeUser }
  }

  /**
   * 发送短信验证码（直接返回验证码，便于调试）
   */
  async sendVerifyCode(phoneNumber: string) {
    const key = this.getPhoneVerifyCodeKey(phoneNumber)
    const preVerifyCode = await this.redisService.get(key)
    if (preVerifyCode) {
      throw new BizException({ errorKey: 'sendVeriCodeFrequentlyFailInfo' })
    }

    const verifyCode = `${Math.floor(Math.random() * 9000 + 1000)}`
    await this.redisService.set(key, verifyCode, this.VERIFY_CODE_TTL_SECONDS)

    return { verifyCode }
  }

  /**
   * 手机号 + 验证码 登录：
   * - 校验成功后删除验证码 key（避免复用）
   * - 若手机号未注册，则自动创建用户并登录
   */
  async loginByCellphone(phoneNumber: string, verifyCode: string) {
    const key = this.getPhoneVerifyCodeKey(phoneNumber)
    const preVerifyCode = await this.redisService.get(key)

    // 验证码是否正确（缺失也视为不正确）
    if (!preVerifyCode || preVerifyCode.toString() !== verifyCode.toString()) {
      throw new BizException({ errorKey: 'loginVeriCodeIncorrectFailInfo' })
    }

    // 校验成功后删除
    await this.redisService.del(key)

    const existedUser = await this.userModel.findOne({ username: phoneNumber })
    if (existedUser) {
      if (!existedUser.id) throw new BizException({ errorKey: 'unknownValidateFail' })

      const accessToken = await this.jwtService.signAsync({
        id: existedUser.id,
        username: existedUser.username,
      })
      return { accessToken, userInfo: existedUser }
    }

    const newUser = await this.userModel.create({
      username: phoneNumber,
      phoneNumber,
      nickName: `乐高${phoneNumber.slice(-4)}`,
      type: 'cellphone',
    } satisfies User)

    const safeUser = await this.userModel.findById(newUser._id)
    if (!safeUser || !safeUser.id) {
      throw new BizException({ errorKey: 'unknownValidateFail' })
    }

    const accessToken = await this.jwtService.signAsync({ id: safeUser.id, username: safeUser.username })
    return { accessToken, userInfo: safeUser }
  }

  /**
   * 获取当前用户信息（JWT 保护）
   */
  async me(payload: UserPayload) {
    const user = await this.userModel.findOne({ id: payload.id })
    if (!user) {
      // token 存在但用户不存在：按登录失效处理
      throw new BizException({ errorKey: 'loginValidateFail', httpStatus: HttpStatus.UNAUTHORIZED })
    }

    return user
  }

  private getPhoneVerifyCodeKey(phoneNumber: string) {
    return `user.phoneVerify.${phoneNumber}`
  }
}
