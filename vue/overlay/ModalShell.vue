<script setup lang="ts">
import { inject, onBeforeUnmount, onMounted, ref } from 'vue'
import Icon from '../ui/Icon.vue'
import { OVERLAY_KEY } from './overlayState'

withDefaults(
  defineProps<{
    title?: string
    desc?: string
    size?: '' | 'sm' | 'lg'
  }>(),
  { size: '' },
)

const overlay = inject(OVERLAY_KEY)!
const rootEl = ref<HTMLElement | null>(null)
let prevFocus: HTMLElement | null = null

function focusables(): HTMLElement[] {
  const root = rootEl.value
  if (!root) return []
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
}

onMounted(() => {
  prevFocus = (document.activeElement as HTMLElement) || null
  setTimeout(() => {
    const target =
      rootEl.value?.querySelector<HTMLElement>('[data-autofocus]') || focusables()[0] || rootEl.value
    try {
      target?.focus()
    } catch {
      /* 元素不可聚焦时静默 */
    }
  }, 30)
})

onBeforeUnmount(() => {
  try {
    prevFocus?.focus()
  } catch {
    /* 原焦点元素已随页面卸载时忽略 */
  }
})

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Tab') return
  const list = focusables()
  if (!list.length) {
    e.preventDefault()
    return
  }
  const first = list[0]
  const last = list[list.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
</script>

<template>
  <Teleport to="#overlay-layer">
    <div
      class="scrim"
      :class="{ 'is-closing': overlay.entry.closing }"
      data-scrim
      @click="overlay.entry.dismissible && overlay.close()"
    />
    <div
      ref="rootEl"
      class="modal"
      :class="[size ? 'modal--' + size : '', { 'is-closing': overlay.entry.closing }]"
      role="dialog"
      aria-modal="true"
      @keydown="onKeydown"
    >
      <div v-if="title || desc" class="modal__head">
        <div class="modal__head-text">
          <h2 v-if="title" class="modal__title">{{ title }}</h2>
          <p v-if="desc" class="modal__desc">{{ desc }}</p>
        </div>
        <button
          v-if="overlay.entry.dismissible"
          type="button"
          class="iconbtn modal__close"
          aria-label="关闭"
          @click="overlay.close()"
        >
          <Icon name="close" :size="16" />
        </button>
      </div>
      <div v-if="$slots.default" class="modal__body"><slot /></div>
      <div v-if="$slots.foot" class="modal__foot"><slot name="foot" /></div>
    </div>
  </Teleport>
</template>
