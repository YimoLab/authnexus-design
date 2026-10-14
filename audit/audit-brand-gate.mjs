/* ==========================================================================
   鉴枢 AuthNexus · 品牌色与演示门禁验证
     ① 账号菜单的「重置本地演示数据」必须跟着服务端开关走：生产模式
        （AUTHNEXUS_DEMO_AUTH=0）没有这个端点，点了只会被拒绝，所以要隐藏；
     ② 品牌绿是全局令牌，改它必须像素级复核实底上的文字对比度（明暗两套）——
        实底颜色 DOM 审计算得到，但文字实际压在什么底色上要靠截图采样。
   前置：server + app dev 已启动（http 模式）。运行需 playwright-core + pngjs。
   ========================================================================== */
import { chromium } from 'playwright-core'
import { PNG } from 'pngjs'
/* 配置：audit.config.json + 环境变量（见 audit/README.md） */
import { loadConfig } from './lib.mjs'

const { chromePath: CHROME, baseUrl: BASE, outDir: OUT } = loadConfig()

const results = []
const check = (ok, msg) => { results.push((ok ? 'PASS  ' : 'FAIL  ') + msg); if (!ok) process.exitCode = 1 }
const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
const ratio = (a, b) => { const l1 = lum(...a), l2 = lum(...b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
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

async function login(page) {
  await page.goto(BASE + '/', { waitUntil: 'networkidle' })
  await page.click('.demo-account >> nth=0')
  await page.waitForSelector('.grid-main-side')
}
const resetItemVisible = async (page) => {
  await page.click('.accountbtn')
  await page.waitForSelector('.menu__panel')
  const n = await page.locator('.menu__item:has-text("重置本地演示数据")').count()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  return n
}

/* ① 演示开关：真实环境（开）→ 可见；伪造成生产（关）→ 隐藏 */
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await login(p)
  check((await resetItemVisible(p)) === 1, '演示模式：账号菜单里有「重置本地演示数据」')

  await p.route('**/api/meta', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, demoAuth: false, driver: 'sqlite', env: 'production', ttl: {} }) }),
  )
  await p.goto(BASE + '/#/account', { waitUntil: 'networkidle' })
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForSelector('.grid-main-side')
  check((await resetItemVisible(p)) === 0, '生产模式（demoAuth=0）：该菜单项已隐藏（点了必然被服务端拒绝）')
  await ctx.close()
}

/* ② 新品牌绿：酸橙绿实底上的文字对比度（明暗两套） */
for (const theme of ['light', 'dark']) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
  const p = await ctx.newPage()
  await login(p)
  await p.goto(BASE + '/#/account', { waitUntil: 'networkidle' })
  await p.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme)
  await p.goto(BASE + '/#/dev', { waitUntil: 'networkidle' })
  await p.waitForSelector('.sidenav__item[aria-current="page"]', { timeout: 8000 })

  const tokens = await p.evaluate(() => {
    const cs = getComputedStyle(document.documentElement)
    const nav = document.querySelector('.sidenav__item[aria-current="page"]')
    return { acid: cs.getPropertyValue('--acid').trim(), onAcid: cs.getPropertyValue('--on-acid').trim(), navBg: getComputedStyle(nav).backgroundColor }
  })
  const buf = await p.screenshot({ path: OUT + `/brand-${theme}.png` })
  const png = PNG.sync.read(buf)
  const box = await p.locator('.sidenav__item[aria-current="page"]').boundingBox()
  const bg = sampleAt(png, box.x + 12, box.y + box.height / 2)
  const onAcid = tokens.onAcid.startsWith('#')
    ? [1, 3, 5].map((i) => parseInt(tokens.onAcid.substr(i, 2), 16))
    : null
  const cr = onAcid ? ratio(bg, onAcid) : -1
  check(tokens.acid.toUpperCase() === '#78EA57', theme + '：--acid = ' + tokens.acid)
  check(cr >= 4.5, theme + '：选中项实底文字对比度 ' + cr.toFixed(2) + ':1（底色 rgb(' + bg + ')，文字 ' + tokens.onAcid + '）')
  await ctx.close()
}

console.log(results.join('\n'))
await b.close()
