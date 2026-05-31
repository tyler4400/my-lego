import type { MaybeRefOrGetter } from 'vue'
import type { WorkDetailDto } from '@/api/modules/work.ts'
import { Modal } from 'ant-design-vue'
import { onBeforeUnmount, toValue, watch } from 'vue'
import { useRouter } from 'vue-router'
import { UNAUTHORIZED_STATUS } from '@/api/http/constants.ts'
import { getWorkDetail, WORK_ERROR_CODE } from '@/api/modules/work.ts'
import { useService } from '@/hooks/useService.ts'
import { useEditorStore } from '@/stores/editor.ts'
import { useSessionStore } from '@/stores/session.ts'

export const useFetchWork = (idSource: MaybeRefOrGetter<unknown>, immediate: boolean = false) => {
  const router = useRouter()
  const editorStore = useEditorStore()
  const sessionStore = useSessionStore()

  // 详情加载：错误反馈统一由下方 Modal 接管（silentError），GET 成功无需 toast（silentSuccess）
  const [doFetchDetail, loadLoading] = useService(getWorkDetail, {
    config: { silentError: true, silentSuccess: true },
  })

  /**
   * 是否为「他人的公开模版」
   * - 本人作品（含本人模版）可正常编辑
   * - 他人模版本期不支持直接编辑，仅提示「复制一份」（复制能力二期实现）
   */
  const isOthersTemplate = (work: WorkDetailDto) =>
    Boolean(work.isTemplate) && work.user?.username !== sessionStore.userInfo.username

  /**
   * 致命错误（作品不存在 / 无权限）：编辑器没有有效内容可继续，提示后返回首页
   */
  const showFatalError = (title: string, content?: string) => {
    Modal.error({
      title,
      content,
      okText: '返回',
      onOk: () => router.back(),
    })
  }

  /**
   * 他人模版：提示是否复制一份到自己名下（复制能力二期实现，本期占位）
   * - 无论确认或关闭，编辑器都保持空白画布（不回填模版数据）
   */
  const showOthersTemplateModal = () => {
    Modal.confirm({
      title: '这是一个公开模版',
      content: '该模版属于其他作者，无法直接编辑。是否复制一份到自己名下进行编辑？',
      okText: '复制一份',
      cancelText: '返回',
      onOk: () => Modal.info({ title: '提示', content: '复制模版功能开发中，敬请期待' }),
      onCancel: () => router.back(),
    })
  }

  /**
   * 进入 / 切换作品时的初始化
   * - 先 reset 清空上一个作品残留
   * - 拉详情：失败按错误码分支提示；他人模版仅提示不回填；本人作品回填编辑器
   */
  const init = async () => {
    editorStore.reset()

    const id = Number(toValue(idSource))
    if (!Number.isInteger(id) || id <= 0) {
      // 路由正则已限定数字 id，此处仅作兜底
      showFatalError('作品 ID 非法')
      return
    }

    const [work, err] = await doFetchDetail(id)
    if (err) {
      if (err.code === UNAUTHORIZED_STATUS) return // 401 已由全局 http:unauthorized 弹「去登录」
      if (err.code === WORK_ERROR_CODE.NOT_EXIST) {
        showFatalError('作品不存在', '该作品可能已被删除或未公开')
        return
      }
      if (err.code === WORK_ERROR_CODE.NO_PERMISSION || err.code === WORK_ERROR_CODE.NO_PUBLIC) {
        showFatalError('无权限访问', '该作品未公开或您没有访问权限')
        return
      }
      showFatalError('加载失败', err.message || '请稍后重试')
      return
    }
    // 成功路径 work 必为非空，这里收窄类型（兼容元组解构无法关联 err/work 的情况）
    if (!work) return

    if (isOthersTemplate(work)) {
      showOthersTemplateModal()
      return
    }

    editorStore.applyDetail(work)
  }

  // immediate 立即触发（等同 created 时机），不 await 以免阻塞组件渲染
  if (immediate) init()

  // 手动改 URL 切换作品 id 时重新加载（next 为空表示正在离开编辑器，交给 onBeforeUnmount 处理）
  watch(() => toValue(idSource), (next, prev) => {
    if (next && next !== prev) init()
  })

  onBeforeUnmount(() => {
    editorStore.reset()
  })

  return [
    loadLoading,
    init,
  ] as const
}
