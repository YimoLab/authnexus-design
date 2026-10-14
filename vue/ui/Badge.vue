<script setup lang="ts">
import Icon from './Icon.vue'

withDefaults(
  defineProps<{
    text: string
    tone?: string
    icon?: string
  }>(),
  { tone: 'neutral' },
)
</script>

<template>
  <span class="badge" :class="'badge--' + tone">
    <Icon v-if="icon" :name="icon" :size="12" :stroke="1.9" />{{ text }}
  </span>
</template>
