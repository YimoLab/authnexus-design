/* 暗色/浅色模式对比度审计
   遍历关键页面上的可见文字，计算与「有效背景」的对比度，输出不达标的元素。
   用法：node audit-contrast.mjs dark|light */
import { chromium } from 'playwright-core'

/* 配置：audit.config.json + 环境变量（见 audit/README.md） */
import { loadConfig } from './lib.mjs'

const cfg = loadConfig()
const CHROME = cfg.chromePath
const BASE = cfg.baseUrl
const THEME = process.argv[2] === 'light' ? 'light' : 'dark'

/* 页面清单：audit.config.json → profiles.authnexus.contrastRoutes */
const ROUTES = cfg.profiles.authnexus.contrastRoutes

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
await page.evaluate((t) => localStorage.setItem('authnexus.theme', t), THEME)
await page.reload({ waitUntil: 'networkidle' })
await page.click('.demo-account >> nth=0')
await page.waitForSelector('.grid-main-side')

const allIssues = []

for (const [label, path] of ROUTES) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500) /* 等路由进出场动画结束再采样（避免透明度影响对比度计算） */

  const issues = await page.evaluate(() => {
    const parse = (str) => {
      const m = String(str).match(/rgba?\(([^)]+)\)/)
      if (!m) return null
      const p = m[1].split(',').map((s) => parseFloat(s))
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }
    }
    const lum = ({ r, g, b }) => {
      const f = (c) => {
        c = c / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a, b) => {
      const l1 = lum(a)
      const l2 = lum(b)
      const hi = Math.max(l1, l2)
      const lo = Math.min(l1, l2)
      return (hi + 0.05) / (lo + 0.05)
    }
    const blend = (fg, bg) => ({
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
      a: 1,
    })
    const effectiveBg = (el) => {
      /* 分段开关的选中实底来自兄弟节点滑块（.segmented__thumb），不在祖先链上——
         显式取滑块背景，按真实观感计算文字对比度 */
      const seg = el.closest && el.closest('.segmented')
      if (seg && el.getAttribute('aria-pressed') === 'true') {
        const thumb = seg.querySelector('.segmented__thumb')
        if (thumb) {
          const tcs = getComputedStyle(thumb)
          const tbg = parse(tcs.backgroundColor)
          if (tbg && tbg.a > 0.01 && parseFloat(tcs.opacity) > 0.5) return tbg
        }
      }
      let node = el
      let acc = null
      while (node && node !== document.documentElement) {
        const cs = getComputedStyle(node)
        const bg = parse(cs.backgroundColor)
        if (bg && bg.a > 0.01) {
          acc = acc ? blend(acc, bg) : bg
          if (acc.a >= 0.99) return acc
        }
        // 玻璃导航：叠加模糊/亮度后实际更深，这里按半透明处理已足够识别严重问题
        node = node.parentElement
      }
      const bodyBg = parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 }
      return acc ? blend(acc, bodyBg) : bodyBg
    }

    const out = []
    const seen = new Set()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const text = (n.textContent || '').trim()
      if (!text) continue
      const el = n.parentElement
      if (!el) continue
      const tag = el.tagName.toLowerCase()
      if (tag === 'script' || tag === 'style' || tag === 'noscript') continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const op = parseFloat(cs.opacity)
      if (!Number.isNaN(op) && op < 0.55) continue
      const rect = el.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const fg = parse(cs.color)
      if (!fg || fg.a < 0.5) continue
      const bg = effectiveBg(el)
      const fontSize = parseFloat(cs.fontSize)
      const weight = parseInt(cs.fontWeight, 10) || 400
      const large = fontSize >= 24 || (fontSize >= 18.66 && weight >= 700)
      const need = large ? 3 : 4.5
      const r = ratio(fg, bg)
      if (r < need) {
        const cls = el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''
        const sig = tag + cls + '|' + cs.color + '|' + Math.round(fontSize)
        if (seen.has(sig)) continue
        seen.add(sig)
        out.push({
          sel: tag + cls,
          text: text.slice(0, 24),
          color: cs.color,
          bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
          ratio: Math.round(r * 100) / 100,
          need,
          fontSize,
        })
      }
    }
    return out
  })

  if (issues.length) {
    allIssues.push({ label, path, issues })
  }
}

console.log('主题：' + THEME + ' | 抽查 ' + ROUTES.length + ' 个页面\n')
if (!allIssues.length) {
  console.log('✅ 未发现对比度不达标的文字')
} else {
  for (const group of allIssues) {
    console.log('— ' + group.label + '（' + group.path + '）')
    for (const i of group.issues) {
      console.log(
        '   ' + String(i.ratio).padEnd(6) + '(需 ' + i.need + ')  ' + i.sel + '  「' + i.text + '」  ' +
          i.color + ' on ' + i.bg + '  ' + i.fontSize + 'px',
      )
    }
  }
  const total = allIssues.reduce((s, g) => s + g.issues.length, 0)
  console.log('\n合计 ' + total + ' 处（去重后按元素类型计）')
}

await page.evaluate(() => localStorage.setItem('authnexus.theme', 'light'))
await browser.close()
