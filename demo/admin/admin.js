/* ==========================================================================
   Nexus Admin · demo 交互脚本（零依赖原生 JS）
   仅供演示：视图切换 / 主题 / 移动侧栏 / 下拉 / 分段 / 翻页 / Toast / 弹窗抽屉。
   真实项目请使用 vue/ 下的组件与 lib（本脚本是其行为的静态演示版，
   下拉定位、滑块测量等算法与组件实现保持一致，见 docs/BEHAVIOR.md）。
   ========================================================================== */

/* ---------- 主题（与资产 lib/theme.ts 同键） ---------- */
const THEME_KEY = 'authnexus.theme'
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  const t = currentTheme() === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem(THEME_KEY, t) } catch {}
})

/* ---------- 浮层开关（弹窗 / 抽屉，通用） ---------- */
function show(id) {
  document.getElementById(id).classList.remove('g-hidden')
  document.getElementById(id + '-scrim').classList.remove('g-hidden')
}
function hide(id) {
  const el = document.getElementById(id)
  const scrim = document.getElementById(id + '-scrim')
  el.classList.add('is-closing')
  scrim.classList.add('is-closing')
  setTimeout(() => {
    el.classList.add('g-hidden')
    el.classList.remove('is-closing')
    scrim.classList.add('g-hidden')
    scrim.classList.remove('is-closing')
  }, 190)
}
document.querySelectorAll('[data-close], [data-close-self]').forEach((el) => {
  el.addEventListener('click', () => hide(el.dataset.close || el.dataset.closeSelf))
})

/* ---------- 确认弹窗（可配置标题/正文/危险样式） ---------- */
let pendingConfirm = null
function openConfirm({ title, desc, bodyHtml, confirmText, danger, onConfirm }) {
  document.getElementById('demo-modal-title').textContent = title
  document.getElementById('demo-modal-desc').textContent = desc || ''
  document.getElementById('demo-modal-body').innerHTML = bodyHtml || ''
  const btn = document.getElementById('demo-modal-confirm')
  btn.textContent = confirmText || '确认'
  btn.className = 'btn ' + (danger ? 'btn--danger' : 'btn--primary')
  pendingConfirm = onConfirm
  show('demo-modal')
}
document.getElementById('demo-modal-confirm').addEventListener('click', () => {
  const cb = pendingConfirm
  pendingConfirm = null
  hide('demo-modal')
  if (cb) cb()
})

/* ---------- Toast ---------- */
/* tone 图标取自资产 lib/icons.ts（与 ToastHost.vue 相同）：ok=check-circle /
   danger=alert-circle / info=info；关闭按钮用 close 图标 */
const TOAST_ICONS = {
  ok: '<circle cx="12" cy="12" r="8.6"/><path d="m8.2 12.2 2.6 2.6 5-5.4"/>',
  danger: '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.8v4.8"/><path d="M12 16.2h.01" stroke-width="2.2"/>',
  info: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.4v4.8"/><path d="M12 7.8h.01" stroke-width="2.2"/>',
  close: '<path d="m6.2 6.2 11.6 11.6M17.8 6.2 6.2 17.8"/>',
}
function toastIcon(body, size) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}
function showToast(tone, title, text) {
  const layer = document.getElementById('toast-layer')
  const el = document.createElement('div')
  el.className = 'toast toast--' + tone
  el.setAttribute('role', tone === 'danger' ? 'alert' : 'status')
  /* 图标（与 ToastHost.vue 一致——tone 的视觉区分在 .toast__icon 的颜色上） */
  const icon = document.createElement('span')
  icon.className = 'toast__icon'
  icon.innerHTML = toastIcon(TOAST_ICONS[tone] || TOAST_ICONS.info, 18)
  el.appendChild(icon)
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
  close.setAttribute('aria-label', '关闭通知')
  close.innerHTML = toastIcon(TOAST_ICONS.close, 14)
  el.appendChild(close)
  layer.appendChild(el)
  const dismiss = () => {
    el.classList.add('is-closing')
    setTimeout(() => el.remove(), 200)
  }
  close.addEventListener('click', dismiss)
  setTimeout(dismiss, 4200)
}
document.querySelectorAll('[data-toast]').forEach((b) => {
  b.addEventListener('click', () => showToast(b.dataset.toast, b.dataset.title || '通知', b.dataset.text || ''))
})

