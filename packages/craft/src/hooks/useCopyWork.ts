import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { copyWork } from '@/api/modules/work.ts'
import { useService } from '@/hooks/useService.ts'

export interface CopyWorkOptions {
  /**
   * 成功后是否自动跳转到新作品的编辑器
   * - true（默认）：复制成功后 router.push(`/editor/${newId}`)
   * - false：仅 toast，调用方自行决定后续动作
   */
  redirect?: boolean
  /**
   * 跳转方式
   * - 'push'（默认）：保留来源页面在历史栈，用户可回退
   * - 'replace'：替换当前路由（适用于"他人模版页 → 复制 → 编辑器"，避免回退又触发"复制提示"弹窗）
   */
  navigationType?: 'push' | 'replace'
  /** 成功提示文案，默认"已复制到我的作品" */
  successMessage?: string
}

/**
 * useCopyWork - 复制作品的通用 hook
 *
 * 在 HomeView 卡片"立即使用" / useFetchWork 的"他人模版 → 复制一份" 两处共用
 * - 错误由 useService 的全局拦截 toast，调用方只需处理成功路径
 * - 成功后默认跳新编辑器，可通过 options 关掉自动跳转
 *
 * @example HomeView 卡片
 * ```ts
 * const { copying, doCopy } = useCopyWork()
 * const handleCopy = (work) => doCopy(work.id)
 * ```
 *
 * @example useFetchWork（他人模版弹窗 onOk）
 * ```ts
 * const { doCopy } = useCopyWork({ navigationType: 'replace' })
 * Modal.confirm({
 *   onOk: () => doCopy(workId),
 * })
 * ```
 */
export const useCopyWork = (options: CopyWorkOptions = {}) => {
  const {
    redirect = true,
    navigationType = 'push',
    successMessage = '已复制到我的作品',
  } = options

  const router = useRouter()
  // 复制接口的"成功"语义有自定义文案，关掉全局 success toast 避免重复提示
  const [doCopyApi, copying] = useService(copyWork, {
    config: { silentSuccess: true },
  })

  /**
   * 执行复制
   * @returns 成功返回新作品详情，失败返回 null（错误已被全局 toast）
   */
  const doCopy = async (id: number) => {
    const [newWork, err] = await doCopyApi(id)
    if (err || !newWork) return null

    message.success(successMessage)

    if (redirect) {
      const target = `/editor/${newWork.id}`
      if (navigationType === 'replace') {
        router.replace(target)
      }
      else {
        router.push(target)
      }
    }

    return newWork
  }

  return {
    copying,
    doCopy,
  }
}
