<script setup lang="ts">
import type { KvRow } from './ui.types'

withDefaults(defineProps<{ rows: KvRow[]; tight?: boolean }>(), { tight: false })

const isHtml = (row: KvRow) => row.length > 2 && !!row[2]
</script>

<template>
  <dl class="kv" :class="{ 'kv--tight': tight }">
    <div v-for="(row, i) in rows" :key="i" class="kv__row">
      <dt>{{ row[0] }}</dt>
      <dd v-if="isHtml(row)" v-html="row[1]" />
      <dd v-else>{{ row[1] }}</dd>
    </div>
  </dl>
</template>
