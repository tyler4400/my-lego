<template>
  <UTable :data="data?.list ?? []" :columns="columns" :loading="pending" />
  <div class="mt-4 flex items-center justify-between">
    <UBadge color="neutral" variant="subtle">
      共 {{ data?.total ?? 0 }} 条
    </UBadge>
    <UPagination
      v-model:page="currentPage"
      :itemsPerPage="pageSize"
      :total="data?.total ?? 0"
    />
  </div>
</template>

<script setup lang="ts">
import type { PagedData } from '#shared/types/common'
import type { TableColumn } from '@nuxt/ui'
import { UBadge } from '#components'
import dayjs from 'dayjs'

const currentPage = ref(1)
const pageSize = ref(10)
const sort = ref<{ column: string, direction: 'asc' | 'desc' }>({
  column: 'createdAt',
  direction: 'desc', // 默认按创建时间倒序（最新在前）
})

// query 传响应式：currentPage 变化时 useFetch 自动重新请求（替代手写 watch + refresh）
const { data, pending } = await useFetch<PagedData<UserListData>>('/api/users', {
  query: {
    currentPage,
    pageSize,
    // computed：sort 变化时 query 变化 → 自动 refetch
    order: computed(() => sort.value.direction),
    orderBy: computed(() => sort.value.column),
  },
  headers: useRequestHeaders(['cookie']),
})

// h() 里用组件要 resolveComponent
const UButton = resolveComponent('UButton')

const toggleSort = (column: string) => {
  if (sort.value.column === column) {
    sort.value.direction = sort.value.direction === 'asc' ? 'desc' : 'asc'
  }
  else {
    sort.value = { column, direction: 'asc' }
  }
  currentPage.value = 1 // 排序后回到第一页
}

// 生成"可排序列头"的渲染函数
const sortableHeader = (column: string, label: string) => () => {
  const active = sort.value.column === column
  return h(UButton, {
    color: 'neutral',
    variant: 'ghost',
    label,
    icon: active
      ? (sort.value.direction === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down')
      : 'i-lucide-arrow-up-down',
    class: '-mx-2.5',
    onClick: () => toggleSort(column),
  })
}

// v4 列定义：TanStack 的 accessorKey + header（不再是 {key,label}）
const columns: TableColumn<UserListData>[] = [
  { accessorKey: 'username', header: '用户名' },
  { accessorKey: 'nickName', header: '昵称' },
  { accessorKey: 'type', header: '类型' },
  { accessorKey: 'role', header: '角色', cell: ({ row }) => {
    const color = {
      admin: 'success' as const,
      normal: 'neutral' as const,
    }[row.getValue('role') as string]

    return h(UBadge, { class: 'capitalize', variant: 'subtle', color }, () =>
      row.getValue('role'))
  } },
  {
    accessorKey: 'createdAt',
    header: sortableHeader('createdAt', '创建时间'),
    cell: ({ row }) => dayjs(row.original.createdAt).format('YYYY-MM-DD HH:mm:ss'),
  },
  {
    accessorKey: 'updatedAt',
    header: sortableHeader('updatedAt', '更新时间'),
    cell: ({ row }) => dayjs(row.original.updatedAt).format('YYYY-MM-DD HH:mm:ss'),
  },
]
</script>

<style scoped>

</style>