/* ---------- 下拉选择（定位算法与 SelectMenu 一致） ---------- */
const GAP = 6
const MARGIN = 8
function placePanel(btn, panel) {
  const r = btn.getBoundingClientRect()
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
  openFsel.panel.hidden = true
  openFsel = null
}
document.querySelectorAll('.fsel').forEach((root) => {
  const btn = root.querySelector('.fsel__btn')
  const panel = root.querySelector('.fsel__panel')
  if (!btn || !panel) return
  btn.addEventListener('click', () => {
    if (!panel.hidden) { closeFsel(); return }
    closeFsel()
    panel.hidden = false
    placePanel(btn, panel)
    openFsel = { root, btn, panel }
  })
  panel.querySelectorAll('.fsel__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      panel.querySelectorAll('.fsel__opt').forEach((o) => o.classList.remove('is-selected'))
      opt.classList.add('is-selected')
      const val = root.querySelector('.fsel__value')
      if (val) {
        val.textContent = opt.querySelector('.fsel__optlabel').textContent
        val.classList.remove('fsel__value--empty')
      }
      closeFsel()
    })
  })
})
document.addEventListener('pointerdown', (e) => {
  if (openFsel && !openFsel.root.contains(e.target)) closeFsel()
})

/* ---------- 分段开关（滑块测量与 SegmentedControl 一致） ---------- */
function moveSeg(seg) {
  const thumb = seg.querySelector('.segmented__thumb')
  const active = seg.querySelector('.segmented__opt[aria-pressed="true"]')
  if (!thumb || !active) return
  const r = active.getBoundingClientRect()
  if (!r.width) return
  const b = seg.getBoundingClientRect()
  thumb.style.width = Math.round(r.width) + 'px'
  thumb.style.transform = `translateX(${Math.round(r.left - b.left)}px)`
  requestAnimationFrame(() => seg.classList.add('is-ready'))
}
document.querySelectorAll('.segmented').forEach((seg) => {
  seg.querySelectorAll('.segmented__opt').forEach((opt) => {
    opt.addEventListener('click', () => {
      seg.querySelectorAll('.segmented__opt').forEach((o) => o.setAttribute('aria-pressed', 'false'))
      opt.setAttribute('aria-pressed', 'true')
      moveSeg(seg)
    })
  })
})

/* ---------- 应用列表：数据 + 翻页（整块滑动） ---------- */
const APPS = [
  { name: '云枢笔记', id: 'app_yunshu', owner: '林知远', status: 'ok', calls: '1,284' },
  { name: 'Figma', id: 'app_figma', owner: '何叙', status: 'ok', calls: '872' },
  { name: 'Notion', id: 'app_notion', owner: '江余', status: 'ok', calls: '764' },
  { name: 'Linear', id: 'app_linear', owner: '苏晚宁', status: 'warn', calls: '512' },
  { name: 'Raycast', id: 'app_raycast', owner: '林知远', status: 'ok', calls: '430' },
  { name: 'Arc', id: 'app_arc', owner: '何叙', status: 'ok', calls: '388' },
  { name: 'Slack', id: 'app_slack', owner: '江余', status: 'ok', calls: '356' },
  { name: 'Vercel', id: 'app_vercel', owner: '苏晚宁', status: 'warn', calls: '102' },
]
const PAGE_SIZE = 5
const PAGE_COUNT = Math.ceil(APPS.length / PAGE_SIZE)
const STATUS_BADGE = {
  ok: '<span class="badge badge--ok">已上线</span>',
  warn: '<span class="badge badge--warn">待审核</span>',
}
let appsPage = 1
const tbody = document.getElementById('apps-tbody')

function renderApps() {
  const start = (appsPage - 1) * PAGE_SIZE
  tbody.innerHTML = APPS.slice(start, start + PAGE_SIZE)
    .map(
      (r) => `
      <tr>
        <td><div class="cell-main"><span class="appicon appicon--letter">${r.name.slice(0, 1)}</span>
          <div><div class="cell-title">${r.name}</div><div class="cell-sub">${r.id}</div></div></div></td>
        <td>${r.owner}</td>
        <td>${STATUS_BADGE[r.status]}</td>
        <td class="is-num">${r.calls}</td>
        <td><div class="cell-actions"><button class="btn btn--sm btn--ghost" type="button" data-detail="${r.id}">详情</button></div></td>
      </tr>`,
    )
    .join('')
  tbody.classList.remove('paged-anim')
  void tbody.offsetWidth
  tbody.classList.add('paged-anim')
  document.getElementById('apps-page-cur').textContent = String(appsPage)
  document.getElementById('apps-prev').disabled = appsPage <= 1
  document.getElementById('apps-next').disabled = appsPage >= PAGE_COUNT
  document.querySelectorAll('.pager__btn--num').forEach((b) => {
    const cur = Number(b.dataset.page) === appsPage
    b.classList.toggle('is-current', cur)
    if (cur) b.setAttribute('aria-current', 'page')
    else b.removeAttribute('aria-current')
  })
}
document.getElementById('apps-prev').addEventListener('click', () => { if (appsPage > 1) { appsPage--; renderApps() } })
document.getElementById('apps-next').addEventListener('click', () => { if (appsPage < PAGE_COUNT) { appsPage++; renderApps() } })
document.querySelectorAll('.pager__btn--num').forEach((b) =>
  b.addEventListener('click', () => { appsPage = Number(b.dataset.page); renderApps() }),
)
tbody.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-detail]')
  if (!btn) return
  const app = APPS.find((a) => a.id === btn.dataset.detail)
  if (app) openAppDrawer(app)
})

