#!/usr/bin/env node
/* ============================================================================
   AuthNexus Design · 官网构建器（组件库文档站）
   ----------------------------------------------------------------------------
   用法：node tools/build-docs.mjs
   产物：_site/（自包含静态站，可直接托管；吃自己的狗粮——站点本身用本资产搭建）

     index.html                首页（含中后台演示的实时预览）
     components/index.html     组件总览（33 张卡片 + 客户端搜索）
     components/<name>.html    组件详情 ×33（API 表来自契约，自动生成）
     guide/index.html          快速开始（中英双语）
     guide/spec.html           交互规范（BEHAVIOR.md 渲染）
     ai/index.html             AI 专区（MCP 工具 / lint 规则，从源码派生）
     assets/docs.css / docs.js 站点样式与脚本
     css|fonts|demo|gallery/   直接复制

   数据来源（单一数据源，不手抄）：
     contracts/components/*.json  → 组件清单 / props / emits / slots / class 契约 / 双语说明
     mcp/server.mjs 的 TOOLS      → AI 专区的 MCP 工具表
     tools/lint-usage.mjs 的 RULES → AI 专区的 lint 规则表
     docs/BEHAVIOR.md             → 交互规范页
   ============================================================================ */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOOLS } from '../mcp/server.mjs'
import { RULES } from './lint-usage.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const SITE = path.join(ROOT, '_site')
const CONTRACTS_DIR = path.join(ROOT, 'contracts', 'components')

/* ---------------------------------------------------------------- 数据加载 */
const contracts = fs
  .readdirSync(CONTRACTS_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => {
    const c = JSON.parse(fs.readFileSync(path.join(CONTRACTS_DIR, f), 'utf8'))
    delete c.$schema
    return c
  })
const components = contracts.filter((c) => c.kind === 'vue-component')
const modules = contracts.filter((c) => c.kind === 'module')

const GROUPS = [
  { id: 'form', zh: '表单', en: 'Form' },
  { id: 'data', zh: '数据展示', en: 'Data display' },
  { id: 'display', zh: '展示', en: 'Display' },
  { id: 'layout', zh: '布局', en: 'Layout' },
  { id: 'nav', zh: '导航', en: 'Navigation' },
  { id: 'overlay', zh: '浮层', en: 'Overlay' },
  { id: 'feedback', zh: '反馈', en: 'Feedback' },
  { id: 'logic', zh: '逻辑', en: 'Logic' },
  { id: 'other', zh: '其他', en: 'Other' },
]
const groupOf = (id) => GROUPS.find((g) => g.id === id) || GROUPS[GROUPS.length - 1]
const byGroup = (list) => {
  const m = new Map()
  for (const g of GROUPS) m.set(g.id, [])
  for (const c of list) (m.get(c.group) || m.get('other')).push(c)
  return [...m.entries()].filter(([, l]) => l.length)
}

const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const REPO = {
  github: 'https://github.com/YimoLab/authnexus-design',
  codeberg: 'https://codeberg.org/YimoLab/authnexus-design',
  gitee: 'https://gitee.com/YimoLab/authnexus-design',
}
const LIVE_SITE = 'https://authnexus-design.app.workbuddy.host/'

/* ---------------------------------------------------------------- 小工具 */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** 双语内联：zh / en 两份内容，由 html[data-lang] 控制显隐 */
const bi = (zh, en) => `<span class="t-zh">${zh}</span><span class="t-en">${en}</span>`
/** 双语块级 */
const bib = (zh, en) => `<div class="t-zh">${zh}</div><div class="t-en">${en}</div>`

const copyBtn = (label) => `<button class="ds-copybtn" type="button" data-copy>${label}</button>`
const codeBlock = (lang, code, { copy = true } = {}) =>
  `<div class="ds-code"><div class="ds-code__bar"><span>${lang}</span>${
    copy ? copyBtn(bi('复制', 'Copy')) : ''
  }</div><pre><code>${esc(code)}</code></pre></div>`

/* ---------------------------------------------------------------- 页面壳 */
const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23262626'/%3E%3Cpath d='M11 21.5V10.5L21 21.5V10.5' stroke='%23fff' stroke-width='2.8' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E"

const NAV = [
  { id: 'home', href: 'index.html', zh: '首页', en: 'Home' },
  { id: 'components', href: 'components/index.html', zh: '组件', en: 'Components' },
  { id: 'guide', href: 'guide/index.html', zh: '快速开始', en: 'Guide' },
  { id: 'spec', href: 'guide/spec.html', zh: '交互规范', en: 'Spec' },
  { id: 'ai', href: 'ai/index.html', zh: 'AI 专区', en: 'For AI' },
]

