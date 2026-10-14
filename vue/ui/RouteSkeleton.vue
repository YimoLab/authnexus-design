<template>
  <div class="sk-page" role="status" aria-label="页面加载中">
    <div class="sk-head">
      <span class="sk sk--title"></span>
      <span class="sk sk--sub"></span>
    </div>
    <div class="sk-cards">
      <span v-for="i in 3" :key="i" class="sk sk--card"></span>
    </div>
    <div class="sk-panel">
      <span v-for="i in 6" :key="i" class="sk sk--row"></span>
    </div>
  </div>
</template>
