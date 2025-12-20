import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { utilities, WinstonModule } from 'nest-winston'
import { format } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { Console, ConsoleTransportInstance } from 'winston/lib/winston/transports'

/**
 * 统一定义 Winston 使用的 Transport 类型：
 * - ConsoleTransportInstance：控制台输出
 * - DailyRotateFile：文件轮转输出
 */
type WinstonTransport = ConsoleTransportInstance | DailyRotateFile

// 控制台日志输出

export const consoleTransport = new Console({
  /**
   * 控制台显示 info 级别及以上的日志
   * Winston 日志级别优先级（从高到低
   * error: 0    // 错误信息
   * warn: 1     // 警告信息
   * info: 2     // 一般信息
   * http: 3     // HTTP 请求信息
   * verbose: 4  // 详细信息
   * debug: 5    // 调试信息
   * silly: 6    // 最详细的调试信息
   */
  level: 'silly',
  // handleExceptions: true,
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    format.json(), // 将日志输出为 JSON 格式，便于机器解析
    format.errors({ stack: true }), // 为错误对象添加完整的堆栈跟踪信息
    format.ms(), // 添加执行时间
    utilities.format.nestLike('Winston'),
  ),
})

// 文件轮转日志输出
export const createRotateTransport = (level: string, fileName: string) => {
  return new DailyRotateFile({
    level, // 日志级别
    dirname: 'logs', // 日志文件存储目录
    filename: `${fileName}-%DATE%.log`, // 文件名模式：文件名-日期.log
    datePattern: 'YYYY-MM-DD-HH', // 按小时轮转
    zippedArchive: true, // 压缩旧日志文件
    maxSize: '20m', // 单个文件最大 20MB
    maxFiles: '14d', // 保留 14 天的日志
    format: format.combine(format.timestamp(), format.simple()),
  })
}

@Module({
  imports: [
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isLogOn = configService.get<string>('LOG_ON', 'true') === 'true'

        const transports: WinstonTransport[] = [consoleTransport]

        if (isLogOn) {
          transports.push(
            createRotateTransport('info', 'application'),
            createRotateTransport('warn', 'error'),
          )
        }

        return {
          transports,
        }
      },
    }),
  ],
})
export class LoggerModule {}
