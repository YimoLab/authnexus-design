<script setup lang="ts">
/* ==========================================================================
   AuthNexus Design · 表格分页条
   左侧总数；右侧每页条数 + 页码导航（总页数 ≤ 7 全显，否则两端收敛省略）。
   只有 1 页时不渲染导航，仅保留总数。
   ========================================================================== */
import { computed } from 'vue'
import Icon from './Icon.vue'
import SelectMenu from './SelectMenu.vue'

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    pageSize: number
    sizes?: number[]
  }>(),
  { sizes: () => [10, 20, 50] },
)

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:pageSize', v: number): void
}>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/* 页码序列：总页数 ≤ 7 全部显示；否则保留 1、末页与当前页邻域，间隙用省略号 */
const pages = computed<(number | '…')[]>(() => {
  const n = pageCount.value
  const c = props.page
  if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)
  const keep = new Set<number>([1, n, c - 1, c, c + 1].filter((x) => x >= 1 && x <= n))
  const out: (number | '…')[] = []
  let prev = 0
  for (let i = 1; i <= n; i++) {
    if (!keep.has(i)) continue
    if (prev && i - prev > 1) out.push('…')
    out.push(i)
    prev = i
  }
  return out
})

function go(p: number) {
  if (p < 1 || p > pageCount.value || p === props.page) return
  emit('update:page', p)
}

function onSize(v: string) {
  const n = Number(v)
  if (n && n !== props.pageSize) emit('update:pageSize', n)
}

/* 每页条数选项（自定义下拉需要 { value, label } 形状） */
const sizeOptions = computed(() => props.sizes.map((s) => ({ value: String(s), label: String(s) })))
</script>

<template>
  <div class="pager">
    <span class="pager__total">共 {{ total }} 条</span>
    <div class="pager__nav">
      <span v-if="sizes.length > 1" class="pager__size">
      每页
      <SelectMenu
        compact
        class="pager__select"
        :model-value="String(pageSize)"
        :options="sizeOptions"
        aria-label="每页条数"
        @update:model-value="onSize"
      />
      条
    </span>
      <template v-if="pageCount > 1">
        <button
          type="button"
          class="pager__btn"
          :disabled="page <= 1"
          aria-label="上一页"
          @click="go(page - 1)"
        >
          <Icon name="chevron-left" :size="15" />
        </button>
        <template v-for="(p, i) in pages" :key="i">
          <span v-if="p === '…'" class="pager__gap">…</span>
          <button
            v-else
            type="button"
            class="pager__btn pager__btn--num"
            :class="{ 'is-current': p === page }"
            :aria-current="p === page ? 'page' : undefined"
            @click="go(p)"
          >
            {{ p }}
          </button>
        </template>
        <button
          type="button"
          class="pager__btn"
          :disabled="page >= pageCount"
          aria-label="下一页"
          @click="go(page + 1)"
        >
          <Icon name="chevron-right" :size="15" />
        </button>
      </template>
    </div>
  </div>
</template>
