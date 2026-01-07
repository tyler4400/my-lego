import path from 'node:path'
import { Body, Controller, FileTypeValidator, HttpStatus, Logger, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common'
import { AnyFilesInterceptor, FileInterceptor } from '@nestjs/platform-express'
import { Express } from 'express'
import multer from 'multer'
import { MetaRes } from '@/common/meta/meta.decorator'
import { resolveStaticRootPath } from '@/common/static/static-assets.utils'
import { getExtFromMimeType, IMG_BASE_DIRS, UploadService } from '@/common/upload/upload.service'
import { JwtAuthGuard } from '@/module/auth/guard/jwt-auth.guard'
import { ensureDirSync } from '@/utils/fs'

/**
 * 以“天”为单位的目录 key（epoch day）。
 * - 例：Math.floor(Date.now() / 86400000) => "20000" 这种
 * - 优点：实现极简；缺点：不如 YYYYMMDD 直观
 */
export const getUploadDayKey = (): string => {
  return String(Math.floor(Date.now() / (24 * 60 * 60 * 1000)))
}

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

  constructor(private readonly uploadService: UploadService) {}

  @Post('example')
  @MetaRes({ message: '上传文件成功' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  example(@UploadedFiles() files: Express.Multer.File[], @Body() body: object) {
    console.log('body:', body)
    this.logger.debug('已上传的文件信息')
    this.logger.debug(files)
    return files.length
  }

  @Post('img')
  @MetaRes({ message: '上传图片成功' })
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: multer.diskStorage({
      destination: (_req, _file, callback) => {
        const dayKey = getUploadDayKey()
        const staticRoot = resolveStaticRootPath()
        const destAbs = path.join(staticRoot, ...IMG_BASE_DIRS, dayKey)

        // multer 不会自动创建多级目录，这里手动创建
        ensureDirSync(destAbs)
        callback(null, destAbs)
      },
      filename: (_req, file, callback) => {
        const ext = getExtFromMimeType(file.mimetype)
        // 使用随机名避免重名；不要使用 originalname，避免奇怪字符/路径等安全问题
        const filename = `${Date.now()}${ext}`
        callback(null, filename)
      },
    }),
  }))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1000 * 1000 }),
          new FileTypeValidator({
            fileType: /^(image\/jpeg|image\/jpg|image\/png|image\/webp|image\/gif|image\/avif)$/,
            skipMagicNumbersValidation: true,
          }),
        ],
        errorHttpStatusCode: HttpStatus.FORBIDDEN,
      }),
    ) file: Express.Multer.File,
  ) {
    return this.uploadService.uploadImage(file)
  }
}

/**
 * {
 *   fieldname: 'file',
 *   originalname: 'jwt.png',
 *   encoding: 'binary',
 *   mimetype: 'image/png',
 *   destination: '/Users/tylerzzheng/projects/lego/my-lego/packages/craft-backend/dist/craft-backend/static',
 *   filename: '1767704426656-jwt.png',
 *   path: '/Users/tylerzzheng/projects/lego/my-lego/packages/craft-backend/dist/craft-backend/static/1767704426656-jwt.png',
 *   size: 72015
 * }
 *
 * upload.controller.ts.19.destination._file:  {
 *   fieldname: 'file',
 *   originalname: 'jwt.png',
 *   encoding: 'binary',
 *   mimetype: 'image/png'
 * }
 */
