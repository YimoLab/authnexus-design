/* ==========================================================================
   AuthNexus Design · audit-gallery.mjs — 组件级审计（框架无关）
   --------------------------------------------------------------------------
   跑在零框架的 gallery/ 上：断言「资产本身是否正确」，与项目路由无关。
   任何项目接入资产后都可以拿它当第一道闸门——它验证的是 CSS 与结构契约，
   不关心组件是 Vue 还是 React 实现的。

   覆盖：
     · 资产层：令牌值 / 实底文字对比度 / 玻璃配方 / 自托管字体（零外部请求）
     · 结构层：按钮·输入框·分段·分页·标签栏·下拉 的存在性与关键几何
     · 回归护栏（曾真实踩过的坑）：
         - 分段开关不得被父容器拉满（inline-flex 被 grid/flex 拉伸）
         - toast 三态必须有 .toast__icon 且颜色互不相同
         - 浮层必须被 .overlay-layer(z-index:100) 承载并真正盖住页面
   用法：node audit/audit-gallery.mjs [画廊URL]
        GALLERY_URL=... node audit/audit-gallery.mjs
   ========================================================================== */
import { chromium } from 'playwright-core'
import { loadConfig } from './lib.mjs'

const cfg = loadConfig()
const URL = process.argv[2] || process.env.GALLERY_URL || 'http://127.0.0.1:8123/gallery/'
const THEMES = ['light', 'dark']

