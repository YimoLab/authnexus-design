/* ==========================================================================
   鉴枢 AuthNexus · 授权确认页专项验证（卡片玻璃材质 + 权限中文名）
   这两点都「肉眼看不出问题、但用户能感觉到别扭」，所以固化成可重复的检查：
     ① 卡片确实用了液态玻璃（backdrop-filter / 玻璃圆角 / 高光渐变，明暗两套）；
     ② 权限显示的是中文名，scope 键只作次要信息（title 或小号等宽字）；
     ③ 像素级对比度：玻璃是半透明的，DOM 审计看不见 backdrop——必须对截图
        采样算 WCAG 对比度，否则「换了主题才发现看不清」就晚了。
   前置：server + app dev 已启动，且 app 为 http 模式（演示数据里 Figma 已上线）。
   运行：需要 playwright-core + pngjs（与 smoke-security 同一组依赖）。
   ========================================================================== */
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'
/* 配置：audit.config.json + 环境变量（见 audit/README.md） */
import { loadConfig } from './lib.mjs'

const { chromePath: CHROME, baseUrl: BASE, outDir: OUT } = loadConfig()

const CLIENT = 'anx_3a5e91b7c204'
const REDIRECT = 'https://www.figma.com/oauth/callback'
const AUTH_URL =
  BASE + '/#/oauth/authorize?client_id=' + CLIENT +
  '&redirect_uri=' + encodeURIComponent(REDIRECT) +
  '&response_type=code&scope=' + encodeURIComponent('profile:read email:read avatar:read') +
  '&state=verify&flow=playground'

const results = []
const check = (ok, msg) => { results.push((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) process.exitCode = 1 }

/* WCAG 相对亮度与对比度 */
function lum(r, g, b) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function ratio(a, b) {
  const l1 = lum(...a), l2 = lum(...b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
/* 取样点周围 3x3 的中位色，避开文字与描边；坐标越界时钳到图内 */
function sampleAt(png, x, y) {
  x = Math.max(1, Math.min(png.width - 2, Math.round(x)))
  y = Math.max(1, Math.min(png.height - 2, Math.round(y)))
  const px = []
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const i = ((y + dy) * png.width + (x + dx)) * 4
    px.push([png.data[i], png.data[i + 1], png.data[i + 2]])
  }
  px.sort((p, q) => (p[0] + p[1] + p[2]) - (q[0] + q[1] + q[2]))
  return px[4]
}

const b = await chromium.launch({ executablePath: CHROME, headless: true })

/* ① 未登录态：用户截图那一屏 —— 权限芯片应显示中文名 */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(AUTH_URL, { waitUntil: 'networkidle' })
  await p.waitForSelector('.consent-card', { timeout: 8000 })
  const chips = await p.$$eval('.consent-card .tag--scope', (els) =>
    els.map((e) => ({ name: e.textContent.trim(), title: e.title })),
  )
  check(chips.length === 3, '未登录态：权限芯片 ' + chips.length + ' 个')
  check(chips.every((c) => /读取/.test(c.name)), '未登录态：芯片显示中文名（' + chips.map((c) => c.name).join(' / ') + '）')
  check(chips.every((c) => /（[a-z]+:[a-z]+）/.test(c.title)), '未登录态：键保留在 title 里可核对')
  await p.screenshot({ path: OUT + '/consent-01-light.png' })
  await ctx.close()
}

/* ② 登录态：主确认区 + 玻璃材质 + 像素对比度 */
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await p.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p.click('.demo-account >> nth=0')
  await p.waitForSelector('.grid-main-side')
  await p.goto(BASE + '/#/account', { waitUntil: 'networkidle' })
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await p.goto(AUTH_URL, { waitUntil: 'networkidle' })
  await p.waitForSelector('.consent-card', { timeout: 8000 })
  await p.waitForTimeout(500)

  /* 玻璃材质：backdrop-filter + 玻璃圆角 */
  const mat = await p.evaluate(() => {
    const c = document.querySelector('.consent-card')
    const cs = getComputedStyle(c)
    return { bf: cs.backdropFilter, bg: cs.backgroundColor, radius: cs.borderRadius, img: cs.backgroundImage }
  })
  check(/blur\(32px\)/.test(mat.bf), theme + '：卡片使用液态玻璃（' + mat.bf + '）')
  check(mat.radius === '20px', theme + '：圆角用玻璃令牌 20px（' + mat.radius + '）')
  check(mat.img.includes('gradient'), theme + '：叠加了玻璃高光渐变')

  /* 权限行：中文名 + 键 */
  const perms = await p.$$eval('.perm', (els) =>
    els.map((e) => ({
      name: (e.querySelector('.perm__name') || {}).textContent?.trim() || '',
      key: (e.querySelector('.perm__key') || {}).textContent?.trim() || '',
    })),
  )
  check(perms.length === 3 && perms.every((x) => /读取/.test(x.name)), theme + '：确认区权限显示中文名')
  check(perms.every((x) => /^[a-z]+:[a-z]+$/.test(x.key)), theme + '：键以次要信息保留（' + perms.map((x) => x.key).join(' ') + '）')

  await p.screenshot({ path: OUT + `/consent-0${theme === 'light' ? 2 : 3}-${theme}.png` })

  /* 像素级：卡片内底色 ≠ 页面底色（证明真的透光），且文字对比度达标 */
  const box = await p.locator('.consent-card').boundingBox()
  const buf = await p.screenshot()
  const png = PNG.sync.read(buf)
  /* 取卡片左上内边距处（空白、无文字），以及卡片右侧同高的页面底色 */
  const inside = sampleAt(png, box.x + 24, box.y + 24)
  const outside = sampleAt(png, box.x + box.width + 120, box.y + 24)
  const ink = theme === 'dark' ? [245, 245, 245] : [38, 38, 38]
  const cr = ratio(ink, inside)
  check(cr >= 4.5, theme + '：卡片内文字对比度 ' + cr.toFixed(2) + ':1（采样底色 rgb(' + inside + '））')
  const pageBg = await p.evaluate(() => getComputedStyle(document.body).backgroundColor)
  check(JSON.stringify(inside) !== JSON.stringify(outside), theme + '：卡片与页面底色不同（卡内 rgb(' + inside + '）vs 卡外 rgb(' + outside + ')，页面 ' + pageBg + '）')
  await ctx.close()
}

console.log(results.join('\n'))
await b.close()
