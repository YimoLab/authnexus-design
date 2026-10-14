<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  tight?: boolean
}>()
</script>

<template>
  <section class="panel">
    <div v-if="title || subtitle || $slots.actions" class="panel__head">
      <div>
        <h2 v-if="title">{{ title }}</h2>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="panel__head-actions"><slot name="actions" /></div>
    </div>
    <div v-if="$slots.default" class="panel__body" :class="{ 'panel__body--tight': tight }">
      <slot />
    </div>
    <div v-if="$slots.foot" class="panel__foot"><slot name="foot" /></div>
  </section>
</template>
