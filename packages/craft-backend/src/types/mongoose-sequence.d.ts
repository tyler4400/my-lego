declare module 'mongoose-sequence' {
  import type { Schema } from 'mongoose'

  export interface AutoIncrementOptions {
    /**
     * 自增字段名（旧 egg 项目使用：id）
     */
    inc_field?: string
    /**
     * 计数器唯一标识（旧 egg 项目使用：users_id_counter / works_id_counter）
     */
    id?: string
    /**
     * 初始值（默认 1）
     */
    start_seq?: number
  }

  export type AutoIncrementPlugin = (schema: Schema, options?: AutoIncrementOptions) => void

  /**
   * `mongoose-sequence` 官方未提供 TS 声明，这里补一个足够用的类型，
   * 以便在严格 lint（no-unsafe-call）下正常工作。
   */
  const AutoIncrementFactory: (mongoose: any) => AutoIncrementPlugin

  export default AutoIncrementFactory
}
