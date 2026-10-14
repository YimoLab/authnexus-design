<script setup lang="ts">
import OverlaySlot from './OverlaySlot.vue'
import { overlayState } from './overlayState'
</script>

<template>
  <OverlaySlot v-for="entry in overlayState.entries" :key="entry.id" :entry="entry" />
</template>