/* ---------- 抽屉（应用详情） ---------- */
function openAppDrawer(app) {
  document.getElementById('demo-drawer-kv').innerHTML = `
    <div class="kv__row"><dt>应用名称</dt><dd>${app.name}</dd></div>
    <div class="kv__row"><dt>应用 ID</dt><dd>${app.id}</dd></div>
    <div class="kv__row"><dt>状态</dt><dd>${STATUS_BADGE[app.status]}</dd></div>
    <div class="kv__row"><dt>归属</dt><dd>${app.owner}</dd></div>
    <div class="kv__row"><dt>调用数</dt><dd>${app.calls}</dd></div>
    <div class="kv__row"><dt>最近调用</dt><dd>2026-10-14 16:02:11</dd></div>`
  show('demo-drawer')
}

/* ---------- 视图切换 ---------- */
const VIEW_TITLES = { overview: '数据概览', apps: '应用管理', new: '新建应用', settings: '偏好设置' }
const navItems = document.querySelectorAll('.sidenav__item[data-view]')
const views = document.querySelectorAll('.view')
function switchView(name) {
  views.forEach((v) => v.classList.toggle('is-active', v.dataset.view === name))
  navItems.forEach((n) => {
    if (n.dataset.view === name) n.setAttribute('aria-current', 'page')
    else n.removeAttribute('aria-current')
  })
  document.getElementById('topbar-title').textContent = VIEW_TITLES[name] || name
  document.documentElement.scrollTop = 0
  closeSide()
  requestAnimationFrame(() => document.querySelectorAll('.segmented').forEach(moveSeg))
}
navItems.forEach((n) => n.addEventListener('click', (e) => { e.preventDefault(); switchView(n.dataset.view) }))
document.querySelectorAll('[data-view-jump]').forEach((b) =>
  b.addEventListener('click', () => switchView(b.dataset.viewJump)),
)

/* ---------- 移动侧栏（≤1023px 变抽屉；打开类在 .shell__side 自身，见 shell.css） ---------- */
const shell = document.getElementById('shell')
const sideEl = document.getElementById('shell-side')
function openSide() {
  shell.classList.add('is-side-open')
  sideEl.classList.add('is-open')
}
function closeSide() {
  shell.classList.remove('is-side-open')
  sideEl.classList.remove('is-open')
}
document.getElementById('nav-toggle').addEventListener('click', () => {
  if (shell.classList.contains('is-side-open')) closeSide()
  else openSide()
})
document.getElementById('side-scrim').addEventListener('click', closeSide)

/* ---------- 表单提交（确认 → toast） ---------- */
document.getElementById('f-submit').addEventListener('click', () => {
  openConfirm({
    title: '提交审核？',
    desc: '提交后 1 个工作日内完成人工核对，期间可撤回。',
    confirmText: '提交审核',
    onConfirm: () => showToast('ok', '已提交审核', '「云栈记账」将在 1 个工作日内完成核对。'),
  })
})

/* ---------- 危险操作（危险确认 → toast） ---------- */
document.getElementById('danger-reset').addEventListener('click', () => {
  openConfirm({
    title: '重置演示数据？',
    desc: '应用列表、动态与统计将恢复到初始状态。',
    bodyHtml: '<div class="alert alert--danger"><div class="alert__body"><div class="alert__text">此操作不可撤销（演示环境无实际影响）。</div></div></div>',
    confirmText: '重置',
    danger: true,
    onConfirm: () => { appsPage = 1; renderApps(); showToast('info', '已重置演示数据') },
  })
})

/* ---------- Esc 关闭最上层浮层 ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (!document.getElementById('demo-modal').classList.contains('g-hidden')) hide('demo-modal')
  else if (!document.getElementById('demo-drawer').classList.contains('g-hidden')) hide('demo-drawer')
  else closeFsel()
})

/* ---------- 初始化 ---------- */
renderApps()
