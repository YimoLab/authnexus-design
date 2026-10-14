<script setup lang="ts">
import { provide } from 'vue'
import { OVERLAY_KEY, closeEntry } from './overlayState'
import type { OverlayEntry } from './overlayState'

const props = defineProps<{ entry: OverlayEntry }>()

provide(OVERLAY_KEY, {
  entry: props.entry,
  close: () => closeEntry(props.entry),
})
</script>

<template>
  <component :is="entry.component" v-bind="entry.props" />
</template>
