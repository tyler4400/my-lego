import { API_HOST } from '@/api/http/constants.ts'

/**
 * H5 接口在后端的版本前缀
 * - 与 api/modules/work.ts 中所有路由的写法一致（'/v1/...'）
 * - 如未来 work/pages 改用其他 version，再统一调整
 */
const H5_API_VERSION = 'v1'

export interface BuildH5UrlOptions {
  /** 渠道号（nanoid(6)）。空 → 不带 channel 参数，统计层归"默认"桶 */
  channelId?: string
  /** 预览模式（允许非 Published 渲染，详见 BizDocs/07 §3.3） */
  preview?: boolean
}

/**
 * 拼接作品 H5 成品页的完整 URL（绝对地址，可直接用于二维码 / 复制到剪贴板）
 *
 * 后端路由：GET /{PREFIX}/{VERSION}/work/pages/:id/:uuid
 * - PREFIX = /api（API_HOST 已包含）
 * - VERSION = v1
 *
 * 示例：
 *   buildH5Url(6, 'fTPl2sQP')                                  → http://localhost:3001/api/v1/work/pages/6/fTPl2sQP
 *   buildH5Url(6, 'fTPl2sQP', { channelId: 'aBc123' })         → ...?channel=aBc123
 *   buildH5Url(6, 'fTPl2sQP', { preview: true })               → ...?preview=true
 *   buildH5Url(6, 'fTPl2sQP', { channelId: 'aBc123', preview: true }) → ...?channel=aBc123&preview=true
 */
export const buildH5Url = (
  id: number,
  uuid: string,
  options: BuildH5UrlOptions = {},
): string => {
  const base = `${API_HOST}/${H5_API_VERSION}/work/pages/${id}/${uuid}`

  const params = new URLSearchParams()
  if (options.channelId) params.set('channel', options.channelId)
  if (options.preview) params.set('preview', 'true')

  const query = params.toString()
  return query ? `${base}?${query}` : base
}