function shell({ titleZh, titleEn, base, active, body, page }) {
  const nav = NAV.map(
    (n) =>
      `<a href="${base}${n.href}"${n.id === active ? ' class="is-active" aria-current="page"' : ''}>${bi(n.zh, n.en)}</a>`
  ).join('')
  return `<!doctype html>
<html lang="zh-CN" data-lang="zh">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(titleZh)}</title>
<link rel="icon" href="${FAVICON}" />
<link rel="preload" href="${base}fonts/albert-sans-latin.woff2" as="font" type="font/woff2" crossorigin />
<link rel="stylesheet" href="${base}fonts/fonts.css" />
<link rel="stylesheet" href="${base}css/index.css" />
<link rel="stylesheet" href="${base}assets/docs.css" />
<script>
  /* 主题与语言预置（与 ADOPT 模板一致；键 authnexus.theme / authnexus.docs.lang） */
  (function () {
    try {
      var t = localStorage.getItem('authnexus.theme')
      if (t !== 'dark' && t !== 'light') t = 'light'
      document.documentElement.setAttribute('data-theme', t)
      var l = localStorage.getItem('authnexus.docs.lang')
      if (l !== 'zh' && l !== 'en') l = 'zh'
      document.documentElement.setAttribute('data-lang', l)
      document.documentElement.lang = l === 'en' ? 'en' : 'zh-CN'
    } catch (e) {}
  })()
</script>
</head>
<body data-page="${esc(page)}" data-title-zh="${esc(titleZh)}" data-title-en="${esc(titleEn)}">
<a class="ds-skip" href="#main">${bi('跳到正文', 'Skip to content')}</a>
<header class="ds-topbar">
  <div class="ds-topbar__in">
    <a class="ds-logo" href="${base}index.html" aria-label="AuthNexus Design">
      <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--logo-bg)"/><path d="M11 21.5V10.5L21 21.5V10.5" stroke="var(--logo-fg)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      <span class="ds-logo__text">AuthNexus<em>Design</em></span>
    </a>
    <nav class="ds-nav" aria-label="主导航">${nav}</nav>
    <div class="ds-tools">
      <button class="ds-tbtn" id="lang-toggle" type="button" aria-label="切换语言 / Switch language">EN</button>
      <button class="ds-tbtn ds-tbtn--icon" id="theme-toggle" type="button" aria-label="切换主题 / Toggle theme">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle class="ds-ic-sun" cx="12" cy="12" r="4.2"/><path class="ds-ic-sun" d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7"/><path class="ds-ic-moon" d="M20.2 14.4A8.4 8.4 0 0 1 9.6 3.8a8.4 8.4 0 1 0 10.6 10.6Z" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</header>
<main id="main">${body}</main>
<footer class="ds-foot">
  <div class="ds-foot__in">
    <div class="ds-foot__brand">
      <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><rect width="32" height="32" rx="8" fill="var(--logo-bg)"/><path d="M11 21.5V10.5L21 21.5V10.5" stroke="var(--logo-fg)" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      <span>AuthNexus Design · v${VERSION}</span>
    </div>
    <div class="ds-foot__links">
      <a href="${REPO.github}" rel="noopener">GitHub</a>
      <a href="${REPO.codeberg}" rel="noopener">Codeberg</a>
      <a href="${REPO.gitee}" rel="noopener">Gitee</a>
      <a href="${LIVE_SITE}" rel="noopener">${bi('在线演示', 'Live demo')}</a>
    </div>
    <p class="ds-foot__note">${bi(
      `本页 ${components.length} 个组件与 ${modules.length} 个逻辑模块的数据，全部由 <code>contracts/*.json</code> 自动生成；站点自身由本设计系统搭建。`,
      `All data for ${components.length} components and ${modules.length} modules is generated from <code>contracts/*.json</code>. The site itself is built with this design system.`
    )}</p>
  </div>
</footer>
<script src="${base}assets/docs.js"></script>
</body>
</html>`
}

/* ---------------------------------------------------------------- 首页 */
function pageHome() {
  const strip = byGroup(contracts)
    .map(
      ([gid, list]) => `
      <div class="ds-strip__group">
        <h3>${bi(groupOf(gid).zh, groupOf(gid).en)}</h3>
        <ul>${list
          .map(
            (c) =>
              `<li><a href="./components/${c.name}.html">${bi(esc(c.label.zh), esc(c.label.en))}<code>${c.name}</code></a></li>`
          )
          .join('')}</ul>
      </div>`
    )
    .join('')

  const features = [
    {
      zh: ['令牌驱动', '改一处 <code>--acid</code> 全站换色；明暗双主题共用同一份组件代码。'],
      en: ['Token-driven', 'Change one <code>--acid</code> to rebrand. Light and dark share the same component code.'],
    },
    {
      zh: ['零 UI 框架', '没有 UI 框架、没有运行时 UI 库——CSS 七件套 + 33 个自绘组件；唯一的工具依赖 qrcode-generator 只在本地编码二维码。'],
      en: ['No UI framework', 'No UI framework, no runtime UI library — seven CSS files and 33 hand-built components. The only utility dependency, qrcode-generator, encodes QR codes locally.'],
    },
    {
      zh: ['契约即真相', '组件契约同时生成 TS 类型、API 文档与 MCP 工具描述，四端永不漂移。'],
      en: ['Contracts as truth', 'One contract per component generates TS types, API docs and MCP tool descriptions — they can never drift apart.'],
    },
    {
      zh: ['黑盒审计', '54 项浏览器审计把视觉与交互写成断言：玻璃、浮层、对比度、动效。'],
      en: ['Black-box audits', '54 browser audits turn visuals into assertions: glass, overlays, contrast, motion.'],
    },
    {
      zh: ['AI 就绪', 'MCP 四工具给 AI 真实令牌值与 class 契约，lint 把铁律变成可执行检查。'],
      en: ['AI-ready', 'Four MCP tools give AI real token values and class contracts; lint turns rules into checks.'],
    },
    {
      zh: ['中后台基因', '为控制台场景而生：玻璃外壳、分页滑动、抽屉表单、命令式浮层。'],
      en: ['Built for consoles', 'Glass shell, sliding pagination, drawer forms, imperative overlays.'],
    },
  ]
    .map(
      (f) => `<div class="ds-fcard">
      <h3>${bi(f.zh[0], f.en[0])}</h3>
      <p>${bi(f.zh[1], f.en[1])}</p>
    </div>`
    )
    .join('')

  const body = `
<section class="ds-hero">
  <div class="ds-hero__glow" aria-hidden="true"></div>
  <p class="ds-hero__badge">v${VERSION} · ${components.length} ${bi('组件', 'components')} + ${modules.length} ${bi('模块', 'modules')} · ${bi(
    '零 UI 框架',
    'no UI framework'
  )}</p>
  <h1>${bi('鉴枢设计系统', 'AuthNexus Design')}</h1>
  <p class="ds-hero__sub">${bi(
    '令牌驱动 · 零 UI 框架 · 明暗双主题的中后台设计系统。<br/>契约即真相：同一份组件契约，同时生成类型、文档与 AI 工具。',
    'A token-driven design system (no UI framework) for admin consoles.<br/>Contracts are the single source of truth — generating types, docs and AI tools alike.'
  )}</p>
  <div class="ds-hero__actions">
    <a class="anx-btn anx-btn--primary anx-btn--lg" href="./components/">${bi('浏览组件', 'Browse components')}</a>
    <a class="anx-btn anx-btn--ghost anx-btn--lg" href="./guide/">${bi('快速开始', 'Get started')}</a>
    <a class="anx-btn anx-btn--ghost anx-btn--lg" href="./gallery/">${bi('组件画廊', 'Gallery')}</a>
  </div>
  <dl class="ds-hero__stats">
    <div><dt>${components.length + modules.length}</dt><dd>${bi('组件与模块', 'components & modules')}</dd></div>
    <div><dt>54</dt><dd>${bi('黑盒审计', 'browser audits')}</dd></div>
    <div><dt>2</dt><dd>${bi('明暗主题', 'themes')}</dd></div>
    <div><dt>0</dt><dd>${bi('UI 框架依赖', 'UI-framework deps')}</dd></div>
  </dl>
</section>

<section class="ds-sec" id="demo">
  <div class="ds-sec__head">
    <h2>${bi('同一套资产，直接搭出的中后台', 'A real admin console, built with the same assets')}</h2>
    <p>${bi(
      '下面是演示站点的实时预览——玻璃侧栏、统计卡、表格分页、抽屉与弹窗，全部来自本设计系统，无一行框架代码。',
      'A live preview of the demo site — glass sidebar, stat cards, table pagination, drawers and modals, all built with this design system and zero framework code.'
    )}</p>
  </div>
  <div class="ds-browser">
    <div class="ds-browser__bar">
      <i></i><i></i><i></i>
      <span class="ds-browser__url">demo / admin</span>
      <a class="ds-browser__open" href="./demo/admin/" target="_blank" rel="noopener">${bi('新标签打开 ↗', 'Open ↗')}</a>
    </div>
    <iframe src="./demo/admin/index.html" title="${bi('中后台演示', 'Admin demo').replace(/<[^>]+>/g, '')}" loading="lazy"></iframe>
  </div>
</section>

<section class="ds-sec">
  <div class="ds-sec__head">
    <h2>${bi('为什么用它', 'Why this system')}</h2>
    <p>${bi(
      '五个约束换来的一致性：改一处令牌全站生效，任何改动都要过 54 项审计。',
      'Five constraints buy consistency: tokens cascade everywhere, and every change passes 54 audits.'
    )}</p>
  </div>
  <div class="ds-fgrid">${features}</div>
</section>

<section class="ds-sec">
  <div class="ds-sec__head">
    <h2>${bi('全部组件', 'Everything in the box')}</h2>
    <p>${bi(
      '点击任意组件查看 props、emits、class 契约与无障碍约定——全部从源码契约生成。',
      'Open any component for props, emits, class contracts and accessibility — all generated from source contracts.'
    )}</p>
  </div>
  <div class="ds-strip">${strip}</div>
  <p class="ds-sec__more"><a class="anx-btn anx-btn--ghost" href="./components/">${bi('组件总览（含搜索）→', 'Component index (with search) →')}</a></p>
</section>`
  return shell({
    titleZh: 'AuthNexus Design · 鉴枢设计系统',
    titleEn: 'AuthNexus Design · Token-driven design system',
    base: './',
    active: 'home',
    page: 'home',
    body,
  })
}

/* ---------------------------------------------------------------- 组件总览 */
function pageComponentsIndex() {
  const sections = byGroup(contracts)
    .map(
      ([gid, list]) => `
    <section class="ds-cgroup" data-group>
      <h2>${bi(groupOf(gid).zh, groupOf(gid).en)}<span class="ds-cgroup__n">${list.length}</span></h2>
      <div class="ds-cgrid">
        ${list
          .map(
            (c) => `<a class="ds-card" href="./${c.name}.html" data-search="${esc(
              [
                c.name,
                c.label.zh,
                c.label.en,
                c.summary.zh,
                c.summary.en,
                groupOf(c.group).zh,
                groupOf(c.group).en,
              ].join(' ')
            )}">
          <div class="ds-card__top">
            <span class="ds-card__label">${bi(esc(c.label.zh), esc(c.label.en))}</span>
            <code class="ds-card__code">${c.name}</code>
          </div>
          <p class="ds-card__sum">${bi(esc(c.summary.zh), esc(c.summary.en))}</p>
          <span class="ds-card__go" aria-hidden="true">→</span>
        </a>`
          )
          .join('')}
      </div>
    </section>`
    )
    .join('')

  const body = `
<div class="ds-wrap">
  <header class="ds-phead">
    <h1>${bi('组件总览', 'Components')}</h1>
    <p>${bi(
      `${components.length} 个 Vue 组件与 ${modules.length} 个逻辑模块。每个组件都有 props / emits / slots / class 契约——数据来自源码内的契约文件。`,
      `${components.length} Vue components and ${modules.length} logic modules. Each ships with props, emits, slots and a class contract — extracted from the source.`
    )}</p>
  </header>
  <div class="ds-search">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.5-3.5"/></svg>
    <input type="search" id="ds-search"
      data-ph-zh="搜索组件（中文 / English / 类名）…"
      data-ph-en="Search components (中文 / English / class)…"
      placeholder="搜索组件（中文 / English / 类名）…" aria-label="搜索组件" />
    <span class="ds-search__n" id="ds-search-n"></span>
  </div>
  <div id="ds-groups">${sections}</div>
  <p class="ds-empty" id="ds-empty" hidden>${bi('没有匹配的组件', 'No components match')}</p>
</div>`
  return shell({
    titleZh: '组件 · AuthNexus Design',
    titleEn: 'Components · AuthNexus Design',
    base: '../',
    active: 'components',
    page: 'components',
    body,
  })
}

/* ------------------------------------------- 实时示例（详情页内嵌）
   单一来源原则：详情页的「实时示例」不另写一套标记，直接内嵌画廊的区块
   （gallery/index.html?embed=sec-xxx）——官网示例 = 画廊示例 = 被审计的同一份。
   少数无法嵌入的（Icon 图标网格 / theme 开关 / 纯标记组件）用内联示例，
   并在构建期用 class 守卫校验（assertClasses），防止手写示例与资产漂移。 */
