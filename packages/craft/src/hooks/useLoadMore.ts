import type { ComputedRef, Ref, ShallowRef } from 'vue'
import type { ServiceConfig } from '@/api/http'
import type { ServiceResult } from '@/hooks/useService.ts'
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useService } from '@/hooks/useService.ts'

/**
 * 「加载更多」分页接口的标准返回结构
 * - 与项目内 WorkListResponse / WorkPublicListResponse 等保持一致
 */
export interface LoadMorePageResult<Item> {
  list: Item[]
  total: number
}

/**
 * 「加载更多」接口签名约束
 * - 第一个参数为「分页 query」：业务自定义参数 Params 与必传的 page / pageSize 合并
 * - 最后一个参数为可选 config（useService 会注入 AbortSignal）
 */
export type LoadMoreFetchFn<Item, Params extends object> = (
  query: Params & { page: number, pageSize: number },
  config?: ServiceConfig,
) => Promise<ServiceResult<LoadMorePageResult<Item>>>

export interface UseLoadMoreOptions<Item, Params extends object> {
  /** 列表分页接口 */
  fetchFn: LoadMoreFetchFn<Item, Params>
  /**
   * 响应式 params 派生函数
   * - 除 page / pageSize 之外的业务过滤条件（如搜索关键词、排序字段等）
   * - watch 到返回值变化会自动 refresh（回第一页 + 清空 list）
   * - 仅做浅比较，参数对象推荐每次返回新对象
   */
  params?: () => Params
  /** 单页条数，默认 12 */
  pageSize?: number
  /** 是否在 setup 时立即拉首屏，默认 true */
  immediate?: boolean
  /** params 变化触发 refresh 的防抖时长（ms），默认 300 */
  debounceMs?: number
}

export interface UseLoadMoreReturn<Item> {
  /** 累加后的列表数据 */
  list: ShallowRef<Item[]>
  /** 服务端总条数 */
  total: Ref<number>
  /** 当前页码（已加载完成的最大页） */
  page: Ref<number>
  /** 首屏 / 重置 loading（用于骨架屏） */
  loading: Ref<boolean>
  /** 加载更多 loading（用于按钮态，与 loading 区分） */
  loadingMore: Ref<boolean>
  /** 是否还有下一页 */
  hasMore: ComputedRef<boolean>
  /** 是否为空（已加载完成且 list 为空） */
  isEmpty: ComputedRef<boolean>
  /** 加载下一页（追加） */
  loadMore: () => Promise<void>
  /** 回到第一页重新拉（搜索 / 排序变化、用户主动刷新） */
  refresh: () => Promise<void>
  /** 清空状态（不发请求） */
  reset: () => void
}

/**
 * useLoadMore - 「page 累加式加载更多」hook
 *
 * 设计要点：
 * 1. **loading 与 loadingMore 分离**：首屏骨架屏与「加载更多」按钮 loading 各管各的，
 *    业务方不用自己写 if (page===1) 判断
 * 2. **复用 useService**：自带 AbortController 竞态保护 + 错误统一收口（全局拦截器 toast）
 * 3. **params 变化自动 refresh**：搜索词 / 排序改了就回第一页，防抖 300ms 避免每键一打
 * 4. **list 用 shallowRef**：列表本身只关心引用变化，元素内部不会被改（详情见 craft 项目其他列表写法）
 *
 * @example 首页公开模版列表
 * ```ts
 * const sortBy = ref<'copiedCount' | 'latestPublishAt'>('copiedCount')
 * const keyword = ref('')
 *
 * const { list, total, loading, loadingMore, hasMore, loadMore, refresh } = useLoadMore({
 *   fetchFn: getPublicWorkList,
 *   params: () => ({
 *     title: keyword.value || undefined,
 *     sortBy: sortBy.value,
 *     sortOrder: 'desc',
 *   }),
 *   pageSize: 12,
 * })
 * ```
 */
export const useLoadMore = <Item, Params extends object = Record<string, never>>(
  options: UseLoadMoreOptions<Item, Params>,
): UseLoadMoreReturn<Item> => {
  const pageSize = options.pageSize ?? 12
  const debounceMs = options.debounceMs ?? 300
  const immediate = options.immediate ?? true

  const list = shallowRef<Item[]>([])
  const total = ref(0)
  const page = ref(0)

  // 首屏与「加载更多」分开走两套 useService 实例：
  // - loading：首屏 / refresh
  // - loadingMore：page > 1 的追加请求
  // 两者用各自的 AbortController，互不打断，UI 也能同时给出两种反馈
  const [doFetchFirst, loading] = useService<LoadMorePageResult<Item>, [Params & { page: number, pageSize: number }]>(
    options.fetchFn,
    { config: { silentSuccess: true, silentLoading: true } },
  )
  const [doFetchMore, loadingMore] = useService<LoadMorePageResult<Item>, [Params & { page: number, pageSize: number }]>(
    options.fetchFn,
    { config: { silentSuccess: true, silentLoading: true } },
  )

  const hasMore = computed(() => list.value.length < total.value)
  const isEmpty = computed(() => !loading.value && list.value.length === 0)

  const resolveParams = (): Params => {
    return options.params ? options.params() : ({} as Params)
  }

  /**
   * 首屏 / 刷新：回到第一页，整批替换 list
   * - 失败时保留旧数据（避免页面闪空），错误由全局 toast 接管
   */
  const refresh = async () => {
    const [resp, err] = await doFetchFirst({
      ...resolveParams(),
      page: 1,
      pageSize,
    })
    if (err || !resp) return
    list.value = resp.list
    total.value = resp.total
    page.value = 1
  }

  /**
   * 加载下一页：追加到 list 末尾
   * - 多次重复点击：useService 内置竞态保护，会自动取消上一次请求
   * - 边界守卫：loading / 无更多 / 尚未拉过第一页 都直接 return
   */
  const loadMore = async () => {
    if (loading.value || loadingMore.value) return
    if (!hasMore.value) return
    if (page.value < 1) {
      // 极端情况：首屏失败但用户直接点了加载更多，先走 refresh 拉第一页
      await refresh()
      return
    }

    const nextPage = page.value + 1
    const [resp, err] = await doFetchMore({
      ...resolveParams(),
      page: nextPage,
      pageSize,
    })
    if (err || !resp) return

    // 后端 total 可能被新发布的作品改写，按最新的为准
    total.value = resp.total
    page.value = nextPage
    // 用新数组触发 shallowRef 更新（不要 push，避免引用未变模板不刷新）
    list.value = list.value.concat(resp.list)
  }

  /**
   * 重置：清空状态，不发请求
   * - 用于"切换 tab / 离开页面"前的兜底，避免下次进来闪一下旧数据
   */
  const reset = () => {
    list.value = []
    total.value = 0
    page.value = 0
  }

  // params 变化：防抖后回到第一页
  // 仅在显式传入了 params 派生函数时才注册 watch，避免无谓的 watcher
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  if (options.params) {
    watch(
      options.params,
      () => {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          refresh()
        }, debounceMs)
      },
      { deep: true },
    )
  }

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  if (immediate) refresh()

  return {
    list,
    total,
    page,
    loading,
    loadingMore,
    hasMore,
    isEmpty,
    loadMore,
    refresh,
    reset,
  }
}
