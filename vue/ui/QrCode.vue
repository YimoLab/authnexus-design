<script setup lang="ts">
/* ==========================================================================
   通用二维码展示（lib/qr.ts 的渲染壳）
   恒定「白底 + 深色模块」：扫描器依赖这一对比度，所以这里刻意不跟随主题——
   深色界面下也保持白底，是行业通行做法（Google / GitHub 等均如此）。
   自带白色底板（含静默区），容器只需给四周留白即可保证 ≥4 模块的静默区。
   ========================================================================== */
import { computed } from 'vue'
import { qrMatrix } from '../lib/qr'

const props = withDefaults(
  defineProps<{
    /** 要编码的文本（otpauth 链接、Wi-Fi 串等） */
    text: string
    /** 无障碍描述（读屏用） */
    label?: string
    /** 展示边长（px） */
    size?: number
  }>(),
  { label: '二维码', size: 216 },
)

const qr = computed(() => qrMatrix(props.text))
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    :viewBox="qr.viewBox"
    role="img"
    :aria-label="props.label"
    shape-rendering="crispEdges"
  >
    <rect :width="qr.size" :height="qr.size" fill="#ffffff" />
    <path :d="qr.path" fill="#111111" />
  </svg>
</template>
