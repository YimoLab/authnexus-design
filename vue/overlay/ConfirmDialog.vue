<script setup lang="ts">
import { inject } from 'vue'
import type { VNodeChild } from 'vue'
import Icon from '../ui/Icon.vue'
import ModalShell from './ModalShell.vue'
import { OVERLAY_KEY } from './overlayState'

const props = withDefaults(
  defineProps<{
    title: string
    desc?: string
    tone?: 'danger' | 'primary'
    confirmText?: string
    cancelText?: string
    confirmIcon?: string
    /** 补充说明区（用 h() 组合的组件内容） */
    body?: () => VNodeChild
    /** 纯信息提示：只保留一个「知道了」按钮，不出现取消/危险的二选一 */
    infoOnly?: boolean
    onConfirm?: (ctx: { close: () => void }) => void
  }>(),
  { tone: 'primary' },
)

const overlay = inject(OVERLAY_KEY)!

function confirm() {
  if (props.onConfirm) props.onConfirm({ close: () => overlay.close() })
}
</script>

<template>
  <ModalShell :title="title" :desc="desc" size="sm">
    <component :is="body" v-if="body" />
    <template #foot>
      <template v-if="infoOnly">
        <button type="button" class="btn btn--primary" data-autofocus @click="overlay.close()">
          {{ confirmText || '知道了' }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn btn--ghost" @click="overlay.close()">
          {{ cancelText || '取消' }}
        </button>
        <button
          type="button"
          class="btn"
          :class="tone === 'danger' ? 'btn--danger' : 'btn--primary'"
          data-autofocus
          @click="confirm"
        >
          <Icon v-if="confirmIcon" :name="confirmIcon" :size="16" />{{ confirmText || '确认' }}
        </button>
      </template>
    </template>
  </ModalShell>
</template>
