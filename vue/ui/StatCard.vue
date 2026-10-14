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
  <div class="stat">
    <p class="stat__label">{{ label }}</p>
    <p class="stat__num">{{ value }}<span v-if="unit" class="stat__unit">{{ unit }}</span></p>
    <p
      v-if="delta || $slots.delta"
      class="stat__delta"
      :class="deltaTone ? 'stat__delta--' + deltaTone : ''"
    >
      <slot name="delta">{{ delta }}</slot>
    </p>
  </div>
</template>
