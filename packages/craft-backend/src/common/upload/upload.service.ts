import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { tryCatch } from '@my-lego/shared'
import { HttpStatus, Logger } from '@nestjs/common'
import sharp from 'sharp'
import { BizException } from '@/common/error/biz.exception'
import { resolveRuntimeUploadRootPath } from '@/common/static/static-assets.utils'
import { ensureDirSync, fileExists, getSha256FromFile, safeUnlink } from '@/utils/fs'

/**
 * 从 mimetype 映射原图扩展名（用于落盘文件后缀）。
 * ext 从 mimetype 映射（更安全）
 */
export const getExtFromMimeType = (mimeType?: string): string => {
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/jpg') return '.jpg'
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/webp') return '.webp'
  if (mimeType === 'image/gif') return '.gif'
  if (mimeType === 'image/avif') return '.avif'
  return ''
}

/**
 * 把磁盘绝对路径转成可访问的 `/static/upload` URL。
 * - 运行时文件根目录：`${RUNTIME_DATA_ROOT_PATH}/upload`
 * - 例：{runtimeUploadRoot}/img/...  => /static/upload/img/...
 */
const toStaticUrl = (staticRootAbsPath: string, fileAbsPath: string): string => {
  const rel = path.relative(staticRootAbsPath, fileAbsPath)
  // URL 统一用 POSIX 分隔符，避免 Windows 反斜杠
  const urlPath = rel.split(path.sep).join('/')
  return `/static/upload/${urlPath}`
}

// 原图存储目录
export const IMG_BASE_DIRS = ['img'] as const
// 缩略图存储目录
const THUMB_DIRS = ['thumb'] as const

export class UploadService {
  private readonly logger = new Logger(UploadService.name)
  /**
   * 上传图片，并生成缩略图
   * 原图不做 hash 去重、缩略图按 hash 去重
   */
  async uploadImage(file: Express.Multer.File) {
    // 1) 用 sharp 解码做“真实图片校验”（解码失败则拒绝，并删除已落盘文件）
    const [, error] = await tryCatch(sharp(file.path).metadata())
    if (error) {
      this.logger.error(error)
      await safeUnlink(file.path)
      this.logger.error('sharp 解码失败，疑似伪造/损坏图片，已删除原文件')
      throw new BizException({ errorKey: 'imageUploadFail', httpStatus: HttpStatus.BAD_REQUEST })
    }

    // 2) 计算 hash（用于缩略图命名；同图重复上传可复用同一缩略图）
    const sha256 = await getSha256FromFile(file.path)

    // 3) 生成缩略图到：${RUNTIME_DATA_ROOT_PATH}/upload/thumb/<h0h1>/<h2h3>/<sha256>_w320.webp
    const runtimeUploadRoot = resolveRuntimeUploadRootPath()
    const shard1 = sha256.slice(0, 2)
    const shard2 = sha256.slice(2, 4)
    const thumbDirAbs = path.join(runtimeUploadRoot, ...THUMB_DIRS, shard1, shard2)
    ensureDirSync(thumbDirAbs)

    const thumbnailFilename = `${sha256.slice(4)}_w320.webp`
    const thumbnailAbsPath = path.join(thumbDirAbs, thumbnailFilename)

    const ifExist = await fileExists(thumbnailAbsPath)
    if (!ifExist) {
      this.logger.log(`${file.path}的缩略图不存在，开始生成`)
      // 用 pipeline 做真正的流式处理（带 backpressure）
      // flags: 'wx' => 仅当文件不存在时创建，避免并发重复写入
      const readStream = fs.createReadStream(file.path)
      const writeStream = fs.createWriteStream(thumbnailAbsPath, { flags: 'wx' })
      const transform = sharp()
        .rotate() // 自动按 EXIF 修正方向
        .resize({
          width: 320,
          fit: 'inside', // 固定宽度等比缩放（高按比例自适应）
          withoutEnlargement: true, // 小图不放大，避免糊
        })
        .webp({ quality: 80 })
      const [, error] = await tryCatch(pipeline(readStream, transform, writeStream))
      if (error) {
        this.logger.error(error)
        if ((error as any).code === 'EEXIST') {
          // 并发下可能另一请求先写入成功，这里视为成功复用
        }
        else {
          // 失败时尽量清理可能残留的半成品文件
          await safeUnlink(thumbnailAbsPath)
          await safeUnlink(file.path)
          this.logger.error('生成缩略图失败，已删除原文件')
          throw error
        }
      }
    }

    // 4) 返回两个 URL（同步返回）,需要前端自己拼接origin
    const originalUrl = toStaticUrl(runtimeUploadRoot, file.path)
    const thumbnailUrl = toStaticUrl(runtimeUploadRoot, thumbnailAbsPath)
    return { originalUrl, thumbnailUrl }
  }
}
