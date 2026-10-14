/* ==========================================================================
   AuthNexus Design · 表格分页逻辑
   客户端分页（mock 模式数据在本地；第二阶段切 http 后改为服务端分页，
   本 composable 的接口形状保持不变，仅 paged 内部改为请求结果）。
   ========================================================================== */
import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface Pager<T> {
  /** 当前页（1 起） */
  page: Ref<number>
  /** 每页条数 */
  pageSize: Ref<number>
  /** 数据总条数 */
  total: ComputedRef<number>
  /** 总页数（至少 1） */
  pageCount: ComputedRef<number>
  /** 当前页应渲染的切片 */
  paged: ComputedRef<T[]>
  /** 翻页方向：1 = 向后翻（页码变大，内容向左滑出 / 自右滑入），-1 = 向前翻 */
  direction: Ref<1 | -1>
  /** 筛选 / 搜索条件变化时回到第一页 */
  reset: () => void
}

export function usePager<T>(source: ComputedRef<T[]>, defaultSize = 10): Pager<T> {
  const page = ref(1)
  const pageSize = ref(defaultSize)
  const direction = ref<1 | -1>(1)
  const total = computed(() => source.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

  /* 翻页方向：供给列表的左右滑动过渡（视图里用它挑选 transition 类名） */
  watch(page, (next, prev) => {
    direction.value = next >= prev ? 1 : -1
  })

  /* 数据增删导致总页数变少时，把当前页收敛回有效范围（不回第一页，避免跳动） */
  watch(pageCount, (n) => {
    if (page.value > n) page.value = n
  })

  const paged = computed(() => {
    const p = Math.min(page.value, pageCount.value)
    return source.value.slice((p - 1) * pageSize.value, p * pageSize.value)
  })

  function reset() {
    page.value = 1
  }

  return { page, pageSize, total, pageCount, paged, direction, reset }
}