const GALLERY_SECTION = {
  /* 值 = 画廊里的演示块 id：
     - demo-* 为**组件级**演示块（详情页只展示该组件自己的示例）
     - sec-*  为整段区块（该段就是这一个组件的多个状态时使用） */
  SelectMenu: 'demo-selectmenu',
  SegmentedControl: 'demo-segmented',
  FieldInput: 'demo-fieldinput',
  TablePager: 'demo-pager',
  usePager: 'demo-pager',
  Badge: 'demo-badge',
  UserAvatar: 'demo-avatar',
  ImagePicker: 'demo-imgpick',
  AlertBox: 'sec-alert',
  CodeBox: 'demo-codebox',
  KvList: 'demo-kvlist',
  StatCard: 'sec-stat',
  TabBar: 'sec-tabs',
  EmptyState: 'demo-empty',
  RouteSkeleton: 'demo-skeleton',
  RouteFade: 'demo-routefade',
  TimelineList: 'sec-timeline',
  QrCode: 'demo-qr',
  qr: 'demo-qr',
  ModalShell: 'demo-modal-btn',
  DrawerShell: 'demo-drawer-btn',
  ConfirmDialog: 'demo-confirm-btn',
  OverlaySlot: 'demo-slot-btn',
  OverlayHost: 'demo-host-btn',
  manager: 'demo-manager',
  overlayState: 'demo-manager',
  toast: 'sec-toast',
  ToastHost: 'sec-toast',
}
const EMBED_HEIGHT = {
  /* 初值 = 粗估；运行时由 docs.js 的 fitEmbeds() 按同源内容高自适应校正。 */
  'demo-selectmenu': 456,
  'demo-segmented': 260,
  'demo-fieldinput': 818,
  'demo-pager': 276,
  'demo-badge': 196,
  'demo-avatar': 288,
  'demo-imgpick': 430,
  'demo-codebox': 538,
  'demo-kvlist': 572,
  'demo-empty': 424,
  'demo-skeleton': 640,
  'demo-routefade': 330,
  'demo-qr': 430,
  'demo-modal-btn': 276,
  'demo-drawer-btn': 276,
  'demo-confirm-btn': 276,
  'demo-slot-btn': 276,
  'demo-host-btn': 276,
  'demo-manager': 276,
  'sec-alert': 650,
  'sec-stat': 686,
  'sec-tabs': 250,
  'sec-timeline': 404,
  'sec-toast': 244,
}

/** 从 vue/lib/icons.ts 提取图标（名称 + SVG 体），供 Icon 详情页渲染图标网格 */
function loadIcons() {
  const src = fs.readFileSync(path.join(ROOT, 'vue', 'lib', 'icons.ts'), 'utf8')
  const block = src.slice(src.indexOf('export const ICONS'), src.indexOf('export function iconBody'))
  const out = []
  const re = /^\s{2}(?:'([\w-]+)'|([\w]+)):\s*'((?:[^'\\]|\\.)*)',\s*$/gm
  let m
  while ((m = re.exec(block)) !== null) out.push([m[1] || m[2], m[3]])
  if (out.length < 50) throw new Error(`icons.ts 解析异常：只提取到 ${out.length} 个图标`)
  return out
}

/** 内联示例的 class 守卫：所有 anx- 类必须能在资产登记表里找到根名 */
function assertClasses(html, where) {
  const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'class-map.json'), 'utf8'))
  const known = new Set(Object.values(map))
  const used = new Set()
  for (const m of html.matchAll(/\bclass="([^"]+)"/g)) m[1].split(/\s+/).forEach((x) => used.add(x))
  const bad = [...used].filter(
    (cls) =>
      cls.startsWith('anx-') && !known.has('anx-' + cls.slice(4).split('__')[0].split('--')[0])
  )
  if (bad.length) throw new Error(`${where} 使用了未登记的资产类：${bad.join(', ')}`)
}

function iconGridBlock() {
  const icons = loadIcons()
  const items = icons
    .map(
      ([name, body]) =>
        `<figure class="ds-icon" title="${esc(name)}"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg><figcaption>${esc(name)}</figcaption></figure>`
    )
    .join('')
  return `<section class="ds-block">
  <h2>${bi('实时示例', 'Live example')}<span class="ds-block__n">${icons.length}</span></h2>
  <p class="ds-dim">${bi(
    '全部图标（从 <code>vue/lib/icons.ts</code> 直接提取，与组件渲染的是同一份 SVG 数据）。',
    'All icons, extracted straight from <code>vue/lib/icons.ts</code> — the same SVG data the component renders.'
  )}</p>
  <div class="ds-icongrid">${items}</div>
</section>`
}

function themeDemoBlock() {
  return `<section class="ds-block">
  <h2>${bi('实时示例', 'Live example')}</h2>
  <p class="ds-dim">${bi(
    '右上角的主题开关就是它（<code>toggleTheme</code> 的简化版）——这里也可以直接试，同样写入 <code>authnexus.theme</code>。',
    'The switch in the top bar is this module (a simplified <code>toggleTheme</code>). Try it here — it writes the same <code>authnexus.theme</code> key.'
  )}</p>
  <div class="ds-demo-surface ds-demo-bar">
    <button class="anx-btn anx-btn--ghost" id="demo-theme-toggle" type="button">${bi('切换明暗主题', 'Toggle theme')}</button>
  </div>
</section>`
}

function staticDemoBlock(html, height) {
  return `<section class="ds-block">
  <h2>${bi('样式预览', 'Preview')}</h2>
  <div class="ds-demo-surface"${height ? ` style="min-height:${height}px"` : ''}>${html}</div>
</section>`
}

function pageHeadDemo() {
  return `<header class="anx-page-head">
    <div class="anx-page-head__text">
      <h1 class="anx-t-h1">应用管理</h1>
      <p class="anx-page-head__desc">管理接入应用、回调地址与权限申请。</p>
    </div>
    <div class="anx-page-head__actions">
      <button class="anx-btn anx-btn--ghost" type="button">导入</button>
      <button class="anx-btn anx-btn--primary" type="button">新建应用</button>
    </div>
  </header>`
}

function panelBlockDemo() {
  return `<section class="anx-panel" style="margin:0">
    <div class="anx-panel__head">
      <div>
        <h2>回调地址</h2>
        <p>授权码将发送到下列地址（仅 https）</p>
      </div>
      <div class="anx-panel__head-actions">
        <button class="anx-btn anx-btn--ghost anx-btn--sm" type="button">编辑</button>
      </div>
    </div>
    <div class="anx-panel__body">
      <p style="margin:0">https://your-app.com/oauth/callback</p>
    </div>
  </section>`
}

function liveBlock(c, isModule) {
  const sec = GALLERY_SECTION[c.name]
  if (sec) {
    const h = EMBED_HEIGHT[sec] || 460
    return `<section class="ds-block">
  <h2>${bi('实时示例', 'Live example')}</h2>
  <div class="ds-embed"><iframe src="../gallery/index.html?embed=${sec}" style="height:${h}px" loading="lazy" title="${esc(c.label.zh)} / ${esc(c.label.en)} — live example"></iframe></div>
  <p class="ds-dim ds-dim--sm">${bi(
    '活体样例，可直接交互（点开浮层 / 下拉 / 试试键盘）——与组件画廊同源，切主题会同步。',
    'Interactive sample straight from the gallery (open overlays, dropdowns, try the keyboard); the theme stays in sync.'
  )}
    <a href="../gallery/index.html?embed=${sec}" target="_blank" rel="noopener">${bi('新标签打开 ↗', 'Open in new tab ↗')}</a>
    · <a href="../gallery/">${bi('看完整画廊', 'Full gallery')}</a>
  </p>
</section>`
  }
  if (c.name === 'Icon' || c.name === 'icons') return iconGridBlock()
  if (c.name === 'theme') return themeDemoBlock()
  if (c.name === 'PageHead') return staticDemoBlock(pageHeadDemo())
  if (c.name === 'PanelBlock') return staticDemoBlock(panelBlockDemo())
  if (isModule) return ''
  return `<section class="ds-block">
  <h2>${bi('实时示例', 'Live example')}</h2>
  <div class="ds-preview">
    <p class="ds-preview__hint">${bi(
      '该组件的交互形态请移步组件画廊与演示页查看（含浮层 / 下拉 / 键盘操作）。',
      'See this component in action in the gallery and the demo site — overlays, dropdowns and keyboard included.'
    )}</p>
    <p class="ds-preview__actions">
      <a class="anx-btn anx-btn--primary" href="../gallery/" target="_blank" rel="noopener">${bi('在画廊中试用 →', 'Try in gallery →')}</a>
      <a class="anx-btn anx-btn--ghost" href="../demo/admin/" target="_blank" rel="noopener">${bi('看它在真实页面里', 'See it in a real page')}</a>
    </p>
  </div>
</section>`
}

