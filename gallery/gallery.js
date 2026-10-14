/* ==========================================================================
   AuthNexus Design · gallery 交互演示（零依赖原生 JS）
   仅供样式画廊：主题切换 / 浮层演示 / 下拉展开 / Toast / 标签指示条 / 分段滑块。
   注意：这是展示与审计用的简化实现——组件真实行为（键盘 / ARIA 播报等完整交互）
   以 vue/ 实现与 docs/BEHAVIOR.md 为准，本页只对齐「视觉与几何算法」。
   ========================================================================== */

/* ---------- 主题切换（与 lib/theme.ts 同键；简化版不做涟漪） ---------- */
const THEME_KEY = 'authnexus.theme'
const themeBtn = document.getElementById('theme-toggle')

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
function syncThemeBtn() {
  if (themeBtn) themeBtn.textContent = currentTheme() === 'dark' ? '切到浅色' : '切到深色'
}
themeBtn?.addEventListener('click', () => {
  const t = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(THEME_KEY, t) } catch {}
  syncThemeBtn()
})
syncThemeBtn()

/* ---------- 浮层演示：[data-overlay="id"] 打开；[data-close="id"] / scrim 关闭 ---------- */
function showOverlay(id) {
  document.getElementById(id)?.classList.remove('g-hidden')
  document.getElementById(id + '-scrim')?.classList.remove('g-hidden')
}
function hideOverlay(id) {
  const el = document.getElementById(id)
  const scrim = document.getElementById(id + '-scrim')
  el?.classList.add('is-closing')
  scrim?.classList.add('is-closing')
  setTimeout(() => {
    el?.classList.add('g-hidden')
    el?.classList.remove('is-closing')
    scrim?.classList.add('g-hidden')
    scrim?.classList.remove('is-closing')
  }, 190)
}
document.addEventListener('click', (e) => {
  const opener = e.target.closest('[data-overlay]')
  if (opener) { showOverlay(opener.dataset.overlay); return }
  const closer = e.target.closest('[data-close]')
  if (closer) { hideOverlay(closer.dataset.close); return }
  const scrim = e.target.closest('[data-close-self]')
  if (scrim) hideOverlay(scrim.dataset.closeSelf)
})

/* ---------- 下拉选择演示：定位算法与 SelectMenu.vue 一致 ---------- */
const GAP = 6
const MARGIN = 8
function placePanel(btn, panel) {
  const r = btn.getBoundingClientRect()
  /* 先设 min-width 再测量（与组件同一铁律） */
  panel.style.minWidth = Math.round(r.width) + 'px'
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight
  const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - pw - MARGIN))
  let top = r.bottom + GAP
  let up = false
  if (top + ph > window.innerHeight - MARGIN && r.top - GAP - ph >= MARGIN) {
    top = r.top - GAP - ph
    up = true
  } else if (top + ph > window.innerHeight - MARGIN) {
    top = Math.max(MARGIN, window.innerHeight - ph - MARGIN)
  }
  panel.style.left = Math.round(left) + 'px'
  panel.style.top = Math.round(top) + 'px'
  panel.dataset.up = up ? 'true' : 'false'
  panel.style.transformOrigin = (up ? 'bottom' : 'top') + ' center'
}
let openFsel = null
function closeFsel() {
  if (!openFsel) return
  openFsel.panel.classList.add('g-hidden')
  openFsel = null
}
document.querySelectorAll('.g-fsel').forEach((root) => {
  const btn = root.querySelector('.fsel__btn')
  const panel = root.querySelector('.fsel__panel')
  const value = root.querySelector('.fsel__value')
  btn.addEventListener('click', () => {
    if (openFsel && openFsel.panel === panel) { closeFsel(); return }
    closeFsel()
    panel.classList.remove('g-hidden')
    placePanel(btn, panel)
    openFsel = { root, btn, panel }
  })
  panel.querySelectorAll('.fsel__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      panel.querySelectorAll('.fsel__opt').forEach((o) => o.classList.remove('is-selected'))
      opt.classList.add('is-selected')
      if (value) {
        value.textContent = opt.querySelector('.fsel__optlabel').textContent
        value.classList.remove('fsel__value--empty')
      }
      closeFsel()
    })
  })
})
document.addEventListener('pointerdown', (e) => {
  if (!openFsel) return
  if (openFsel.root.contains(e.target)) return
  closeFsel()
})
window.addEventListener('scroll', () => { if (openFsel) placePanel(openFsel.btn, openFsel.panel) }, { capture: true, passive: true })
window.addEventListener('resize', () => { if (openFsel) placePanel(openFsel.btn, openFsel.panel) })

