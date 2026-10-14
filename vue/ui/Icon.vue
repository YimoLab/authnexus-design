<script setup lang="ts">
import { iconBody } from '../lib/icons'

withDefaults(
  defineProps<{
    name: string
    size?: number
    stroke?: number
  }>(),
  { size: 18, stroke: 1.6 },
)
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="iconBody(name)"
  />
</template>