/* ---------------------------------------------------------------- 组件详情 */
function pageComponent(c) {
  const g = groupOf(c.group)
  const isModule = c.kind === 'module'

  const props = c.props?.length
    ? `<section class="ds-block">
    <h2>${bi('Props', 'Props')}<span class="ds-block__n">${c.props.length}</span></h2>
    <div class="ds-tablewrap"><table class="ds-table">
      <thead><tr>
        <th>${bi('名称', 'Name')}</th><th>${bi('类型', 'Type')}</th><th>${bi('必填', 'Required')}</th><th>${bi('默认值', 'Default')}</th><th>${bi('说明', 'Notes')}</th>
      </tr></thead>
      <tbody>${c.props
        .map(
          (p) => `<tr>
        <td><code>${esc(p.name)}</code></td>
        <td><code class="ds-type">${esc(p.type)}</code></td>
        <td>${p.required ? bi('是', 'yes') : bi('否', 'no')}</td>
        <td>${p.default ? `<code>${esc(p.default)}</code>` : '—'}</td>
        <td class="ds-note">${esc(p.description || '')}</td>
      </tr>`
        )
        .join('')}</tbody>
    </table></div>
  </section>`
    : `<section class="ds-block"><h2>${bi('Props', 'Props')}</h2><p class="ds-dim">${
        isModule
          ? bi('逻辑模块没有 props——导出与签名见本节「导出」与源码。', 'A logic module has no props — see Exports and the source.')
          : bi('该组件没有 props。', 'This component takes no props.')
      }</p></section>`

  const emits = c.emits?.length
    ? `<section class="ds-block">
    <h2>${bi('Events', 'Events')}<span class="ds-block__n">${c.emits.length}</span></h2>
    <ul class="ds-list">${c.emits
      .map((e) => `<li><code>${esc(e.name)}</code>${e.payload ? ` <span class="ds-dim">— ${esc(e.payload)}</span>` : ''}</li>`)
      .join('')}</ul>
  </section>`
    : ''

  const slots = c.slots?.length
    ? `<section class="ds-block">
    <h2>${bi('Slots', 'Slots')}<span class="ds-block__n">${c.slots.length}</span></h2>
    <p class="ds-chips">${c.slots.map((s) => `<code class="ds-chip">${esc(s.name)}</code>`).join(' ')}</p>
  </section>`
    : ''

  const classes = c.classes?.asset?.length
    ? `<section class="ds-block">
    <h2>${bi('Class 契约', 'Class contract')}</h2>
    <p class="ds-dim">${bi(
      '照抄以下类名，不要自造——它们是本设计系统的唯一命名空间（<code>anx-</code> 前缀）。',
      'Copy these class names as-is — they are the system’s only namespace (<code>anx-</code> prefix).'
    )}</p>
    <p class="ds-chips">${c.classes.asset.map((x) => `<code class="ds-chip">${esc(x)}</code>`).join(' ')}</p>
    ${
      c.classes.state?.length
        ? `<p class="ds-dim ds-dim--sm">${bi('状态类（不加前缀）', 'State classes (no prefix)')}</p>
    <p class="ds-chips">${c.classes.state.map((x) => `<code class="ds-chip ds-chip--alt">${esc(x)}</code>`).join(' ')}</p>`
        : ''
    }
  </section>`
    : ''

  const a11y = c.a11y?.length
    ? `<section class="ds-block">
    <h2>${bi('无障碍', 'Accessibility')}</h2>
    <ul class="ds-list">${c.a11y.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </section>`
    : ''

  const exportsSec = isModule && c.exports?.length
    ? `<section class="ds-block">
    <h2>${bi('导出', 'Exports')}<span class="ds-block__n">${c.exports.length}</span></h2>
    <p class="ds-chips">${c.exports.map((x) => `<code class="ds-chip">${esc(x)}</code>`).join(' ')}</p>
    <p class="ds-dim ds-dim--sm">${bi(
      '完整签名见生成物 <code>dist/index.d.ts</code>（由源码自动提取）。',
      'Full signatures live in <code>dist/index.d.ts</code>, extracted from source.'
    )}</p>
  </section>`
    : ''

  const deps = c.deps?.length
    ? `<section class="ds-block">
    <h2>${bi('依赖', 'Dependencies')}</h2>
    <p class="ds-chips">${c.deps.map((x) => `<code class="ds-chip ds-chip--alt">${esc(x)}</code>`).join(' ')}</p>
  </section>`
    : ''

  const live = liveBlock(c, isModule)

  const body = `
<div class="ds-wrap ds-wrap--doc">
  <nav class="ds-crumb" aria-label="面包屑">
    <a href="./index.html">${bi('组件', 'Components')}</a>
    <span>/</span><span>${bi(g.zh, g.en)}</span>
    <span>/</span><b>${bi(c.label.zh, c.label.en)}</b>
  </nav>
  <header class="ds-dhead">
    <div>
      <h1>${bi(c.label.zh, c.label.en)} <code class="ds-dhead__code">${c.name}</code></h1>
      <p class="ds-dhead__sum">${bi(esc(c.summary.zh), esc(c.summary.en))}</p>
    </div>
    <div class="ds-dhead__meta">
      <span class="ds-tag">${bi(g.zh, g.en)}</span>
      <span class="ds-tag ds-tag--ghost">${isModule ? bi('逻辑模块', 'Logic module') : bi('Vue 组件', 'Vue component')}</span>
    </div>
  </header>
  ${live}
  ${props}
  ${emits}
  ${slots}
  ${classes}
  ${exportsSec}
  ${a11y}
  ${deps}
  <section class="ds-block">
    <h2>${bi('源码', 'Source')}</h2>
    <p class="ds-chips"><code class="ds-chip">${esc(c.source)}</code>
      <a class="ds-ghlink" href="${REPO.github}/blob/main/${esc(c.source)}" rel="noopener">${bi('在 GitHub 上查看', 'View on GitHub')} ↗</a>
    </p>
  </section>
</div>`
  return shell({
    titleZh: `${c.label.zh} ${c.name} · 组件 · AuthNexus Design`,
    titleEn: `${c.label.en} · Components · AuthNexus Design`,
    base: '../',
    active: 'components',
    page: 'component',
    body,
  })
}

/* ---------------------------------------------------------------- 快速开始 */
function pageGuide() {
  const installCode = `# A. 直接复制（推荐起步）：拿 css/ + fonts/ + 需要的组件
git clone ${REPO.github}
cp -r authnexus-design/css authnexus-design/fonts ./vendor/authnexus-design/

# B. 作为依赖安装（未发布 npm，走 git）
npm i github:YimoLab/authnexus-design`

  const importCode = `<!-- 方式一：单入口 CSS（顺序已由 index.css 保证） -->
<link rel="stylesheet" href="./vendor/authnexus-design/fonts/fonts.css" />
<link rel="stylesheet" href="./vendor/authnexus-design/css/index.css" />

<!-- 方式二：JS 引入 -->
import '@yimolab/authnexus-design/css'`

  const themeCode = `<!-- index.html：首屏前预置主题（避免闪烁） -->
<script>
  (function () {
    var t = localStorage.getItem('authnexus.theme')
    if (t !== 'dark' && t !== 'light') t = 'light'
    document.documentElement.setAttribute('data-theme', t)
  })()
</script>

<!-- 切换：改 data-theme 即可（配合 lib/theme.ts 的涟漪过渡） -->
<button onclick="document.documentElement.setAttribute('data-theme', 'dark')">深色</button>`

  const vueCode = `// Vue 3：按需引入组件源码（文件即组件，无构建魔法）
import SelectMenu from './vendor/authnexus-design/vue/ui/SelectMenu.vue'
import { toast } from './vendor/authnexus-design/vue/overlay/toast'
import { openModal, confirmDialog } from './vendor/authnexus-design/vue/overlay/manager'

// 逻辑模块
import { usePager } from './vendor/authnexus-design/vue/lib/usePager'
import { toggleTheme } from './vendor/authnexus-design/vue/lib/theme'`

  const checkCode = `# 铁律可执行检查（禁原生 select / 浮层承载层 / 裸色值…）
node tools/lint-usage.mjs src/

# 黑盒审计（52 项浏览器断言，gallery 起点）
node audit/audit-gallery.mjs`

  const nsRows = [
    {
      k: '<code>anx-*</code>',
      zh: '资产类一律带前缀（<code>.anx-btn</code> / <code>.anx-field</code>）——命名空间隔离，避免污染宿主',
      en: 'All asset classes carry the prefix (<code>.anx-btn</code>, <code>.anx-field</code>) — namespace isolation, no host pollution',
    },
    {
      k: '<code>is-*</code> / <code>has-*</code>',
      zh: '状态类不加前缀（<code>is-open</code> / <code>has-error</code>）——与资产类区分，便于 JS 勾选',
      en: 'State classes stay unprefixed (<code>is-open</code>, <code>has-error</code>) — distinct from assets, easy to toggle',
    },
    {
      k: '<code>--*</code>',
      zh: 'CSS 自定义属性不用前缀（<code>--acid</code> / <code>--r</code>）——换品牌只改 <code>brand.css</code>',
      en: 'Custom properties stay unprefixed (<code>--acid</code>, <code>--r</code>) — rebrand via <code>brand.css</code> only',
    },
    {
      k: '<code>od-*</code>',
      zh: 'OpenDesign 第三方层，仅原型遗留；新代码不要使用',
      en: 'Legacy OpenDesign layer from the prototype — do not use in new code',
    },
  ]
    .map(
      (r) => `<tr><td><code>${r.k.replace(/<\/?code>/g, '')}</code></td><td>${bi(r.zh, r.en)}</td></tr>`
    )
    .join('')

  const body = `
<div class="ds-wrap ds-wrap--doc">
  <header class="ds-phead">
    <h1>${bi('快速开始', 'Get started')}</h1>
    <p>${bi(
      '三步之内把设计系统接进项目：拿资产 → 引样式 → 用组件。所有资产都是普通文件，没有构建插件。',
      'Three steps to adopt: grab the assets, link the CSS, use the components. Everything is plain files — no build plugin.'
    )}</p>
  </header>

  <section class="ds-block">
    <h2><span class="ds-step">1</span>${bi('安装', 'Install')}</h2>
    ${codeBlock('bash', installCode)}
  </section>

  <section class="ds-block">
    <h2><span class="ds-step">2</span>${bi('引入样式与字体', 'Link CSS & fonts')}</h2>
    <p class="ds-dim">${bi(
      '只需 <code>css/index.css</code> 一个入口（内部按依赖顺序引入七件套）；字体已自托管，无外链请求。',
      'A single entry: <code>css/index.css</code> (it imports the seven files in dependency order). Fonts are self-hosted — no external requests.'
    )}</p>
    ${codeBlock('html', importCode)}
    ${codeBlock('html', themeCode)}
  </section>

  <section class="ds-block">
    <h2><span class="ds-step">3</span>${bi('使用组件', 'Use components')}</h2>
    <p class="ds-dim">${bi(
      'Vue 3 项目直接复制 <code>vue/</code> 源码；React 项目按 <a href="./spec.html">交互规范</a> 实现（class 与行为一致，审计即验收）。',
      'For Vue 3, copy the <code>vue/</code> sources. For React, implement against the <a href="./spec.html">behavior spec</a> — same classes, same behavior, verified by the audits.'
    )}</p>
    ${codeBlock('js', vueCode)}
  </section>

  <section class="ds-block">
    <h2>${bi('命名空间与铁律', 'Namespace & rules')}</h2>
    <div class="ds-tablewrap"><table class="ds-table ds-table--kv">
      <tbody>${nsRows}</tbody>
    </table></div>
    <ul class="ds-list">
      <li>${bi('<b>禁用原生 <code>&lt;select&gt;</code></b>——弹出层由系统绘制，样式不可控；用 <code>SelectMenu</code>。', '<b>Never use native <code>&lt;select&gt;</code></b> — the popup is OS-drawn; use <code>SelectMenu</code>.')}</li>
      <li>${bi('<b>浮层必须包在 <code>.anx-overlay-layer</code> 内</b>——承载层提供 z-index 与隔离。', '<b>Overlays must live inside <code>.anx-overlay-layer</code></b> — the carrier owns z-index and isolation.')}</li>
      <li>${bi('<b>Toast 必须带 <code>.anx-toast__icon</code></b>——三种 tone 的区分完全在图标颜色上。', '<b>Toasts must include <code>.anx-toast__icon</code></b> — tone is conveyed by icon color.')}</li>
    </ul>
  </section>

  <section class="ds-block">
    <h2>${bi('把铁律变成检查', 'Turn rules into checks')}</h2>
    <p class="ds-dim">${bi(
      '写完代码跑一遍 lint；改完样式跑一遍审计。这两条命令是质量阀门的全部秘密。',
      'Run lint after writing code; run the audits after touching styles. These two commands are the whole quality gate.'
    )}</p>
    ${codeBlock('bash', checkCode)}
    <p class="ds-sec__more"><a class="anx-btn anx-btn--ghost" href="../ai/index.html">${bi('AI 专区：让模型也用同一份契约 →', 'For AI: let models use the same contracts →')}</a></p>
  </section>
</div>`
  return shell({
    titleZh: '快速开始 · AuthNexus Design',
    titleEn: 'Get started · AuthNexus Design',
    base: '../',
    active: 'guide',
    page: 'guide',
    body,
  })
}

