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
  <div class="anx-empty">
    <div class="anx-empty__icon"><Icon :name="icon" :size="24" /></div>
    <p class="anx-empty__title">{{ title }}</p>
    <p v-if="text || $slots.text" class="anx-empty__text"><slot name="text">{{ text }}</slot></p>
    <div v-if="$slots.actions" class="anx-empty__actions"><slot name="actions" /></div>
  </div>
</template>
