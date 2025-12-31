import type { Model } from 'mongoose'
import type { UserDocument } from '@/database/mongo/schema/user.schema'
import type { WorkDocument } from '@/database/mongo/schema/work.schema'
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { User } from '@/database/mongo/schema/user.schema'
import { Work } from '@/database/mongo/schema/work.schema'

/**
 * MongoIndexSyncService：在应用启动后按需同步 MongoDB 索引。
 *
 * 设计目标：
 * - 索引定义以 Schema 为准（source of truth）
 * - 开发环境默认开启（减少“历史遗留索引”带来的联调问题）
 * - 生产环境默认关闭，通过 env 显式开启（避免误删/误建索引）
 *
 * 注意：
 * - `syncIndexes()` 是破坏性操作：会删除数据库中“Schema 未声明”的索引
 * - 若存在脏数据，创建 unique 索引会失败，从而导致启动阶段报错
 */
@Injectable()
export class MongoIndexSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MongoIndexSyncService.name)

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Work.name) private readonly workModel: Model<WorkDocument>,
  ) {}

  async onApplicationBootstrap() {
    if (!this.shouldSyncIndexes()) return

    this.logger.warn('MONGO_SYNC_INDEXES 开启：即将执行 Model.syncIndexes()（可能删除多余索引）')

    await this.syncModelIndexes(User.name, this.userModel)
    await this.syncModelIndexes(Work.name, this.workModel)
  }

  private shouldSyncIndexes() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development')
    const rawFlag = this.configService.get<string>('MONGO_SYNC_INDEXES')

    // 显式配置优先
    if (rawFlag === 'true') return true
    if (rawFlag === 'false') return false

    // 默认策略：开发环境开启，生产环境关闭
    return nodeEnv !== 'production'
  }

  private async syncModelIndexes(modelName: string, model: Model<any>) {
    this.logger.log(`[${modelName}] syncIndexes 开始...`)

    try {
      const before = await model.collection.indexes()
      this.logger.debug(`[${modelName}] 同步前索引：${JSON.stringify(before)}`)
    }
    catch (e) {
      this.logger.debug(`[${modelName}] 读取同步前索引失败：${String(e)}`)
    }

    const dropped = await model.syncIndexes()

    try {
      const after = await model.collection.indexes()
      this.logger.debug(`[${modelName}] 同步后索引：${JSON.stringify(after)}`)
    }
    catch (e) {
      this.logger.debug(`[${modelName}] 读取同步后索引失败：${String(e)}`)
    }

    this.logger.log(`[${modelName}] syncIndexes 完成，drop 结果：${JSON.stringify(dropped)}`)
  }
}