/* ---------------------------------------------------------------- 交互规范 */
function pageSpec() {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'BEHAVIOR.md'), 'utf8')
  const html = md2html(md)
  const body = `
<div class="ds-wrap ds-wrap--doc">
  <header class="ds-phead">
    <h1>${bi('交互规范', 'Behavior spec')}</h1>
    <p>${bi(
      '浮层、玻璃、下拉、分页、标签栏、路由过渡、主题切换——每条都是踩坑后的铁律，审计脚本逐条验收。',
      'Overlays, glass, dropdowns, pagination, tabs, route transitions, theming — every rule comes from a real failure, and the audits verify them.'
    )}</p>
    <p class="ds-note-inline">${bi(
      '（本页全文为中文；English version pending。）',
      '(This document is currently available in Chinese.)'
    )}</p>
  </header>
  <article class="ds-md">${html}</article>
  <p class="ds-sec__more">
    <a class="anx-btn anx-btn--ghost" href="${REPO.github}/blob/main/docs/BEHAVIOR.md" rel="noopener">${bi('在 GitHub 读原文', 'Read the source on GitHub')} ↗</a>
  </p>
</div>`
  return shell({
    titleZh: '交互规范 · AuthNexus Design',
    titleEn: 'Behavior spec · AuthNexus Design',
    base: '../',
    active: 'spec',
    page: 'spec',
    body,
  })
}

/* ---------------------------------------------------------------- AI 专区 */
function pageAI() {
  const toolCards = TOOLS.map((t) => {
    const params = Object.entries(t.inputSchema?.properties || {})
      .map(([k, v]) => {
        const req = (t.inputSchema.required || []).includes(k)
        return `<li><code>${esc(k)}</code>${req ? ' <span class="ds-req">' + bi('必填', 'required') + '</span>' : ''}<span class="ds-dim"> — ${esc(v.description || '')}</span></li>`
      })
      .join('')
    return `<div class="ds-tool">
      <div class="ds-tool__head"><code>${esc(t.name)}</code></div>
      <p class="ds-tool__desc">${esc(t.description)}</p>
      ${params ? `<ul class="ds-list ds-list--tight">${params}</ul>` : ''}
    </div>`
  }).join('')

  const ruleRows = RULES.map(
    (r) => `<tr>
      <td><code>${esc(r.id)}</code></td>
      <td><span class="ds-lv ds-lv--${r.level === 'error' ? 'err' : 'warn'}">${r.level}</span></td>
      <td>${esc(r.desc)}</td>
      <td class="ds-note">${esc(r.why || '')}</td>
    </tr>`
  ).join('')

  const mcpConfig = `{
  "mcpServers": {
    "authnexus-design": {
      "command": "node",
      "args": ["/path/to/authnexus-design/mcp/server.mjs"]
    }
  }
}`

  const pipeline = `contracts/components/*.json   ← 唯一数据源（从源码提取，33 份）
        │
        ├─→ dist/vue.d.ts            组件类型（props / emits / slots）
        ├─→ dist/index.d.ts          逻辑模块签名（从源码提取）
        ├─→ contracts/generated/api.md     官网与本页的 API 表
        └─→ mcp/server.mjs 的工具描述      AI 拿到的准确契约`

  const body = `
<div class="ds-wrap ds-wrap--doc">
  <header class="ds-phead">
    <h1>${bi('AI 专区', 'For AI')}</h1>
    <p>${bi(
      '「AI 友好」不是文档写得多，而是让模型一次做对、改完不漂移——契约喂给类型、文档与工具三端，永远不会互相打架。',
      '“AI-friendly” is not about more docs — it is about getting it right the first time, with no drift. One contract feeds types, docs and tools alike.'
    )}</p>
  </header>

  <section class="ds-block">
    <h2>${bi('为什么它适合 AI 用', 'Why AI works well with it')}</h2>
    <ul class="ds-list">
      <li>${bi(
        '<b>契约即真相</b>：模型拿到的 props / class 契约来自源码本身，不是过期的文档。',
        '<b>Contracts as truth</b>: the props and class contracts models receive are extracted from the source — never stale docs.'
      )}</li>
      <li>${bi(
        '<b>真实令牌值</b>：<code>get_tokens</code> 返回运行用的色值，模型不需要、也不应该凭记忆写 <code>#1890ff</code>。',
        '<b>Real token values</b>: <code>get_tokens</code> returns the actual colors — models need not (and should not) guess <code>#1890ff</code>.'
      )}</li>
      <li>${bi(
        '<b>铁律可执行</b>：7 条 lint 规则把交互铁律变成 exit code，写完就能自动核。',
        '<b>Executable rules</b>: seven lint rules turn behavior rules into exit codes — verify right after writing.'
      )}</li>
    </ul>
  </section>

  <section class="ds-block">
    <h2>${bi('MCP 工具', 'MCP tools')}<span class="ds-block__n">${TOOLS.length}</span></h2>
    <p class="ds-dim">${bi(
      '启动 <code>mcp/server.mjs</code> 后，AI 可通过四个工具拿准确数据（零依赖，手写 JSON-RPC）。',
      'Run <code>mcp/server.mjs</code> and AI gets accurate data through four tools (zero-dependency, hand-written JSON-RPC).'
    )}</p>
    <div class="ds-tools">${toolCards}</div>
    ${codeBlock('json', mcpConfig)}
  </section>

  <section class="ds-block">
    <h2>${bi('lint 规则', 'Lint rules')}<span class="ds-block__n">${RULES.length}</span></h2>
    <div class="ds-tablewrap"><table class="ds-table">
      <thead><tr><th>ID</th><th>${bi('级别', 'Level')}</th><th>${bi('规则', 'Rule')}</th><th>${bi('为什么', 'Why')}</th></tr></thead>
      <tbody>${ruleRows}</tbody>
    </table></div>
  </section>

  <section class="ds-block">
    <h2>${bi('单一数据源管线', 'One source, many outputs')}</h2>
    <p class="ds-dim">${bi(
      '契约从源码提取，四类生成物由它派生——改组件后重跑两个命令，全链路一致。',
      'Contracts are extracted from source; four artifacts derive from them. Re-run two commands after a change and the whole chain stays consistent.'
    )}</p>
    <div class="ds-code"><div class="ds-code__bar"><span>pipeline</span></div><pre><code>${esc(pipeline)}</code></pre></div>
    ${codeBlock(
      'bash',
      `python tools/extract-contracts.py   # 源码 → 契约
node tools/gen-types.mjs            # 契约 → 类型 + API 文档
node mcp/server.mjs --selftest      # 契约 → MCP 工具（自检 ${TOOLS.length} 项断言）`
    )}
  </section>

  <p class="ds-sec__more"><a class="anx-btn anx-btn--ghost" href="../components/index.html">${bi('从组件契约开始看 →', 'Start from the contracts →')}</a></p>
