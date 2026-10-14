<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

const props = withDefaults(
  defineProps<{
    tone?: 'info' | 'ok' | 'warn' | 'danger' | 'plain'
    title?: string
    text?: string
    /** 追加的多行说明（每行渲染为一段 alert__text） */
    lines?: string[]
  }>(),
  { tone: 'info' },
)

const iconName = computed(
  () =>
    ({ info: 'info', ok: 'check-circle', warn: 'alert-triangle', danger: 'alert-circle', plain: 'info' })[
      props.tone
    ] || 'info',
)
const role = computed(() => (props.tone === 'danger' ? 'alert' : 'status'))
</script>

<template>
  <div class="alert" :class="'alert--' + tone" :role="role">
    <Icon :name="iconName" :size="18" />
    <div class="alert__body">
      <p v-if="title" class="alert__title">{{ title }}</p>
      <p v-if="text || $slots.default" class="alert__text"><slot>{{ text }}</slot></p>
      <p v-for="(line, i) in lines || []" :key="i" class="alert__text">{{ line }}</p>
    </div>
  </div>
</template>
