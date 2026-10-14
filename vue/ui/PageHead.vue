<script setup lang="ts">
defineProps<{
  title: string
  desc?: string
}>()
</script>

<template>
  <header class="page-head">
    <div class="page-head__text">
      <h1 class="t-h1">{{ title }}</h1>
      <p v-if="desc || $slots.desc" class="page-head__desc"><slot name="desc">{{ desc }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="page-head__actions"><slot name="actions" /></div>
  </header>
</template>