</div>`
  return shell({
    titleZh: 'AI 专区 · AuthNexus Design',
    titleEn: 'For AI · AuthNexus Design',
    base: '../',
    active: 'ai',
    page: 'ai',
    body,
  })
}

/* ---------------------------------------------------------------- markdown
   只做本站要用的子集：标题 / 段落 / 列表 / 表格 / 代码块 / 行内格式 / 引用 / 分割线。
   渲染的是 docs/ 下的规范文档（内容受控），不做通用 markdown——够用且可核对。 */
function md2html(md) {
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>')

  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  let para = []
  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(' '))}</p>`)
      para = []
    }
  }
  while (i < lines.length) {
    const line = lines[i]
    // 代码块
    if (/^```/.test(line)) {
      flushPara()
      const lang = line.slice(3).trim() || 'text'
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i])
        i++
      }
      i++ // 跳过结束 ```
      out.push(
        `<div class="ds-code ds-code--doc"><div class="ds-code__bar"><span>${esc(lang)}</span></div><pre><code>${esc(buf.join('\n'))}</code></pre></div>`
      )
      continue
    }
    // 表格
    if (/^\|/.test(line)) {
      flushPara()
      const rows = []
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(lines[i])
        i++
      }
      const cells = (r) =>
        r
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim())
      const head = cells(rows[0])
      const bodyRows = rows.slice(2).map(cells) // rows[1] 是 |---| 分隔行
      out.push(
        `<div class="ds-tablewrap"><table class="ds-table"><thead><tr>${head
          .map((h) => `<th>${inline(h)}</th>`)
          .join('')}</tr></thead><tbody>${bodyRows
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`
      )
      continue
    }
    // 标题
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    if (h) {
      flushPara()
      const lvl = Math.min(h[1].length + 1, 5) // # → h2，页面里已有 h1
      out.push(`<h${lvl} id="md-${out.length}">${inline(h[2])}</h${lvl}>`)
      i++
      continue
    }
    // 列表
    if (/^(\s*)([-*]|\d+\.)\s+/.test(line)) {
      flushPara()
      const ordered = /^\s*\d+\./.test(line)
      const items = []
      while (i < lines.length && /^(\s*)([-*]|\d+\.)\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        items.push(`<li>${inline(m[3])}</li>`)
        i++
      }
      out.push(`<${ordered ? 'ol' : 'ul'} class="ds-md__list">${items.join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }
    // 引用
    if (/^>\s?/.test(line)) {
      flushPara()
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`)
      continue
    }
    // 分割线
    if (/^\s*---+\s*$/.test(line)) {
      flushPara()
      out.push('<hr />')
      i++
      continue
    }
    // 空行 / 段落
    if (!line.trim()) {
      flushPara()
      i++
      continue
    }
    para.push(line.trim())
    i++
  }
  flushPara()
  return out.join('\n')
}

