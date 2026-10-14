<script setup lang="ts">
import { computed } from 'vue'

/** 头像数据：只需这几个字段，任何满足此形状的对象（含字段更宽的实体类型）均可传入 */
interface AvatarUser {
  id?: string | number
  name: string
  initials?: string
  color?: string
  avatar?: string | null
}

const props = withDefaults(
  defineProps<{
    user?: AvatarUser | null
    size?: '' | 'sm' | 'lg'
  }>(),
  { user: null, size: '' },
)

/* 头像底色只取品牌色板内的三档，靠索引轮换出区分度，深浅模式均自动成立 */
const STYLES = [
  { bg: 'var(--ink)', fg: 'var(--paper)' },
  { bg: 'var(--acid)', fg: 'var(--on-acid)' },
  { bg: 'var(--surface-2)', fg: 'var(--ink)' },
]

const style = computed(() => {
  const u = props.user
  if (!u) return STYLES[2]
  const seed = String(u.id || u.name || '?')
  let n = 0
  for (let i = 0; i < seed.length; i++) n = (n + seed.charCodeAt(i)) % STYLES.length
  return STYLES[n]
})

const initials = computed(() => {
  const u = props.user
  if (!u) return '?'
  return u.initials || u.name.slice(0, 1)
})

const hasImg = computed(() => !!props.user?.avatar)
</script>

<template>
  <span
    class="avatar"
    :class="size ? 'avatar--' + size : ''"
    aria-hidden="true"
    :style="hasImg ? undefined : { background: style.bg, color: style.fg }"
  >
    <img v-if="hasImg" :src="user!.avatar as string" alt="" class="avatar__img" />
    <template v-else>{{ initials }}</template>
  </span>
</template>
