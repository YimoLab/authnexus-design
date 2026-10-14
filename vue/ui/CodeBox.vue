<script setup lang="ts">
import { ref } from 'vue'
import Icon from './Icon.vue'
import { toast } from '../overlay/toast'

const props = withDefaults(
  defineProps<{
    value: string
    wrap?: boolean
    copy?: boolean
  }>(),
  { wrap: false, copy: true },
)

const done = ref(false)

async function copyIt() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(props.value)
    } else {
      const ta = document.createElement('textarea')
      ta.value = props.value
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '-2000px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    done.value = true
    setTimeout(() => {
      done.value = false
    }, 1600)
  } catch {
    toast({ tone: 'danger', title: '复制失败', text: '当前浏览器不允许脚本写入剪贴板，请手动选中文本复制。' })
  }
}
</script>

<template>
  <div class="codeblock">
    <code class="code" :class="{ 'code--wrap': wrap, 'code--plain': !copy }">{{ value }}</code>
    <button
      v-if="copy"
      type="button"
      class="copybtn codeblock__copy"
      :class="{ 'is-done': done }"
      aria-label="复制内容"
      @click="copyIt"
    >
      <Icon :name="done ? 'check' : 'copy'" :size="14" />
      <span class="visually-hidden">{{ done ? '已复制' : '复制' }}</span>
    </button>
  </div>
</template>