/* ---------------------------------------------------------------- CSS / JS */
function docsCss() {
  return `/* ==========================================================================
   AuthNexus Design · 官网样式（docs site）
   --------------------------------------------------------------------------
   站点自身由本设计系统搭建：颜色/圆角/动效全部走 tokens.css 的令牌，
   明暗双主题自动跟随。ds- 前缀为本文件私有（不进入资产命名空间）。
   ========================================================================== */

/* 双语：由 html[data-lang] 控制显隐 */
html[data-lang='zh'] .t-en { display: none; }
html[data-lang='en'] .t-zh { display: none; }

body { background: var(--page); }

/* 跳到正文（无障碍） */
.ds-skip { position: absolute; left: -9999px; top: 0; z-index: 300; padding: 10px 14px; background: var(--ink); color: var(--paper); border-radius: 0 0 var(--r-sm) 0; }
.ds-skip:focus { left: 0; }

/* ---------------------------------------------------------------- 顶栏 */
.ds-topbar {
  position: sticky; top: 0; z-index: 60;
  background: color-mix(in srgb, var(--page) 84%, transparent);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border-bottom: 1px solid var(--hairline);
}
.ds-topbar__in { max-width: 1180px; margin: 0 auto; height: 56px; padding: 0 20px; display: flex; align-items: center; gap: 18px; }
.ds-logo { display: inline-flex; align-items: center; gap: 9px; text-decoration: none; color: var(--ink); font-weight: 700; letter-spacing: -.01em; }
.ds-logo__text { font-size: 15px; }
.ds-logo__text em { font-style: normal; font-weight: 500; color: var(--muted-text); margin-left: 5px; }
.ds-nav { display: flex; gap: 2px; margin-left: 8px; flex: 1; }
.ds-nav a { padding: 7px 12px; border-radius: var(--r-sm); font-size: 13.5px; color: var(--muted-text); text-decoration: none; transition: color var(--t), background var(--t); }
.ds-nav a:hover { color: var(--ink); background: var(--bone); }
.ds-nav a.is-active { color: var(--ink); font-weight: 600; }
.ds-tools { display: flex; align-items: center; gap: 8px; }
.ds-tbtn {
  height: 32px; min-width: 38px; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--r-sm);
  background: var(--surface, var(--paper)); color: var(--ink); font: inherit; font-size: 12.5px; font-weight: 600;
  cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  transition: border-color var(--t), background var(--t), transform var(--t);
}
.ds-tbtn:hover { border-color: var(--border-strong); background: var(--bone); }
.ds-tbtn:active { transform: scale(.97); }
.ds-tbtn--icon { min-width: 34px; padding: 0; }
html[data-theme='light'] .ds-ic-moon { display: none; }
html[data-theme='dark'] .ds-ic-sun { display: none; }

/* ---------------------------------------------------------------- 布局 */
.ds-wrap { max-width: 1180px; margin: 0 auto; padding: 40px 20px 72px; }
.ds-wrap--doc { max-width: 880px; }
.ds-sec { max-width: 1180px; margin: 0 auto; padding: 40px 20px; }
.ds-sec__head { margin-bottom: 22px; }
.ds-sec__head h2 { font-size: 26px; font-weight: 700; letter-spacing: -.02em; margin: 0 0 8px; }
.ds-sec__head p { margin: 0; color: var(--muted-text); font-size: 14.5px; max-width: 720px; }
.ds-sec__more { margin-top: 22px; }

/* ---------------------------------------------------------------- 首页 hero */
.ds-hero { position: relative; max-width: 1180px; margin: 0 auto; padding: 84px 20px 20px; text-align: center; overflow: hidden; }
.ds-hero__glow {
  position: absolute; inset: -160px 0 auto 50%; width: 720px; height: 420px; transform: translateX(-50%);
  background: radial-gradient(closest-side, color-mix(in srgb, var(--acid) 30%, transparent), transparent);
  filter: blur(28px); pointer-events: none; opacity: .55;
}
.ds-hero__badge { display: inline-block; margin: 0 0 18px; padding: 5px 12px; border: 1px solid var(--border); border-radius: 999px; font-size: 12.5px; color: var(--muted-text); background: color-mix(in srgb, var(--paper) 70%, transparent); position: relative; }
.ds-hero h1 { position: relative; margin: 0 0 16px; font-size: clamp(34px, 5.4vw, 54px); font-weight: 800; letter-spacing: -.03em; line-height: 1.12; }
.ds-hero__sub { position: relative; margin: 0 auto 26px; max-width: 640px; color: var(--muted-text); font-size: 16px; line-height: 1.7; }
.ds-hero__actions { position: relative; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.ds-hero__stats { position: relative; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; max-width: 720px; margin: 44px auto 0; }
.ds-hero__stats > div { padding: 14px 10px; border: 1px solid var(--hairline); border-radius: var(--r); background: var(--surface, var(--paper)); }
.ds-hero__stats dt { font-size: 22px; font-weight: 800; letter-spacing: -.02em; }
.ds-hero__stats dd { margin: 2px 0 0; font-size: 12px; color: var(--muted-text); }

/* ---------------------------------------------------------------- 浏览器框（实时预览） */
.ds-browser { border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; background: var(--paper); }
.ds-browser__bar { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--hairline); background: var(--bone); }
.ds-browser__bar i { width: 11px; height: 11px; border-radius: 50%; background: var(--border); }
.ds-browser__bar i:nth-child(1) { background: #F97066; }
.ds-browser__bar i:nth-child(2) { background: #FDB022; }
.ds-browser__bar i:nth-child(3) { background: #78EA57; }
.ds-browser__url { flex: 1; margin-left: 8px; font-family: var(--font-mono, ui-monospace, monospace); font-size: 12px; color: var(--muted-text); }
.ds-browser__open { font-size: 12.5px; color: var(--link-text, var(--ink)); text-decoration: none; }
.ds-browser iframe { display: block; width: 100%; height: 560px; border: 0; background: var(--page); }

/* ---------------------------------------------------------------- 特性网格 */
.ds-fgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.ds-fcard { padding: 18px; border: 1px solid var(--hairline); border-radius: var(--r); background: var(--surface, var(--paper)); }
.ds-fcard h3 { margin: 0 0 8px; font-size: 15px; font-weight: 700; }
.ds-fcard p { margin: 0; font-size: 13.5px; color: var(--muted-text); line-height: 1.65; }
.ds-fcard code { font-size: 12px; }

/* ---------------------------------------------------------------- 组件条（首页） */
.ds-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 26px; }
.ds-strip__group h3 { margin: 0 0 8px; font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--muted-text); font-weight: 600; }
.ds-strip__group ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.ds-strip__group a { display: inline-flex; align-items: baseline; gap: 8px; padding: 3px 0; color: var(--ink); text-decoration: none; font-size: 13.5px; border-radius: 6px; }
.ds-strip__group a:hover { color: var(--acid-ink, var(--ink)); }
.ds-strip__group a code { font-size: 11.5px; color: var(--muted-text); }

/* ---------------------------------------------------------------- 组件总览 */
.ds-phead { margin-bottom: 26px; }
.ds-phead h1 { margin: 0 0 10px; font-size: 32px; font-weight: 800; letter-spacing: -.02em; }
.ds-phead p { margin: 0; color: var(--muted-text); font-size: 14.5px; max-width: 760px; }
.ds-note-inline { margin-top: 8px !important; font-size: 12.5px !important; }
.ds-search { display: flex; align-items: center; gap: 10px; padding: 0 14px; height: 46px; border: 1px solid var(--border); border-radius: var(--r); background: var(--surface, var(--paper)); max-width: 460px; margin-bottom: 30px; color: var(--muted-text); }
.ds-search:focus-within { border-color: var(--ink); }
.ds-search input { flex: 1; border: 0; outline: 0; background: transparent; font: inherit; font-size: 14px; color: var(--ink); }
.ds-search__n { font-size: 12px; }
.ds-cgroup { margin-bottom: 34px; }
.ds-cgroup h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 18px; font-weight: 700; }
.ds-cgroup__n { font-size: 11.5px; font-weight: 600; color: var(--muted-text); border: 1px solid var(--hairline); border-radius: 999px; padding: 1px 8px; }
.ds-cgrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.ds-card { position: relative; display: block; padding: 16px 34px 16px 16px; border: 1px solid var(--hairline); border-radius: var(--r); background: var(--surface, var(--paper)); text-decoration: none; color: var(--ink); transition: border-color var(--t), transform var(--t), box-shadow var(--t); }
.ds-card:hover { border-color: var(--border-strong); transform: translateY(-1px); box-shadow: var(--shadow-1, 0 4px 14px rgba(0,0,0,.06)); }
.ds-card__top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; }
.ds-card__label { font-weight: 650; font-size: 14.5px; }
.ds-card__code { font-size: 11.5px; color: var(--muted-text); }
.ds-card__sum { margin: 0; font-size: 12.5px; color: var(--muted-text); line-height: 1.6; min-height: 20px; }
.ds-card__go { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); color: var(--border-strong); transition: transform var(--t), color var(--t); }
.ds-card:hover .ds-card__go { color: var(--ink); transform: translateY(-50%) translateX(2px); }
.ds-empty { text-align: center; color: var(--muted-text); padding: 60px 0; }

/* ---------------------------------------------------------------- 详情页 */
.ds-crumb { display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--muted-text); margin-bottom: 20px; }
.ds-crumb a { color: var(--muted-text); text-decoration: none; }
.ds-crumb a:hover { color: var(--ink); }
.ds-dhead { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding-bottom: 22px; border-bottom: 1px solid var(--hairline); margin-bottom: 8px; }
.ds-dhead h1 { margin: 0 0 8px; font-size: 30px; font-weight: 800; letter-spacing: -.02em; display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ds-dhead__code { font-size: 15px; font-weight: 500; color: var(--muted-text); }
.ds-dhead__sum { margin: 0; color: var(--muted-text); font-size: 14.5px; max-width: 560px; }
.ds-dhead__meta { display: flex; gap: 8px; flex-shrink: 0; }
.ds-tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--acid); color: var(--on-acid, #1A1A1A); }
.ds-tag--ghost { background: transparent; border: 1px solid var(--border); color: var(--muted-text); font-weight: 500; }
.ds-block { padding: 26px 0; border-bottom: 1px solid var(--hairline); }
.ds-block:last-of-type { border-bottom: 0; }
.ds-block h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; font-size: 18px; font-weight: 700; }
.ds-block__n { font-size: 11.5px; font-weight: 600; color: var(--muted-text); border: 1px solid var(--hairline); border-radius: 999px; padding: 1px 8px; }
.ds-step { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--ink); color: var(--paper); font-size: 13px; font-weight: 700; }
.ds-dim { color: var(--muted-text); font-size: 13.5px; margin: 0 0 12px; line-height: 1.7; }
.ds-dim--sm { font-size: 12.5px; margin-top: 14px; }
.ds-list { margin: 0; padding-left: 20px; font-size: 13.5px; line-height: 1.9; }
.ds-list--tight { margin-top: 8px; line-height: 1.7; }
.ds-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; }
.ds-chip { padding: 3px 9px; border: 1px solid var(--hairline); border-radius: 8px; font-size: 12px; color: var(--ink); background: var(--bone); }
.ds-chip--alt { color: var(--muted-text); background: transparent; }
.ds-note { color: var(--muted-text); font-size: 12.5px; }
.ds-ghlink { font-size: 12.5px; text-decoration: none; margin-left: 6px; }
.ds-req { font-size: 11px; color: var(--danger, #D92D20); }
.ds-lv { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.ds-lv--err { background: color-mix(in srgb, var(--danger, #D92D20) 14%, transparent); color: var(--danger, #D92D20); }
.ds-lv--warn { background: color-mix(in srgb, #FDB022 20%, transparent); color: #93610A; }
html[data-theme='dark'] .ds-lv--warn { color: #FDB022; }

/* 实时预览卡（详情页 CTA） */
.ds-preview { margin: 26px 0 4px; padding: 22px; border: 1px dashed var(--border); border-radius: var(--r); background: color-mix(in srgb, var(--acid) 7%, transparent); }
.ds-preview__hint { margin: 0 0 14px; color: var(--muted-text); font-size: 13.5px; line-height: 1.7; }
.ds-preview__actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 0; }

/* ---------------------------------------------------------------- 表格 */
.ds-tablewrap { overflow-x: auto; border: 1px solid var(--hairline); border-radius: var(--r); }
.ds-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.ds-table th, .ds-table td { text-align: left; padding: 10px 13px; border-bottom: 1px solid var(--hairline); vertical-align: top; }
.ds-table thead th { font-size: 12px; letter-spacing: .03em; text-transform: uppercase; color: var(--muted-text); background: var(--bone); font-weight: 600; white-space: nowrap; }
.ds-table tbody tr:last-child td { border-bottom: 0; }
.ds-table code { font-size: 12px; }
.ds-table .ds-type { white-space: nowrap; color: var(--link-text, var(--ink)); }
.ds-table--kv td:first-child { width: 210px; white-space: nowrap; }

/* ---------------------------------------------------------------- 代码块 */
.ds-code { border: 1px solid var(--code-border, var(--hairline)); border-radius: var(--r); overflow: hidden; margin: 12px 0; background: var(--code-bg, var(--bone)); }
.ds-code__bar { display: flex; align-items: center; justify-content: space-between; padding: 7px 12px; border-bottom: 1px solid var(--code-border, var(--hairline)); font-size: 11.5px; color: var(--muted-text); font-family: var(--font-mono, ui-monospace, monospace); }
.ds-code pre { margin: 0; padding: 13px 14px; overflow-x: auto; }
.ds-code code { font-family: var(--font-mono, ui-monospace, SFMono-Regular, Consolas, monospace); font-size: 12.5px; line-height: 1.7; color: var(--code-ink, var(--ink)); }
.ds-copybtn { border: 1px solid var(--border); background: transparent; color: var(--muted-text); border-radius: 7px; font-size: 11px; padding: 2px 9px; cursor: pointer; transition: all var(--t); }
.ds-copybtn:hover { color: var(--ink); border-color: var(--border-strong); }
.ds-copybtn.is-done { color: var(--ok, #12805C); border-color: var(--ok, #12805C); }

/* ---------------------------------------------------------------- 工具卡（AI 专区） */
.ds-tools { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 14px 0 18px; }
.ds-tool { padding: 16px; border: 1px solid var(--hairline); border-radius: var(--r); background: var(--surface, var(--paper)); }
.ds-tool__head code { font-size: 13.5px; font-weight: 600; }
.ds-tool__desc { margin: 9px 0 0; font-size: 12.5px; color: var(--muted-text); line-height: 1.7; }

/* ---------------------------------------------------------------- markdown 文章 */
.ds-md { font-size: 14.5px; line-height: 1.8; }
.ds-md h2 { margin: 34px 0 12px; font-size: 22px; font-weight: 750; letter-spacing: -.01em; border-bottom: 1px solid var(--hairline); padding-bottom: 8px; }
.ds-md h3 { margin: 26px 0 10px; font-size: 17px; font-weight: 700; }
.ds-md h4 { margin: 20px 0 8px; font-size: 15px; font-weight: 700; }
.ds-md p { margin: 0 0 12px; color: var(--ink); }
.ds-md ul, .ds-md ol { padding-left: 22px; margin: 0 0 14px; }
.ds-md li { margin: 3px 0; }
.ds-md blockquote { margin: 0 0 14px; padding: 10px 16px; border-left: 3px solid var(--acid); background: var(--bone); border-radius: 0 var(--r-sm) var(--r-sm) 0; color: var(--muted-text); }
.ds-md hr { border: 0; border-top: 1px solid var(--hairline); margin: 28px 0; }
.ds-md code { font-size: 12.5px; }
.ds-md .ds-code { margin: 14px 0; }

/* ---------------------------------------------------------------- 页脚 */
.ds-foot { border-top: 1px solid var(--hairline); margin-top: 40px; }
.ds-foot__in { max-width: 1180px; margin: 0 auto; padding: 30px 20px 44px; display: grid; gap: 12px; }
.ds-foot__brand { display: flex; align-items: center; gap: 9px; font-weight: 600; font-size: 13.5px; }
.ds-foot__links { display: flex; gap: 16px; flex-wrap: wrap; }
.ds-foot__links a { color: var(--muted-text); text-decoration: none; font-size: 13px; }
.ds-foot__links a:hover { color: var(--ink); }
.ds-foot__note { margin: 6px 0 0; color: var(--muted-text); font-size: 12px; line-height: 1.7; max-width: 720px; }

/* ---------------------------------------------------------------- 实时示例 */
.ds-embed { border: 1px solid var(--hairline); border-radius: var(--r); overflow: hidden; background: var(--paper); }
.ds-embed iframe { display: block; width: 100%; border: 0; background: var(--paper); }
.ds-demo-surface { border: 1px solid var(--hairline); border-radius: var(--r); padding: 22px; background: var(--paper); }
.ds-demo-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.ds-icongrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(86px, 1fr)); gap: 4px; }
.ds-icon {
  display: flex; flex-direction: column; align-items: center; gap: 7px;
  margin: 0; padding: 13px 4px 10px; border: 1px solid transparent; border-radius: var(--r-sm);
  color: var(--ink); transition: border-color var(--t), background var(--t);
}
.ds-icon:hover { border-color: var(--hairline); background: var(--bone); }
.ds-icon figcaption { font-family: var(--font-mono, ui-monospace, monospace); font-size: 10.5px; color: var(--muted-text); }

/* ---------------------------------------------------------------- 响应式 */
@media (max-width: 960px) {
  .ds-fgrid, .ds-cgrid, .ds-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ds-tools { grid-template-columns: 1fr; }
  .ds-browser iframe { height: 460px; }
}
@media (max-width: 640px) {
  .ds-nav { display: none; }
  .ds-nav a { padding: 6px 8px; font-size: 13px; }
  .ds-fgrid, .ds-cgrid, .ds-strip { grid-template-columns: 1fr; }
  .ds-hero__stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ds-dhead { flex-direction: column; }
  .ds-browser iframe { height: 380px; }
}
`
}

