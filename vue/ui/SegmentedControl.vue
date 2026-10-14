<script setup lang="ts">
/* ==========================================================================
   AuthNexus Design · 分段开关
   选中态是一枚会滑动的「滑块」（.segmented__thumb）：切换时从旧选项平滑滑到
   新选项，而不是瞬间变色。滑块位置按选中按钮的实际几何位置测量（各选项文案
   长度不同，不能用等分宽度），并在窗口尺寸变化时重新测量。
   样式见 app.css 第 32 节（原型 .segmented 基类的动效增强）。
   ========================================================================== */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { FieldOption } from './ui.types'

const props = defineProps<{
  modelValue: string
  options: FieldOption[]
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const root = ref<HTMLElement | null>(null)
const thumb = ref({ x: 0, w: 0 })
/* 首帧只定位、不播动画（否则打开弹窗时滑块会从最左侧"飞"进来） */
const ready = ref(false)

function measure(): boolean {
  const box = root.value
  const active = box?.querySelector<HTMLElement>('.segmented__opt[aria-pressed="true"]')
  if (!box || !active) return false
  const b = box.getBoundingClientRect()
  const r = active.getBoundingClientRect()
  if (!r.width) return false
  thumb.value = { x: r.left - b.left, w: r.width }
  return true
}

onMounted(async () => {
  await nextTick()
  /* 量到尺寸才「就位」（滑块瞬时出现、此后移动才走过渡）；量不到时逐帧重试，
     兼容挂载在隐藏容器里的情况——超时则保持「未就位」的降级态（文字可读、无滑块）。
     就位前选中项用普通文字色（见 CSS），避免反白字先闪在浅底上。 */
  let attempts = 0
  const tryMeasure = () => {
    if (measure()) {
      requestAnimationFrame(() => {
        ready.value = true
      })
      return
    }
    if (attempts++ < 60) requestAnimationFrame(tryMeasure)
  }
  tryMeasure()
})

watch(
  () => props.modelValue,
  async () => {
    await nextTick()
    measure()
  },
)

function onResize() {
  measure()
}
window.addEventListener('resize', onResize)
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
</script>

<template>
  <div ref="root" class="segmented" :class="{ 'is-ready': ready }" role="group">
    <span
      class="segmented__thumb"
      :style="{ width: thumb.w + 'px', transform: `translateX(${thumb.x}px)` }"
      aria-hidden="true"
    />
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="segmented__opt"
      :aria-pressed="String(modelValue) === String(o.value)"
      @click="emit('update:modelValue', o.value)"
    >
      {{ o.label }}
    </button>
  </div>
</template>
