<script setup lang="ts">
import Icon from './Icon.vue'

withDefaults(
  defineProps<{
    icon?: string
    title: string
    text?: string
  }>(),
  { icon: 'file' },
)
</script>

<template>
  <div class="empty">
    <div class="empty__icon"><Icon :name="icon" :size="24" /></div>
    <p class="empty__title">{{ title }}</p>
    <p v-if="text || $slots.text" class="empty__text"><slot name="text">{{ text }}</slot></p>
    <div v-if="$slots.actions" class="empty__actions"><slot name="actions" /></div>
  </div>
</template>