/* ---------- Toast 演示 ---------- */
let toastLayer = null
function showToast(tone, title, text) {
  if (!toastLayer) {
    toastLayer = document.createElement('div')
    toastLayer.className = 'toast-layer'
    document.body.appendChild(toastLayer)
  }
  const el = document.createElement('div')
  el.className = 'toast toast--' + tone
  const body = document.createElement('div')
  body.className = 'toast__body'
  const t = document.createElement('div')
  t.className = 'toast__title'
  t.textContent = title
  body.appendChild(t)
  if (text) {
    const d = document.createElement('div')
    d.className = 'toast__text'
    d.textContent = text
    body.appendChild(d)
  }
  el.appendChild(body)
  const close = document.createElement('button')
  close.className = 'toast__close'
  close.type = 'button'
  close.setAttribute('aria-label', '关闭')
  close.textContent = '✕'
  el.appendChild(close)
  toastLayer.appendChild(el)
  const dismiss = () => {
    el.classList.add('is-closing')
    setTimeout(() => el.remove(), 200)
  }
  close.addEventListener('click', dismiss)
  setTimeout(dismiss, 4200)
}
document.querySelectorAll('[data-toast]').forEach((btn) => {
  btn.addEventListener('click', () => showToast(btn.dataset.toast, btn.dataset.title || '演示通知', btn.dataset.text || ''))
})

/* ---------- 标签栏：指示条定位（与 TabBar.vue 同一算法） ---------- */
function inkTabs() {
  document.querySelectorAll('.tabs[data-demo]').forEach((tabs) => {
    const ink = tabs.querySelector('.tabs__ink')
    const active = tabs.querySelector('.tab[aria-selected="true"]')
    if (!ink || !active || !active.getBoundingClientRect().width) return
    const b = tabs.getBoundingClientRect()
    const r = active.getBoundingClientRect()
    ink.style.width = Math.round(r.width) + 'px'
    ink.style.transform = `translateX(${Math.round(r.left - b.left)}px)`
    requestAnimationFrame(() => tabs.classList.add('is-ready'))
  })
}
document.querySelectorAll('.tabs[data-demo] .tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const tabs = tab.closest('.tabs')
    tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', 'false'))
    tab.setAttribute('aria-selected', 'true')
    inkTabs()
  })
})

/* ---------- 分段开关：滑块定位（与 SegmentedControl.vue 同一算法） ---------- */
function moveSeg(seg) {
  const thumb = seg.querySelector('.segmented__thumb')
  const active = seg.querySelector('.segmented__opt[aria-pressed="true"]')
  if (!thumb || !active || !active.getBoundingClientRect().width) return
  const b = seg.getBoundingClientRect()
  const r = active.getBoundingClientRect()
  thumb.style.width = Math.round(r.width) + 'px'
  thumb.style.transform = `translateX(${Math.round(r.left - b.left)}px)`
  requestAnimationFrame(() => seg.classList.add('is-ready'))
}
document.querySelectorAll('.segmented[data-demo]').forEach((seg) => {
  seg.querySelectorAll('.segmented__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      seg.querySelectorAll('.segmented__opt').forEach((o) => o.setAttribute('aria-pressed', 'false'))
      opt.setAttribute('aria-pressed', 'true')
      moveSeg(seg)
    })
  })
})

/* ---------- 首屏就位 ---------- */
window.addEventListener('load', () => {
  inkTabs()
  document.querySelectorAll('.segmented[data-demo]').forEach(moveSeg)
})
