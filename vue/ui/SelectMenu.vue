<script setup lang="ts">
/* ==========================================================================
   AuthNexus Design · 下拉选择（自定义 listbox，替代原生 <select>）
   原生下拉的弹出层由浏览器/系统绘制，无法匹配设计系统（样式、动效都做不了），
   这里用「按钮 + 锚定浮层」自绘一套，凡 FieldInput type="select" 均走此组件。

   实现要点：
     · 浮层的铁律——面板 Teleport 挂 body + fixed + JS 计算坐标：任何渲染
       backdrop-filter 的祖先都会成为 backdrop root，挂在内部磨砂会退化
       （与 AccountMenu / SideFootMenu 同一套规范）；
     · 键盘全程可用：焦点始终留在触发按钮上，用 aria-activedescendant
       把高亮项播报给读屏（↑↓ / Home / End / Enter / Space / Esc / Tab）；
     · 动效沿用 --t / --ease 令牌：面板弹出、chevron 旋转、选项错峰入场、
       勾选缩放浮现；「减少动效」由全局媒体查询统一压缩。
   ========================================================================== */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Icon from './Icon.vue'
import type { FieldOption } from './ui.types'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    options?: FieldOption[]
    id?: string
    placeholder?: string
    disabled?: boolean
    ariaLabel?: string
    /** 紧凑变体（分页条的「每页条数」等小尺寸场景） */
    compact?: boolean
  }>(),
  { modelValue: '', options: () => [], placeholder: '', compact: false },
)

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const ctrlId = props.id || 'sel_' + Math.random().toString(36).slice(2, 9)
const listId = ctrlId + '_list'

const open = ref(false)
/** 首次定位完成前先隐藏，避免在 (0,0) 处闪一帧 */
const placed = ref(false)
/** 空间不足时向上翻转，动效的 transform-origin 与位移方向随之翻 */
const up = ref(false)
const active = ref(0)
const btnEl = ref<HTMLButtonElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const pos = ref({ left: 0, top: 0, w: 0 })

const selectedIndex = computed(() => props.options.findIndex((o) => o.value === props.modelValue))
const selectedLabel = computed(() =>
  selectedIndex.value >= 0 ? props.options[selectedIndex.value].label : '',
)
const activeId = computed(() => (open.value ? optId(active.value) : undefined))

function optId(i: number) {
  return ctrlId + '_opt_' + i
}

const GAP = 6
const MARGIN = 8

/** 计算面板位置：水平与触发按钮左对齐并做视口收敛；垂直默认向下，不足时向上翻转 */
function place() {
  const btn = btnEl.value
  const panel = panelEl.value
  if (!btn || !panel) return
  const r = btn.getBoundingClientRect()
  /* 先把最小宽度对齐到触发按钮再测量：选项较短时最终宽度会被 min-width 抬宽，
     不先对齐会量到偏小的宽度，导致向右溢出 */
  panel.style.minWidth = Math.round(r.width) + 'px'
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight
  const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - pw - MARGIN))
  let top = r.bottom + GAP
  let upwards = false
  if (top + ph > window.innerHeight - MARGIN && r.top - GAP - ph >= MARGIN) {
    top = r.top - GAP - ph
    upwards = true
  } else if (top + ph > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, window.innerHeight - ph - MARGIN)
  }
  pos.value = { left: Math.round(left), top: Math.round(top), w: Math.round(r.width) }
  up.value = upwards
}

/** 让高亮项保持在面板可视区内（不触发祖先滚动，自己算偏移） */
function ensureVisible() {
  const panel = panelEl.value
  if (!panel) return
  const el = panel.querySelector<HTMLElement>('.fsel__opt.is-active')
  if (!el) return
  const top = el.offsetTop
  const bottom = top + el.offsetHeight
  if (top < panel.scrollTop) panel.scrollTop = Math.max(0, top - 6)
  else if (bottom > panel.scrollTop + panel.clientHeight) {
    panel.scrollTop = bottom - panel.clientHeight + 6
  }
}

async function openPanel() {
  if (props.disabled || !props.options.length) return
  open.value = true
  placed.value = false
  active.value = Math.max(0, selectedIndex.value)
  await nextTick()
  place()
  placed.value = true
  await nextTick()
  ensureVisible()
}

