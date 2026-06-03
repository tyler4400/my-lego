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

  private propsToStyles(props: WorkContent['props'] = {}) {
    const keys = Object.keys(props)
    const styleArr = keys.map((key) => {
      const formatKey = key.replace(/[A-Z]/g, c => `-${c.toLocaleLowerCase()}`)
      // fontSize -> font-size
      const value = props[key]
      return `${formatKey}: ${value}`
    })
    return styleArr.join(';')
  }

  private px2vw() {
    // todo 暂时不做。 对应课程 13-22 px 转换成 vw
  }

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

  /**
   * 获取 H5 页面渲染所需数据
   *
   * @param id
   * @param uuid
   * @param preview 是否预览模式
   *
   * 正式访问（preview=false）：仅 status=Published 的作品才能渲染
   * 预览模式（preview=true）：允许渲染非 Published 状态（草稿/未发布），便于作者在编辑器
   *   弹窗内扫码预览实际效果。
   *
   * ⚠️ 预览能力鉴权策略（设计决策）：
   * - 当前实现「不鉴权」：任何拿到 (id, uuid) 的人 + `?preview=true` 都能看到草稿
   * - 已知隐私风险：作品 id + uuid 一旦泄露，未发布草稿就可能被围观
   * - 接受此风险的理由：
   *   1) uuid 是 nanoid(8) 随机串，不易爆破
   *   2) 预览二维码仅在编辑器内向作者本人展示，泄露面有限
   *   3) 加鉴权会破坏「扫码即看」的体验
   *   4) 真的泄露了，作者可以重新生成（删旧建新）止损
   * - 软删除（status=Deleted）依然不允许预览，避免删除后还能访问的体验问题
   */
  async getPageData(id: number, uuid: string, preview = false) {
    // 预览模式：仅排除软删除；正式访问：严格要求 Published
    const statusFilter = preview
      ? { $ne: WorkStatusEnum.Deleted }
      : WorkStatusEnum.Published
    const work = await this.workModel.findOne({ id, uuid, status: statusFilter }).lean()
    if (!work || !work.content) {
      throw new BizException({ errorKey: 'workNotExistError' })
    }

    const workContent = work.content as WorkContent

    const props = workContent.props ?? {}
    const bodyStyle = this.propsToStyles(props)

    // SSR， 拿到work数据之后使用craft项目的前端组件来渲染出HTML内容。要使用vue的createSSRApp
    const { html } = await renderWorkToHTML(workContent)

    // Hydration：注入 client-entry.js + CSS（manifest 解析）
    const { scriptSrc, cssHrefs } = await this.getH5ClientAssets()

    this.logger.log(`work ${id} render success`)
    return {
      html,
      bodyStyle,
      title: work.title,
      desc: work.desc,

      // 给 client-entry.ts 使用
      payloadJson: createSafeJson(workContent),

      // 给 hbs 注入 <link>/<script>
      scriptSrc,
      cssHrefs,
    }
  }
}
