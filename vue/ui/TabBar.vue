<script setup lang="ts">
/* ==========================================================================
   AuthNexus Design · 标签栏（滑动指示条）
   标签本体由调用方提供（RouterLink / button 都行），本组件只负责容器与指示条——
   选中下划线是一枚按「当前 aria-selected 的子元素」几何测量定位的指示条，
   切换时平移过去而不是瞬间换色（与 SegmentedControl 的滑块同一套做法：
   选项宽度不等，不能按份数均分）。
   ========================================================================== */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  /** 当前选中的 tab key：仅用于在切换后重新测量（DOM 里的 aria-selected 更权威） */
  active?: string
}>()

const root = ref<HTMLElement | null>(null)
/** 首帧只定位不播动画：就位前选中项继续用 border 下划线，避免重影 */
const ready = ref(false)
const ink = ref({ x: 0, w: 0 })

function measure() {
  const box = root.value
  const active = box?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!box || !active) return
  const b = box.getBoundingClientRect()
  const r = active.getBoundingClientRect()
  /* 容器是横向滚动容器，尚未布局时宽度为 0 —— 这时保持原值，等下一帧再试 */
  if (!r.width) return
  ink.value = { x: Math.round(r.left - b.left), w: Math.round(r.width) }
}

/** 量不到时逐帧重试（隐藏容器、字体未加载、切路由后首次渲染）；仍失败则降级为无指示条 */
function measureSoon() {
  measure()
  let tries = 0
  const tick = () => {
    if (!root.value || ink.value.w > 0 || tries > 30) return
    tries++
    requestAnimationFrame(() => {
      measure()
      if (ink.value.w === 0) tick()
    })
  }
  tick()
}

onMounted(async () => {
  await nextTick()
  measureSoon()
  requestAnimationFrame(() => {
    ready.value = true
  })
  window.addEventListener('resize', measure)
})

onBeforeUnmount(() => window.removeEventListener('resize', measure))

/* flush: post —— 必须在 DOM 更新（aria-selected 已切换）之后再测量 */
watch(() => props.active, measureSoon, { flush: 'post' })
</script>

<template>
  <div ref="root" class="tabs" :class="{ 'is-ready': ready }" role="tablist">
    <span
      class="tabs__ink"
      :class="{ 'is-ready': ready }"
      :style="{ width: ink.w + 'px', transform: `translateX(${ink.x}px)` }"
      aria-hidden="true"
    />
    <slot />
  </div>
</template>
