<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string
    unit?: string
    delta?: string
    deltaTone?: 'up' | 'down'
  }>(),
  {},
)
</script>

<template>
  <div class="anx-stat">
    <p class="anx-stat__label">{{ label }}</p>
    <p class="anx-stat__num">{{ value }}<span v-if="unit" class="anx-stat__unit">{{ unit }}</span></p>
    <p
      v-if="delta || $slots.delta"
      class="anx-stat__delta"
      :class="deltaTone ? 'anx-stat__delta--' + deltaTone : ''"
    >
      <slot name="delta">{{ delta }}</slot>
    </p>
  </div>
</template>
