import fs from 'node:fs'
import path from 'node:path'
import { renderWorkToHTML, WorkContent } from '@my-lego/craft/ssr'
import { createSafeJson } from '@my-lego/shared'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { BizException } from '@/common/error/biz.exception'
import { resolvePackagedStaticRootPath } from '@/common/static/static-assets.utils'
import { Work, WorkDocument, WorkStatusEnum } from '@/database/mongo/schema/work.schema'
import { fileExists } from '@/utils/fs'

interface ViteManifestEntry {
  file: string
  css?: string[]
  isEntry?: boolean
  src?: string
}
type ViteManifest = Record<string, ViteManifestEntry>

const H5_STATIC_PREFIX = '/static/lego-h5/'
const H5_MANIFEST_ENTRY_KEY = 'src/ssr/clientEntry.ts'

@Injectable()
export class WorkToH5Service {
  private readonly logger = new Logger(WorkToH5Service.name)

  // 缓存的H5资源，只在进程中读取一次即可
  private cachedH5ClientAssets: null | { scriptSrc: string, cssHrefs: string[] } = null

  constructor(@InjectModel(Work.name) private readonly workModel: Model<WorkDocument>) {}

  /**
   * 从 Vite manifest 解析 hydration 所需的 JS/CSS。
   * - 只在进程内读取一次（缓存），避免每次请求都读文件
   * - manifest 由 craft 的 client build 输出到 craft-backend/static/lego-h5/manifest.json
   */
  private async getH5ClientAssets() {
    if (this.cachedH5ClientAssets) return this.cachedH5ClientAssets

    const packagedStaticRoot = resolvePackagedStaticRootPath()
    const manifestAbsPath = path.join(packagedStaticRoot, 'lego-h5', '.vite/manifest.json')
    const ifExist = await fileExists(manifestAbsPath)
    if (!ifExist) {
      this.logger.error(`${manifestAbsPath}:的资源不存在`)
      throw new BizException({ errorKey: 'h5WorkAssetsError', httpStatus: HttpStatus.INTERNAL_SERVER_ERROR })
    }

    /**
     *  读取manifest.json 文件, 可能的内容如下
     *  {
     *   "src/ssr/clientEntry.ts": {
     *     "file": "assets/clientEntry-DXsTORWK.js",
     *     "name": "clientEntry",
     *     "src": "src/ssr/clientEntry.ts",
     *     "isEntry": true,
     *     "css": [
     *       "assets/clientEntry-BALUfUHg.css"
     *     ]
     *   }
     * }
     */
    const mainfest = JSON.parse(fs.readFileSync(manifestAbsPath, 'utf-8')) as ViteManifest
    const entry = mainfest[H5_MANIFEST_ENTRY_KEY]
    if (!entry || !entry.file) {
      this.logger.error(`${manifestAbsPath}:的资源不存在`)
      throw new BizException({ errorKey: 'h5WorkAssetsError', httpStatus: HttpStatus.INTERNAL_SERVER_ERROR })
    }

    this.cachedH5ClientAssets = {
      scriptSrc: `${H5_STATIC_PREFIX}${entry.file}`,
      cssHrefs: (entry.css ?? []).map(css => `${H5_STATIC_PREFIX}${css}`),
    }

    return this.cachedH5ClientAssets
  }

  async getPageData(id: number, uuid: string) {
    const work = await this.workModel.findOne({ id, uuid, status: WorkStatusEnum.Published }).lean()
    if (!work || !work.content) {
      throw new BizException({ errorKey: 'workNotExistError' })
    }

    // SSR， 拿到work数据之后使用craft项目的前端组件来渲染出HTML内容。要使用vue的createSSRApp
    const { html } = await renderWorkToHTML(work.content as WorkContent)

    // Hydration：注入 client-entry.js + CSS（manifest 解析）
    const { scriptSrc, cssHrefs } = await this.getH5ClientAssets()

    this.logger.log(`work ${id} render success`)
    return {
      html,
      bodyStyle: '', // 预留
      title: work.title,
      desc: work.desc,

      // 给 client-entry.ts 使用
      payloadJson: createSafeJson(work.content),

      // 给 hbs 注入 <link>/<script>
      scriptSrc,
      cssHrefs,
    }
  }
}