function docsJs() {
  return `/* AuthNexus Design · 官网脚本（零依赖） */
(function () {
  var root = document.documentElement
  var KEY_THEME = 'authnexus.theme'
  var KEY_LANG = 'authnexus.docs.lang'

  /* ---- 主题切换（顶栏按钮 + 组件详情页的演示按钮共用） ---- */
  function toggleTheme() {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    root.setAttribute('data-theme', next)
    try { localStorage.setItem(KEY_THEME, next) } catch (e) {}
    /* 同源演示 iframe 有自己的主题预置：切换后重载让它跟上 */
    document.querySelectorAll('iframe').forEach(function (f) {
      try { f.contentWindow.location.reload() } catch (e) {}
    })
  }
  var themeBtn = document.getElementById('theme-toggle')
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme)
  var themeDemoBtn = document.getElementById('demo-theme-toggle')
  if (themeDemoBtn) themeDemoBtn.addEventListener('click', toggleTheme)

  /* ---- 语言切换：html[data-lang] + 标题 + 按钮文字 ---- */
  var langBtn = document.getElementById('lang-toggle')
  function applyLang(lang) {
    root.setAttribute('data-lang', lang)
    root.lang = lang === 'en' ? 'en' : 'zh-CN'
    if (langBtn) langBtn.textContent = lang === 'en' ? '中' : 'EN'
    var zh = document.body.getAttribute('data-title-zh')
    var en = document.body.getAttribute('data-title-en')
    document.title = (lang === 'en' && en) ? en : (zh || document.title)
    /* 带双语 placeholder 的输入框 */
    document.querySelectorAll('[data-ph-zh]').forEach(function (el) {
      var ph = lang === 'en' ? el.getAttribute('data-ph-en') : el.getAttribute('data-ph-zh')
      if (ph) el.setAttribute('placeholder', ph)
    })
  }
  applyLang(root.getAttribute('data-lang') === 'en' ? 'en' : 'zh')
  if (langBtn) {
    langBtn.addEventListener('click', function () {
      var next = root.getAttribute('data-lang') === 'en' ? 'zh' : 'en'
      try { localStorage.setItem(KEY_LANG, next) } catch (e) {}
      applyLang(next)
    })
  }

  /* ---- 代码复制 ---- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wrap = btn.closest('.ds-code')
      var code = wrap && wrap.querySelector('code')
      if (!code) return
      var text = code.textContent
      var done = function () {
        btn.classList.add('is-done')
        var old = btn.textContent
        btn.textContent = root.getAttribute('data-lang') === 'en' ? 'Copied' : '已复制'
        setTimeout(function () { btn.classList.remove('is-done'); btn.textContent = old }, 1400)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(text, done) })
      } else fallback(text, done)
    })
  })
  function fallback(text, done) {
    var ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;left:-9999px'
    document.body.appendChild(ta)
    ta.select()
    try { document.execCommand('copy'); done() } catch (e) {}
    ta.remove()
  }

  /* ---- 实时示例 iframe：同源自适应高度（不靠猜，加载/缩放后自动校正） ---- */
  function fitEmbeds() {
    document.querySelectorAll('.ds-embed iframe').forEach(function (f) {
      try {
        var doc = f.contentDocument
        if (!doc || !doc.body) return
        var h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
        if (h > 120) f.style.height = h + 8 + 'px'
      } catch (e) {}
    })
  }
  document.querySelectorAll('.ds-embed iframe').forEach(function (f) {
    f.addEventListener('load', fitEmbeds)
  })
  var fitTimer = null
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer)
    fitTimer = setTimeout(fitEmbeds, 160)
  })
  fitEmbeds()

  /* ---- 实时示例 iframe：同源自适应高度（不靠猜，加载/缩放后自动校正） ---- */
  function fitEmbeds() {
    document.querySelectorAll('.ds-embed iframe').forEach(function (f) {
      try {
        var doc = f.contentDocument
        if (!doc || !doc.body) return
        var h = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
        if (h > 120) f.style.height = h + 8 + 'px'
      } catch (e) {}
    })
  }
  document.querySelectorAll('.ds-embed iframe').forEach(function (f) {
    f.addEventListener('load', fitEmbeds)
  })
  var fitTimer = null
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer)
    fitTimer = setTimeout(fitEmbeds, 160)
  })
  fitEmbeds()

  /* ---- 组件总览：客户端搜索 ---- */
  var search = document.getElementById('ds-search')
  if (search) {
    var groups = Array.prototype.slice.call(document.querySelectorAll('[data-group]'))
    var empty = document.getElementById('ds-empty')
    var counter = document.getElementById('ds-search-n')
    var allCards = Array.prototype.slice.call(document.querySelectorAll('.ds-card'))
    var total = allCards.length
    var run = function () {
      var q = search.value.trim().toLowerCase()
      var shown = 0
      groups.forEach(function (g) {
        var any = false
        Array.prototype.slice.call(g.querySelectorAll('.ds-card')).forEach(function (card) {
          var hit = !q || (card.getAttribute('data-search') || '').toLowerCase().indexOf(q) !== -1
          card.hidden = !hit
          any = any || hit
          if (hit) shown++
        })
        g.hidden = !any
      })
      if (empty) empty.hidden = shown > 0
      if (counter) counter.textContent = q ? shown + ' / ' + total : ''
    }
    search.addEventListener('input', run)
  }
})()
`
}

/* ---------------------------------------------------------------- 主流程 */
function copyDir(src, dest) {
  fs.cpSync(src, dest, { recursive: true, filter: (s) => !s.includes('.shot') })
}

function main() {
  fs.rmSync(SITE, { recursive: true, force: true })
  fs.mkdirSync(SITE, { recursive: true })

  for (const d of ['css', 'fonts', 'demo', 'gallery']) {
    copyDir(path.join(ROOT, d), path.join(SITE, d))
  }

  const pages = {
    'index.html': pageHome(),
    'components/index.html': pageComponentsIndex(),
    'guide/index.html': pageGuide(),
    'guide/spec.html': pageSpec(),
    'ai/index.html': pageAI(),
  }
  for (const c of contracts) {
    pages[`components/${c.name}.html`] = pageComponent(c)
  }

  for (const [rel, html] of Object.entries(pages)) {
    assertClasses(html, rel)                      // 构建期守卫：页面上的 anx- 类必须都有登记
    const p = path.join(SITE, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, html, 'utf8')
  }
  fs.mkdirSync(path.join(SITE, 'assets'), { recursive: true })
  fs.writeFileSync(path.join(SITE, 'assets', 'docs.css'), docsCss(), 'utf8')
  fs.writeFileSync(path.join(SITE, 'assets', 'docs.js'), docsJs(), 'utf8')

  const n = Object.keys(pages).length
  console.log(`built: _site/（${n} 个页面 = 5 个栏目页 + ${contracts.length} 个组件详情）`)
  console.log(`  组件 ${components.length} / 模块 ${modules.length} / MCP 工具 ${TOOLS.length} / lint 规则 ${RULES.length}`)
}

main()
