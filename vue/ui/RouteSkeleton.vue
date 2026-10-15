<template>
  <div class="anx-sk-page" role="status" aria-label="页面加载中">
    <div class="anx-sk-head">
      <span class="anx-sk anx-sk--title"></span>
      <span class="anx-sk anx-sk--sub"></span>
    </div>
    <div class="anx-sk-cards">
      <span v-for="i in 3" :key="i" class="anx-sk anx-sk--card"></span>
    </div>
    <div class="anx-sk-panel">
      <span v-for="i in 6" :key="i" class="anx-sk anx-sk--row"></span>
    </div>
  </div>
</template>
