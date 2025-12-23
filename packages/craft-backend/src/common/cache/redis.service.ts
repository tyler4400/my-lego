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
    try {
      if (ttl) {
        return await this.redis.setex(key, ttl, value)
      }
      return await this.redis.set(key, value)
    }
    catch (error) {
      this.logger.error(`Error setting key ${key}:`, error)
      throw error
    }
  }

  /**
   * Get value by key
   * @param key Redis key
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key)
    }
    catch (error) {
      this.logger.error(`Error getting key ${key}:`, error)
      throw error
    }
  }

  /**
   * Delete a key
   * @param key Redis key
   */
  async del(key: string): Promise<number> {
    try {
      return await this.redis.del(key)
    }
    catch (error) {
      this.logger.error(`Error deleting key ${key}:`, error)
      throw error
    }
  }

  /**
   * Check if key exists
   * @param key Redis key
   */
  async exists(key: string): Promise<number> {
    try {
      return await this.redis.exists(key)
    }
    catch (error) {
      this.logger.error(`Error checking existence of key ${key}:`, error)
      throw error
    }
  }

  /**
   * Get TTL of a key
   * @param key Redis key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key)
    }
    catch (error) {
      this.logger.error(`Error getting TTL of key ${key}:`, error)
      throw error
    }
  }

  /**
   * Set hash field
   * @param key Redis key
   * @param field Hash field
   * @param value Field value
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      return await this.redis.hset(key, field, value)
    }
    catch (error) {
      this.logger.error(`Error setting hash field ${field} in key ${key}:`, error)
      throw error
    }
  }

  /**
   * Get hash field value
   * @param key Redis key
   * @param field Hash field
   */
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.redis.hget(key, field)
    }
    catch (error) {
      this.logger.error(`Error getting hash field ${field} from key ${key}:`, error)
      throw error
    }
  }

  /**
   * Get all hash fields and values
   * @param key Redis key
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      return await this.redis.hgetall(key)
    }
    catch (error) {
      this.logger.error(`Error getting all hash fields from key ${key}:`, error)
      throw error
    }
  }

  /**
   * Set expiration time for a key
   * @param key Redis key
   * @param seconds Expiration time in seconds
   */
  async expire(key: string, seconds: number): Promise<number> {
    try {
      return await this.redis.expire(key, seconds)
    }
    catch (error) {
      this.logger.error(`Error setting expiration for key ${key}:`, error)
      throw error
    }
  }

  /**
   * Add members to a set
   * @param key Redis key
   * @param members Set members
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      return await this.redis.sadd(key, ...members)
    }
    catch (error) {
      this.logger.error(`Error adding members to set ${key}:`, error)
      throw error
    }
  }

  /**
   * Get all members of a set
   * @param key Redis key
   */
  async smembers(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key)
    }
    catch (error) {
      this.logger.error(`Error getting members from set ${key}:`, error)
      throw error
    }
  }

  /**
   * Push elements to list (left side)
   * @param key Redis key
   * @param elements Elements to push
   */
  async lpush(key: string, ...elements: string[]): Promise<number> {
    try {
      return await this.redis.lpush(key, ...elements)
    }
    catch (error) {
      this.logger.error(`Error pushing to list ${key}:`, error)
      throw error
    }
  }

  /**
   * Get list elements by range
   * @param key Redis key
   * @param start Start index
   * @param stop Stop index
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      return await this.redis.lrange(key, start, stop)
    }
    catch (error) {
      this.logger.error(`Error getting range from list ${key}:`, error)
      throw error
    }
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

    try {
      return JSON.parse(value) as T
    }
    catch (error) {
      this.logger.error(`Error parsing JSON for key ${key}:`, error)
      return null
    }
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
    try {
      const pong = await this.redis.ping()
      if (pong === 'PONG') {
        this.logger.log('Redis connected successfully')
        return pong
      }
      else {
        throw new Error(pong)
      }
    }
    catch (error) {
      this.logger.error('Redis ping failed:', error)
      throw error
    }
  }
}
