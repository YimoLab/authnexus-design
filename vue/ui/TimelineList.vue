<script setup lang="ts">
export interface TimelineItem {
  tone?: '' | 'ok' | 'warn' | 'danger'
  title: string
  meta: string
}

defineProps<{ items: TimelineItem[] }>()
</script>

<template>
  <div class="anx-timeline">
    <div v-for="(item, i) in items" :key="i" class="anx-timeline__item">
      <span class="anx-timeline__dot" :class="item.tone ? 'anx-timeline__dot--' + item.tone : ''" />
      <p class="anx-timeline__title">{{ item.title }}</p>
      <p class="anx-timeline__meta">{{ item.meta }}</p>
    </div>
  </div>
</template>
