import path from 'node:path'
import { tryCatch } from '@my-lego/shared'
import { Controller, FileTypeValidator, HttpStatus, Logger, MaxFileSizeValidator, ParseFilePipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import multer from 'multer'
import sharp from 'sharp'
import { BizException } from '@/common/error/biz.exception'
import { MetaRes } from '@/common/meta/meta.decorator'
import { resolveStaticRootPath } from '@/common/static/static-assets.utils'
import { JwtAuthGuard } from '@/module/auth/guard/jwt-auth.guard'
import { ensureDirSync, fileExists, getSha256FromFile, safeUnlink } from '@/utils/fs'

/**
 * 以“天”为单位的目录 key（epoch day）。
 * - 例：Math.floor(Date.now() / 86400000) => "20000" 这种
 * - 优点：实现极简；缺点：不如 YYYYMMDD 直观
 */
const getUploadDayKey = (): string => {
  return String(Math.floor(Date.now() / (24 * 60 * 60 * 1000)))
}

/**
 * 从 mimetype 映射原图扩展名（用于落盘文件后缀）。
 * - 你已确认：ext 从 mimetype 映射（更安全）
 */
const getExtFromMimeType = (mimeType?: string): string => {
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/jpg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  if (mimeType === 'image/avif') return '.avif'
  return ''
}

/**
 * 把磁盘绝对路径转成可访问的 /static URL。
 * - 例：{staticRoot}/uploads/images/...  => /static/uploads/images/...
 */
const toStaticUrl = (staticRootAbsPath: string, fileAbsPath: string): string => {
  const rel = path.relative(staticRootAbsPath, fileAbsPath)
  // URL 统一用 POSIX 分隔符，避免 Windows 反斜杠
  const urlPath = rel.split(path.sep).join('/')
  return `/static/${urlPath}`
}

// 原图存储目录
const IMG_BASE_DIRS = ['upload', 'img'] as const
// 缩略图存储目录
const THUMB_DIRS = ['thumb'] as const

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name)

  @Post('img')
  @MetaRes({ message: '上传文件成功' })
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
    /**
     * 生成缩略图
     * 原图不做 hash 去重、缩略图按 hash 去重
     */
    this.logger.debug('已上传的文件信息')
    this.logger.debug(file)

    // 1) 用 sharp 解码做“真实图片校验”（解码失败则拒绝，并删除已落盘文件）
    const [, error] = await tryCatch(sharp(file.path).metadata())
    if (error) {
      await safeUnlink(file.path)
      this.logger.error('sharp 解码失败，疑似伪造/损坏图片，已删除原文件')
      throw new BizException({ errorKey: 'imageUploadFail', httpStatus: HttpStatus.BAD_REQUEST })
    }

    // 2) 计算 hash（用于缩略图命名；同图重复上传可复用同一缩略图）
    const sha256 = await getSha256FromFile(file.path)

    // 3) 生成缩略图到：static/uploads/thumbs/<dayKey>/<sha256>_w320.webp
    const staticRoot = resolveStaticRootPath()
    const thumbDirAbs = path.join(staticRoot, ...THUMB_DIRS, getUploadDayKey())
    ensureDirSync(thumbDirAbs)

    const thumbnailFilename = `${sha256}_w320.webp`
    const thumbnailAbsPath = path.join(thumbDirAbs, thumbnailFilename)

    const ifExist = await fileExists(thumbnailAbsPath)
    if (!ifExist) {
      await sharp(file.path)
        .rotate() // 自动按 EXIF 修正方向
        .resize({
          width: 320,
          fit: 'inside', // 固定宽度等比缩放（高按比例自适应）
          withoutEnlargement: true, // 小图不放大，避免糊
        })
        .toFile(thumbnailAbsPath)
    }

    // 4) 返回两个 URL（同步返回）,需要前端自己拼接origin
    const originalUrl = toStaticUrl(staticRoot, file.path)
    const thumbnailUrl = toStaticUrl(staticRoot, thumbnailAbsPath)

    return { originalUrl, thumbnailUrl }
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
