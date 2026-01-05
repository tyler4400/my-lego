import path from 'node:path'
import { Controller, FileTypeValidator, HttpStatus, Logger, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import multer from 'multer'
import { MetaRes } from '@/common/meta/meta.decorator'
import { resolveStaticRootPath } from '@/common/static/static-assets.utils'
import { JwtAuthGuard } from '@/module/auth/guard/jwt-auth.guard'

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

  @Post('img')
  @MetaRes({ message: '上传文件成功' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      // 应该还要根据日期分不同的文件夹
      destination: resolveStaticRootPath(),
      filename: (req, file, callback) => {
        // 应该还要生成hash以及校验后缀名，校验是否已经存在文件了 这里就简单处理了
        callback(null, `${Date.now()}-${file.originalname}`)
      },
    }),
  }))
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1000 * 1000 }),
          new FileTypeValidator({
            fileType: /^image\//,
            skipMagicNumbersValidation: true,
          }),
        ],
        errorHttpStatusCode: HttpStatus.FORBIDDEN,
      }),
    ) file: Express.Multer.File,
  ) {
    this.logger.log('已上传的文件信息')
    this.logger.log(file)
    // 已经在上面配置中部分实现了这些
    // 计算文件名 = 文件hash + 文件后缀
    // 计算相对路径 uploads/images/ + 年月日 + 文件名
    // 计算绝对路径 并把文件写入
    // 最终返回一个static静态服务的URL
    return { filePath: path.join('static', file.filename) }
  }
}
