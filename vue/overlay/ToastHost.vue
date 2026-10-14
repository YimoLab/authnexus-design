<script setup lang="ts">
import Icon from '../ui/Icon.vue'
import { dismissToast, toastState } from './toast'
import type { ToastTone } from './toast'

function iconFor(tone: ToastTone): string {
  return { ok: 'check-circle', danger: 'alert-circle', info: 'info' }[tone] || 'info'
}
</script>

<template>
  <Teleport to="#toast-layer">
    <div
      v-for="t in toastState.items"
      :key="t.id"
      class="toast"
      :class="['toast--' + t.tone, { 'is-closing': t.closing }]"
      :role="t.tone === 'danger' ? 'alert' : 'status'"
    >
      <span class="toast__icon"><Icon :name="iconFor(t.tone)" :size="17" /></span>
      <div class="toast__body">
        <p class="toast__title">{{ t.title }}</p>
        <p v-if="t.text" class="toast__text">{{ t.text }}</p>
      </div>
      <button type="button" class="toast__close" aria-label="关闭通知" @click="dismissToast(t.id)">
        <Icon name="close" :size="14" />
      </button>
    </div>
  </Teleport>
</template>
