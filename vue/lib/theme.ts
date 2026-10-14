/* ==========================================================================
   AuthNexus Design · 主题（含切换涟漪过渡）
   与 index.html 的首屏预置脚本共用同一个 localStorage 键（authnexus.theme）。
   themeState 为全局响应式引用，任何组件切换主题后，所有主题图标同步更新。

   过渡约定（调用方只需把触发按钮传进来）：
     · 浅色 → 深色：一枚深色圆盘以按钮为圆心**向外扩散**，收尾时才把主题切过去
       （切换前屏幕已被圆盘铺满，看不到跳色）；
     · 深色 → 浅色：先把主题切到浅色（藏在满屏圆盘之下，同样看不到跳变），
       再让深色圆盘**向按钮收缩**，把浅色界面从四周让出来。
   「减少动效」偏好下直接切换、不做动画；动画期间忽略重复点击。
   ========================================================================== */

import { ref } from 'vue'
import type { Ref } from 'vue'
import { toast } from '../overlay/toast'

export type Theme = 'light' | 'dark'

const THEME_KEY = 'authnexus.theme'
/* 涟漪时长：露出的是真实界面，不需要太长；620ms 时后半段只剩静止画面 */
const RIPPLE_MS = 520

export function currentTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  themeState.value = theme
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* 隐私模式等场景下写入失败不影响当前会话 */
  }
}

export const themeState: Ref<Theme> = ref(currentTheme())

/** 指定主题的页面底色：圆盘填充色必须与真实底色一致，收尾时才看不出跳色 */
function pageColor(theme: Theme): string {
  const probe = document.createElement('div')
  probe.setAttribute('data-theme', theme)
  probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0'
  document.body.appendChild(probe)
  const v = getComputedStyle(probe).getPropertyValue('--paper').trim()
  probe.remove()
  return v || (theme === 'dark' ? '#1A1A1A' : '#FAFAFA')
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 涟漪进行中：忽略重复点击，避免两层动画打架 */
let rippling = false

/* View Transitions（Chromium 111+）：让浏览器把**真实界面**拍成快照，
   我们裁剪的是「界面本身」而不是一块平色圆饼——这是消除大片黑屏的关键。
   不支持的浏览器回落到下面的圆盘方案。 */
interface ViewTransition {
  ready: Promise<void>
  finished: Promise<void>
  skipTransition?: () => void
}
type MaybeVTDocument = Document & {
  startViewTransition?: (cb: () => void) => ViewTransition
}

function supportsViewTransition(): boolean {
  return typeof (document as MaybeVTDocument).startViewTransition === 'function'
}

function rippleGeometry(origin: DOMRect) {
  const x = Math.round(origin.left + origin.width / 2)
  const y = Math.round(origin.top + origin.height / 2)
  /* 圆心到最远那个角的距离：到这个半径即可铺满视口 */
  const far = Math.round(
    Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)),
  )
  return { x, y, far }
}

const EASE = 'cubic-bezier(.4,0,.2,1)'

/**
 * 主方案：视图过渡 + 圆形裁剪
 *   浅→深：裁剪「新快照」由点扩散 —— 深色界面从按钮处长出来；
 *   深→浅：裁剪「旧快照」向按钮收走 —— 深色界面被收回按钮处，浅色界面让出来。
 * 两个方向主题都在过渡开始时切换（旧快照/新快照各自被裁剪，肉眼看不到切换瞬间）。
 */