let pass = 0
let fail = 0
const failures = []
const say = (ok, label, detail = '') => {
  if (ok) pass++
  else {
    fail++
    failures.push(label + (detail ? ` :: ${detail}` : ''))
  }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok || !detail ? '' : `  → ${detail}`}`)
}

const browser = await chromium.launch({ executablePath: cfg.chromePath })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const external = []
const badResponses = []
const consoleErrors = []
page.on('request', (r) => {
  if (/fonts\.(googleapis|gstatic)\.com/i.test(r.url())) external.push(r.url())
})
page.on('response', (r) => {
  if (r.status() >= 400) badResponses.push(r.status() + ' ' + r.url())
})
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push(String(e)))

console.log(`组件级审计 · ${URL}\n`)
await page.goto(URL, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)

/* ---------------- 资产层（与主题无关） ---------------- */
console.log('【资产层】')
const asset = await page.evaluate(async () => {
  await document.fonts.load('400 32px "Albert Sans"')
  await document.fonts.load('700 32px "Albert Sans"')
  await document.fonts.load('600 20px "IBM Plex Mono"')
  await document.fonts.ready
  const ctx = document.createElement('canvas').getContext('2d')
  const w = (f) => {
    ctx.font = f
    return ctx.measureText('Handgloves 鉴枢 授权中心').width
  }
  return {
    albertLoaded: document.fonts.check('400 32px "Albert Sans"') && document.fonts.check('700 32px "Albert Sans"'),
    plexLoaded: document.fonts.check('600 20px "IBM Plex Mono"'),
    w400: Math.round(w('400 32px "Albert Sans"') * 10) / 10,
    w700: Math.round(w('700 32px "Albert Sans"') * 10) / 10,
    glassBlur: getComputedStyle(document.documentElement).getPropertyValue('--glass-blur').trim(),
    selects: [...document.querySelectorAll('select')].map((s) => s.className || '(无 class)'),
  }
})
say(asset.albertLoaded, 'Albert Sans 400/700 均已加载（自托管）')
say(asset.plexLoaded, 'IBM Plex Mono 600 已加载（自托管）')
say(asset.w400 !== asset.w700, '可变字体按字重插值', `400=${asset.w400} 700=${asset.w700}`)
say(!!asset.glassBlur, '玻璃配方令牌存在（--glass-blur）', asset.glassBlur)
say(
  asset.selects.length === 0,
  '无原生 <select>（弹出层由系统绘制、不可定制；正式下拉一律 SelectMenu）',
  `found ${asset.selects.length}`,
)
say(external.length === 0, '无外部字体请求（Google Fonts）', external.join(', '))

/* ---------------- 逐主题断言 ---------------- */
for (const theme of THEMES) {
  console.log(`\n【${theme}】`)
  await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await page.waitForTimeout(260)

  /* 令牌与对比度 */
  const tok = await page.evaluate(() => {
    const root = document.documentElement
    const cs = getComputedStyle(root)
    const hex2rgb = (h) => {
      const s = h.trim()
      if (s.startsWith('#')) {
        const n = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1)
        return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`
      }
      return s
    }
    const lum = (c) => {
      const [r, g, b] = c.match(/\d+/g).map(Number).map((v) => {
        v /= 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const ratio = (a, b) => {
      const l1 = lum(a)
      const l2 = lum(b)
      const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
      return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100
    }
    return {
      acid: hex2rgb(cs.getPropertyValue('--acid')),
      onAcid: hex2rgb(cs.getPropertyValue('--on-acid')),
      ink: hex2rgb(cs.getPropertyValue('--ink')),
      onDark: hex2rgb(cs.getPropertyValue('--on-dark')),
      onAcidRatio: ratio(hex2rgb(cs.getPropertyValue('--on-acid')), hex2rgb(cs.getPropertyValue('--acid'))),
    }
  })
  say(tok.acid === 'rgb(120, 234, 87)', '品牌绿 --acid = #78EA57（明暗同值）', tok.acid)
  say(tok.onAcidRatio >= 4.5, `酸橙绿实底文字对比度 ≥ 4.5`, `${tok.onAcidRatio}:1`)

  /* 组件存在性与几何 */
  const geo = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const r = (el) => (el ? el.getBoundingClientRect() : null)
    const out = {}
    const btn = q('.btn--primary')
    out.btn = btn
      ? { bg: getComputedStyle(btn).backgroundColor, radius: parseFloat(getComputedStyle(btn).borderTopLeftRadius) }
      : null
    const inp = q('.input')
    out.input = inp
      ? { h: Math.round(r(inp).height), border: parseFloat(getComputedStyle(inp).borderTopWidth) }
      : null
    const seg = q('.segmented')
    const segBox = r(seg)
    const parentBox = seg ? r(seg.parentElement) : null
    out.seg = segBox && parentBox
      ? { w: Math.round(segBox.width), parentW: Math.round(parentBox.width) }
      : null
    // 点一下第三个选项，确保滑块已就位
    const opts = seg ? [...seg.querySelectorAll('.segmented__opt')] : []
    if (opts.length > 2) opts[2].click()
    const thumb = seg ? seg.querySelector('.segmented__thumb') : null
    const active = seg ? seg.querySelector('.segmented__opt[aria-pressed="true"]') : null
    out.thumb = thumb && active
      ? { tw: Math.round(r(thumb).width), aw: Math.round(r(active).width) }
      : null
    const num = q('.pager__btn--num')
    out.pager = num ? { w: Math.round(r(num).width), h: Math.round(r(num).height) } : null
    const ink = q('.tabs__ink')
    out.ink = ink ? { w: Math.round(r(ink).width) } : null
    out.tabs = !!q('.tabs') && !!q('.tabs .tab[aria-selected="true"]')
    out.inkToken = getComputedStyle(q('.btn--primary') || document.body).getPropertyValue('--ink').trim()
    out.btnInk = out.btn ? out.btn.bg : null
    out.inkRgb = tok2rgb(getComputedStyle(document.documentElement).getPropertyValue('--ink'))
    return out
    function tok2rgb(v) {
      const s = v.trim()
      if (!s.startsWith('#')) return s
      const n = s.length === 4 ? s.slice(1).split('').map((c) => c + c).join('') : s.slice(1)
      return `rgb(${parseInt(n.slice(0, 2), 16)}, ${parseInt(n.slice(2, 4), 16)}, ${parseInt(n.slice(4, 6), 16)})`
    }
  })
  say(!!geo.btn, '主按钮存在（.btn--primary）')
  say(geo.btn && geo.btn.bg === geo.inkRgb, '主按钮底色 = --ink 令牌', `${geo.btn && geo.btn.bg} vs ${geo.inkRgb}`)
  say(geo.btn && geo.btn.radius >= 8, '主按钮圆角 ≥ 8px', geo.btn && `${geo.btn.radius}px`)
  say(!!geo.input && geo.input.h >= 40 && geo.input.border >= 1, '输入框高度 ≥ 40 且有 1px 边框', JSON.stringify(geo.input))
  say(!!geo.seg, '分段开关存在（.segmented）')
  say(
    geo.seg && geo.seg.w < geo.seg.parentW - 40,
    '分段开关未被父容器拉满（回归护栏）',
    geo.seg && `${geo.seg.w}px / 容器 ${geo.seg.parentW}px`,
  )
  say(geo.thumb && Math.abs(geo.thumb.tw - geo.thumb.aw) <= 2, '分段滑块宽度 ≈ 选中项', JSON.stringify(geo.thumb))
  say(geo.pager && Math.abs(geo.pager.w - 30) <= 3 && Math.abs(geo.pager.h - 30) <= 3, '分页页码按钮 ≈ 30×30', JSON.stringify(geo.pager))
  say(geo.tabs, '标签栏存在且有选中项（aria-selected）')
  say(geo.ink === null || geo.ink.w > 0, '标签栏指示条已定位', JSON.stringify(geo.ink))

  /* toast 三态（回归护栏） */
  await page.evaluate(() => {
    document.querySelectorAll('.toast').forEach((e) => e.remove())
    showToast('ok', '已保存', '断言用')
    showToast('danger', '保存失败', '断言用')
    showToast('info', '提示', '断言用')
  })
  await page.waitForTimeout(260)
  const toast = await page.evaluate(() => {
    const list = [...document.querySelectorAll('.toast')]
    return {
      count: list.length,
      withIcon: list.filter((t) => t.querySelector('.toast__icon svg')).length,
      colors: [...new Set(list.map((t) => getComputedStyle(t.querySelector('.toast__icon')).color))],
    }
  })
  say(toast.count === 3, '三种 tone 都能触发', `${toast.count}/3`)
  say(toast.withIcon === 3, '每个 toast 都有 .toast__icon 图标（回归护栏）', `${toast.withIcon}/3`)
  say(toast.colors.length === 3, '三种 tone 图标颜色互不相同（回归护栏）', toast.colors.join(' | '))
  await page.evaluate(() => document.querySelectorAll('.toast').forEach((e) => e.remove()))

  /* 浮层承载层 + 玻璃 + 命中测试 */
  await page.click('[data-overlay="g-modal"]')
  await page.waitForTimeout(320)
  const ov = await page.evaluate(() => {
    const layer = document.querySelector('.overlay-layer')
    const modal = document.querySelector('.modal')
    const mr = modal.getBoundingClientRect()
    const hit = document.elementFromPoint(mr.left + mr.width / 2, mr.top + 24)
    return {
      layerZ: layer ? getComputedStyle(layer).zIndex : null,
      modalVisible: getComputedStyle(modal).display !== 'none',
      glass: getComputedStyle(modal).backdropFilter,
      hitInModal: !!(hit && modal.contains(hit)),
      hit: hit ? hit.tagName.toLowerCase() + '.' + String(hit.className).split(' ')[0] : 'none',
    }
  })
  say(ov.layerZ === '100', '浮层承载层 z-index = 100', String(ov.layerZ))
  say(ov.modalVisible, '弹窗已打开（display 非 none）')
  say(/blur\(/.test(ov.glass), '弹窗玻璃 backdrop-filter 生效', ov.glass)
  say(ov.hitInModal, '弹窗区域命中弹窗本身（未被页面元素压住）', ov.hit)
  /* 关闭弹窗：画廊未绑定 Esc，走真实关闭路径（点「取消」→ data-close） */
  await page.click('.modal [data-close="g-modal"]')
  await page.waitForTimeout(360)

  /* 下拉面板层级与命中 */
  await page.click('.fsel__btn')
  await page.waitForTimeout(300)
  const dd = await page.evaluate(() => {
    const panel = [...document.querySelectorAll('.fsel__panel')].find((p) => !p.hidden)
    if (!panel) return { open: false }
    const pr = panel.getBoundingClientRect()
    const hit = document.elementFromPoint(pr.left + pr.width / 2, pr.top + 12)
    return {
      open: true,
      z: getComputedStyle(panel).zIndex,
      inViewport: pr.top >= 0 && pr.bottom <= innerHeight,
      hitInPanel: !!(hit && panel.contains(hit)),
    }
  })
  say(dd.open, '下拉面板可打开')
  say(dd.z === '160', '下拉面板 z-index = 160（盖住弹窗、低于 toast）', String(dd.z))
  say(dd.inViewport, '下拉面板完整落在视口内')
  say(dd.hitInPanel, '下拉面板区域命中面板内部')
  await page.click('.fsel__btn') // 再次点击触发器即收起
  await page.waitForTimeout(260)
}

/* ---------------- 汇总 ---------------- */
console.log('\n【运行时卫生】')
say(badResponses.length === 0, '无 4xx/5xx 响应', badResponses.slice(0, 3).join(' | '))
say(consoleErrors.length === 0, '控制台零错误', consoleErrors.slice(0, 2).join(' | '))

console.log(`\n────────────────────────────────────────`)
console.log(`通过 ${pass} · 失败 ${fail}`)
if (fail) {
  console.log('失败项：')
  failures.forEach((f) => console.log('  · ' + f))
}
await browser.close()
process.exit(fail ? 1 : 0)