function close(backToButton = false) {
  if (!open.value) return
  open.value = false
  placed.value = false
  if (backToButton) btnEl.value?.focus()
}

function toggle() {
  if (open.value) close()
  else void openPanel()
}

function choose(o: FieldOption) {
  if (o.value !== props.modelValue) emit('update:modelValue', o.value)
  close()
  /* 鼠标选择后把焦点还给按钮：焦点不停留在浮层里，Tab 顺序保持自然 */
  btnEl.value?.focus()
}

function move(delta: number) {
  const n = props.options.length
  if (!n) return
  active.value = (active.value + delta + n) % n
  ensureVisible()
}

function onButtonKeydown(e: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      void openPanel()
    }
    return
  }
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault()
      move(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      move(-1)
      break
    case 'Home':
      e.preventDefault()
      active.value = 0
      ensureVisible()
      break
    case 'End':
      e.preventDefault()
      active.value = props.options.length - 1
      ensureVisible()
      break
    case 'Enter':
    case ' ': {
      e.preventDefault()
      const o = props.options[active.value]
      if (o) choose(o)
      break
    }
    case 'Escape':
      e.preventDefault()
      close(true)
      break
    case 'Tab':
      /* 焦点本就在按钮上，收面板后让默认 Tab 正常走 */
      close()
      break
  }
}

/* 点击外部 / Esc / 滚动 / 缩放：收起或重新定位 */
function onDocPointer(e: PointerEvent) {
  if (!open.value) return
  const t = e.target as Node
  if (btnEl.value?.contains(t) || panelEl.value?.contains(t)) return
  close()
}
function onDocKey(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') close(true)
}
function onWinScroll() {
  if (open.value) place()
}
function onWinResize() {
  if (open.value) place()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer, true)
  document.addEventListener('keydown', onDocKey)
  window.addEventListener('scroll', onWinScroll, { capture: true, passive: true })
  window.addEventListener('resize', onWinResize)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer, true)
  document.removeEventListener('keydown', onDocKey)
  window.removeEventListener('scroll', onWinScroll, { capture: true })
  window.removeEventListener('resize', onWinResize)
})

/* 选项列表动态变化（如切换应用后回调地址列表刷新）时收敛高亮下标 */
watch(
  () => props.options,
  () => {
    if (active.value >= props.options.length) {
      active.value = Math.max(0, props.options.length - 1)
    }
  },
)
</script>

<template>
  <div class="fsel" :class="{ 'fsel--sm': compact }">
    <button
      ref="btnEl"
      type="button"
      class="fsel__btn"
      :id="ctrlId"
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      :aria-controls="listId"
      :aria-activedescendant="activeId"
      :aria-label="ariaLabel"
      :disabled="disabled"
      @click="toggle"
      @keydown="onButtonKeydown"
    >
      <span v-if="selectedLabel" class="fsel__value">{{ selectedLabel }}</span>
      <span v-else class="fsel__value fsel__value--empty">{{ placeholder }}</span>
      <Icon class="fsel__caret" name="chevron-down" :size="compact ? 14 : 16" :stroke="1.8" />
    </button>

    <Teleport to="body">
      <Transition name="fsel-pop">
        <div
          v-if="open"
          ref="panelEl"
          class="fsel__panel"
          :class="{ 'fsel__panel--sm': compact }"
          role="listbox"
          :id="listId"
          :data-up="up ? 'true' : 'false'"
          :style="{
            left: pos.left + 'px',
            top: pos.top + 'px',
            minWidth: pos.w + 'px',
            transformOrigin: (up ? 'bottom' : 'top') + ' center',
            visibility: placed ? 'visible' : 'hidden',
          }"
        >
          <div
            v-for="(o, i) in options"
            :key="o.value"
            class="fsel__opt"
            :class="{ 'is-active': i === active, 'is-selected': o.value === modelValue }"
            :id="optId(i)"
            role="option"
            :aria-selected="o.value === modelValue ? 'true' : 'false'"
            :title="o.label"
            :style="{ animationDelay: Math.min(i, 8) * 16 + 'ms' }"
            @mouseenter="active = i"
            @mousedown.prevent
            @click="choose(o)"
          >
            <span class="fsel__optlabel">{{ o.label }}</span>
            <span class="fsel__check" aria-hidden="true">
              <Icon name="check" :size="14" :stroke="2.1" />
            </span>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