async function viewTransitionRipple(next: Theme, origin: DOMRect): Promise<boolean> {
  const start = (document as MaybeVTDocument).startViewTransition
  if (!start) return false
  const root = document.documentElement
  const { x, y, far } = rippleGeometry(origin)
  root.setAttribute('data-vt-mode', next === 'dark' ? 'expand' : 'shrink')
  try {
    const vt = start.call(document, () => applyTheme(next))
    await vt.ready
    const target = next === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)'
    const frames =
      next === 'dark'
        ? [`circle(0px at ${x}px ${y}px)`, `circle(${far}px at ${x}px ${y}px)`]
        : [`circle(${far}px at ${x}px ${y}px)`, `circle(0px at ${x}px ${y}px)`]
    const anim = root.animate(
      { clipPath: frames },
      { duration: RIPPLE_MS, easing: EASE, fill: 'both', pseudoElement: target },
    )
    await anim.finished
    await vt.finished.catch(() => {})
    /* fill 会让动画长期挂在 document.getAnimations() 里（多次切换会累积），
       伪元素树此时已被浏览器丢弃，这里显式取消以释放填充引用。
       放在 vt.finished 之后，避免提前撤掉裁剪造成最后一帧闪动。 */
    anim.cancel()
    return true
  } catch {
    /* 过渡被打断或不被允许：主题可能已切换，直接补一次保证落到目标值 */
    applyTheme(next)
    return true
  } finally {
    root.removeAttribute('data-vt-mode')
  }
}

/** 兜底方案：一枚平色圆盘做 clip-path 动画（无视图过渡的浏览器） */
async function discRipple(next: Theme, origin: DOMRect): Promise<void> {
  const from = currentTheme()
  const { x, y, far } = rippleGeometry(origin)
  const full = `circle(${far}px at ${x}px ${y}px)`
  const point = `circle(0px at ${x}px ${y}px)`

  const disc = document.createElement('div')
  disc.className = 'theme-ripple'
  /* 扩散时铺目标主题的底色；收缩时铺当前主题的底色（把它收走，露出新主题） */
  disc.style.background = pageColor(next === 'dark' ? 'dark' : from)
  document.body.appendChild(disc)

  /* 收缩方向先切主题：此刻满屏圆盘盖着，切换在视觉上不可见 */
  if (next !== 'dark') applyTheme(next)

  const anim = disc.animate(
    next === 'dark'
      ? [{ clipPath: point }, { clipPath: full }]
      : [{ clipPath: full }, { clipPath: point }],
    { duration: RIPPLE_MS, easing: EASE, fill: 'both' },
  )
  try {
    await anim.finished
  } catch {
    /* 动画被打断（页面卸载等）：下面的收尾仍会把主题切到目标值 */
  }
  if (next === 'dark') applyTheme(next)
  disc.remove()
}

/** 统一入口：优先视图过渡（露出真实界面），不支持时回落到圆盘 */
async function rippleTo(next: Theme, origin: DOMRect): Promise<void> {
  const done = await viewTransitionRipple(next, origin)
  if (!done) await discRipple(next, origin)
}

export interface ToggleThemeOptions {
  /** 触发按钮：涟漪以它为圆心。模板里通常传 `$event.currentTarget`（类型是 EventTarget） */
  origin?: EventTarget | Element | null
  /** 不弹「已切换到…」提示（首屏预置等场景） */
  silent?: boolean
}

function notify(theme: Theme) {
  toast({ tone: 'info', title: '已切换到' + (theme === 'dark' ? '深色' : '浅色') + '主题', duration: 2400 })
}

/** 切换主题（带涟漪过渡）；返回切换后的主题 */
export function toggleTheme(opts: ToggleThemeOptions = {}): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'

  const el = opts.origin instanceof HTMLElement ? opts.origin : null
  const origin = el ? el.getBoundingClientRect() : null
  const canRipple = Boolean(origin && origin.width > 0) && !reducedMotion() && !rippling

  if (!canRipple) {
    applyTheme(next)
    if (!opts.silent) notify(next)
    return next
  }

  rippling = true
  /* 不阻塞调用方：主题的最终状态由动画收尾保证，调用方照常立即响应（例如关闭账号菜单） */
  void rippleTo(next, origin as DOMRect).finally(() => {
    rippling = false
    if (!opts.silent) notify(next)
  })
  return next
}
