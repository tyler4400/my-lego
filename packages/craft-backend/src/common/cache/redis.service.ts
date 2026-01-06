import { tryCatch } from '@my-lego/shared'
import { Inject, Injectable, Logger } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '@/common/cache/redis.constants'

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name)

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    // 监听 Redis 连接事件
    this.redis.on('connect', () => {
      this.logger.debug('Redis connected successfully')
    })

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error)
    })

    this.redis.ping()
  }

  /**
   * Set a key-value pair with optional TTL
   * @param key Redis key
   * @param value Value to store
   * @param ttl Time to live in seconds
   */
  async set(key: string, value: string, ttl?: number): Promise<string> {
    const promise = ttl ? this.redis.setex(key, ttl, value) : this.redis.set(key, value)

    const [val, error] = await tryCatch(promise)
    if (error) {
      this.logger.error(`Error setting key ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Get value by key
   * @param key Redis key
   */
  async get(key: string): Promise<string | null> {
    const [val, error] = await tryCatch(this.redis.get(key))
    if (error) {
      this.logger.error(`Error getting key ${key}:`, error)
      throw error
    }
    return val
  }

  /**
   * Delete a key
   * @param key Redis key
   */
  async del(key: string): Promise<number> {
    const [val, error] = await tryCatch(this.redis.del(key))
    if (error) {
      this.logger.error(`Error deleting key ${key}:`, error)
      throw error
    }
    return val
  }

  /**
   * Check if key exists
   * @param key Redis key
   */
  async exists(key: string): Promise<number> {
    const [val, error] = await tryCatch(this.redis.exists(key))
    if (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error)
      throw error
    }
    return val
  }

  /**
   * Get TTL of a key
   * @param key Redis key
   */
  async ttl(key: string): Promise<number> {
    const [val, error] = await tryCatch(this.redis.ttl(key))
    if (error) {
      this.logger.error(`Error getting TTL of key ${key}:`, error)
      throw error
    }
    return val
  }

  /**
   * Set hash field
   * @param key Redis key
   * @param field Hash field
   * @param value Field value
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    const [val, error] = await tryCatch(this.redis.hset(key, field, value))
    if (error) {
      this.logger.error(`Error setting hash field ${field} in key ${key}:`, error)
      throw error
    }
    return val
  }

  /**
   * Get hash field value
   * @param key Redis key
   * @param field Hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    const [val, error] = await tryCatch(this.redis.hget(key, field))
    if (error) {
      this.logger.error(`Error getting hash field ${field} from key ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Get all hash fields and values
   * @param key Redis key
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    const [val, error] = await tryCatch(this.redis.hgetall(key))
    if (error) {
      this.logger.error(`Error getting all hash fields from key ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Set expiration time for a key
   * @param key Redis key
   * @param seconds Expiration time in seconds
   */
  async expire(key: string, seconds: number): Promise<number> {
    const [val, error] = await tryCatch(this.redis.expire(key, seconds))
    if (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Add members to a set
   * @param key Redis key
   * @param members Set members
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    const [val, error] = await tryCatch(this.redis.sadd(key, ...members))
    if (error) {
      this.logger.error(`Error adding members to set ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Get all members of a set
   * @param key Redis key
   */
  async smembers(key: string): Promise<string[]> {
    const [val, error] = await tryCatch(this.redis.smembers(key))
    if (error) {
      this.logger.error(`Error getting members from set ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Push elements to list (left side)
   * @param key Redis key
   * @param elements Elements to push
   */
  async lpush(key: string, ...elements: string[]): Promise<number> {
    const [val, error] = await tryCatch(this.redis.lpush(key, ...elements))
    if (error) {
      this.logger.error(`Error pushing to list ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Get list elements by range
   * @param key Redis key
   * @param start Start index
   * @param stop Stop index
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const [val, error] = await tryCatch(this.redis.lrange(key, start, stop))
    if (error) {
      this.logger.error(`Error getting range from list ${key}:`, error)
      throw error
    }

    return val
  }

  /**
   * Set object as JSON string with optional TTL
   * @param key Redis key
   * @param obj Object to store
   * @param ttl Time to live in seconds
   */
  async setObject(key: string, obj: any, ttl?: number): Promise<string> {
    return this.set(key, JSON.stringify(obj), ttl)
  }

  /**
   * Get object from JSON string
   * @param key Redis key
   */
  async getObject<T = any>(key: string): Promise<T | null> {
    const value = await this.get(key)
    if (!value) return null

    // 用 Promise 包一层，确保 JSON.parse 的同步异常也能被 tryCatch 捕获
    const [obj, error] = await tryCatch(Promise.resolve().then(() => JSON.parse(value) as T))
    if (error) {
      this.logger.error(`Error parsing JSON for key ${key}:`, error)
      return null
    }

    return obj
  }

  /**
   * Get the raw Redis client instance for advanced operations
   */
  getClient(): Redis {
    return this.redis
  }

  /**
   * Health check - ping Redis
   */
  async ping(): Promise<string> {
    const [pong, pingError] = await tryCatch(this.redis.ping())
    if (pingError) {
      this.logger.error('Redis ping failed:', pingError)
      throw pingError
    }

    if (pong === 'PONG') {
      this.logger.log('Redis connected successfully')
      return pong
    }

    const unexpectedError = new Error(pong)
    this.logger.error('Redis ping failed:', unexpectedError)
    throw unexpectedError
  }
}
