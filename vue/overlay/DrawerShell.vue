<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '../ui/Icon.vue'
import { OVERLAY_KEY } from './overlayState'

defineProps<{
  title?: string
  desc?: string
}>()

const overlay = inject(OVERLAY_KEY)!
const rootEl = ref<HTMLElement | null>(null)
let prevFocus: HTMLElement | null = null

onMounted(() => {
  prevFocus = (document.activeElement as HTMLElement) || null
  setTimeout(() => {
    const root = rootEl.value
    if (!root) return
    const target =
      root.querySelector<HTMLElement>('[data-autofocus]') ||
      root.querySelector<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ||
      root
    try {
      target.focus()
    } catch {
      /* 元素不可聚焦时静默 */
    }
  }, 30)
})

onBeforeUnmount(() => {
  try {
    prevFocus?.focus()
  } catch {
    /* 忽略 */
  }
})
</script>

<template>
  <Teleport to="#overlay-layer">
    <div
      class="scrim"
      :class="{ 'is-closing': overlay.entry.closing }"
      data-scrim
      @click="overlay.entry.dismissible && overlay.close()"
    />
    <aside
      ref="rootEl"
      class="drawer"
      :class="{ 'is-closing': overlay.entry.closing }"
      role="dialog"
      aria-modal="true"
    >
      <div class="drawer__head">
        <div class="od-fill">
          <h2 v-if="title" class="drawer__title">{{ title }}</h2>
          <p v-if="desc" class="t-xs t-faint">{{ desc }}</p>
        </div>
        <button
          v-if="overlay.entry.dismissible"
          type="button"
          class="iconbtn"
          aria-label="关闭"
          @click="overlay.close()"
        >
          <Icon name="close" :size="16" />
        </button>
      </div>
      <div class="drawer__body"><slot /></div>
      <div v-if="$slots.foot" class="drawer__foot"><slot name="foot" /></div>
    </aside>
  </Teleport>
</template>
