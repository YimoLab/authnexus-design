<script setup lang="ts">
export interface TimelineItem {
  tone?: '' | 'ok' | 'warn' | 'danger'
  title: string
  meta: string
}

defineProps<{ items: TimelineItem[] }>()
</script>

<template>
  <div class="timeline">
    <div v-for="(item, i) in items" :key="i" class="timeline__item">
      <span class="timeline__dot" :class="item.tone ? 'timeline__dot--' + item.tone : ''" />
      <p class="timeline__title">{{ item.title }}</p>
      <p class="timeline__meta">{{ item.meta }}</p>
    </div>
  </div>
</template>
