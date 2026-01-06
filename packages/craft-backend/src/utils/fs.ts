import crypto from 'node:crypto'
import fs from 'node:fs'
import { tryCatch } from '@my-lego/shared'

export const ensureDirSync = (dirAbsPath: string) => {
  fs.mkdirSync(dirAbsPath, { recursive: true })
}

/**
 * 把文件内容做 sha256。
 */
export const getSha256FromFile = async (fileAbsPath: string): Promise<string> => {
  const buf = await fs.promises.readFile(fileAbsPath)
  return crypto.createHash('sha256').update(buf).digest('hex')
}

export const fileExists = async (fileAbsPath: string): Promise<boolean> => {
  const [, err] = await tryCatch(fs.promises.access(fileAbsPath, fs.constants.F_OK))
  if (err) return false
  return true
}

export const safeUnlink = async (fileAbsPath: string): Promise<void> => {
  await tryCatch(fs.promises.unlink(fileAbsPath))
  // 无需catch error：文件可能已不存在
}
