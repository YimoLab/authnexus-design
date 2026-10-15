<script setup lang="ts">
defineProps<{
  title: string
  desc?: string
}>()
</script>

<template>
  <header class="anx-page-head">
    <div class="anx-page-head__text">
      <h1 class="anx-t-h1">{{ title }}</h1>
      <p v-if="desc || $slots.desc" class="anx-page-head__desc"><slot name="desc">{{ desc }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="anx-page-head__actions"><slot name="actions" /></div>
  </header>
</template>
