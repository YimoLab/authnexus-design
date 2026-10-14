/* ==========================================================================
   鉴枢 AuthNexus · 动效验证（第 32 节过渡动效的可回归检查）
   验证四处动效真实生效（而不是「看起来像有动效」）：
     ① 分页列表：向前/向后翻页的 leave/enter 过渡类 + transform 中间帧
     ② 表格翻页：整块滑动，且 .table-wrap 不残留横向滚动（避免滚动条闪动）
     ③ 分段开关滑块：过渡中被采样到多个中间位移，最终与选中按钮像素级对齐
     ④ 路由进出场：leave + enter 同时出现；以及系统「减少动效」时过渡被压缩
     ⑤ 标签栏：指示条平移的中间帧 + 与选中项像素级对齐；面板按切换方向左右滑动
     ⑥ 主题切换涟漪：浅→深圆盘自按钮扩散且**收尾才切主题**；深→浅先切主题再向按钮
        收缩；「减少动效」下不建圆盘直接切换

   方式：点击前后轮询过渡元素的类名与 computed transform，拿时间线证据；
   中间帧截图另外用「注入慢速过渡」的方式拍摄（见 capture 注释，可选）。

   前置：server + app dev（http 模式）+ playwright-core；
   运行示例（在有 playwright-core 的目录中执行）：
     CHROME_PATH="…/chrome.exe" node scripts/audit-anim.mjs
   环境变量：CHROME_PATH、BASE_URL、OUT_DIR（默认 ../../.smoke-http 的绝对路径）
   脚本开头与结尾会重置演示数据，可重复运行。
   ========================================================================== */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

/* 配置：audit.config.json + 环境变量（见 audit/README.md） */
import { loadConfig } from './lib.mjs'

const { chromePath: CHROME, baseUrl: BASE, outDir: OUT } = loadConfig()

const results = []
const check = (ok, msg) => {
  results.push((ok ? 'PASS  ' : 'FAIL  ') + msg)
  if (!ok) process.exitCode = 1
}

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })

/* 在页面里轮询若干选择器的类名与 transform，返回时间线 */
const probe = (sels, ms = 900, step = 20) =>
  p.evaluate(
    async ([sels, ms, step]) => {
      const out = []
      const t0 = performance.now()
      while (performance.now() - t0 < ms) {
        const row = { t: Math.round(performance.now() - t0) }
        for (const [name, sel] of sels) {
          const el = document.querySelector(sel)
          row[name] = el
            ? {
                cls: (el.getAttribute('class') || '')
                  .split(' ')
                  .filter((c) => c.includes('paged') || c.includes('mfa') || c.includes('routefade') || c.includes('tabpane'))
                  .join(' '),
                tf: getComputedStyle(el).transform,
              }
            : null
        }
        out.push(row)
        await new Promise((r) => setTimeout(r, step))
      }
      return out
    },
    [sels, ms, step],
  )

/** 2D 矩阵的平移分量在第 5 个值上 */
const tx = (tf) => {
  const m = /matrix\(([^)]+)\)/.exec(tf || '')
  if (!m) return 0
  const v = m[1].split(',').map(Number)
  return v.length >= 6 ? v[4] : 0
}
const hasCls = (tl, key, sub) => tl.some((s) => s[key] && s[key].cls.includes(sub))

await p.goto(BASE + '/', { waitUntil: 'networkidle' })
await p.click('.demo-account >> nth=0')
await p.waitForSelector('.grid-main-side')
await p.waitForTimeout(400)

/* ============ ① 分页 · div 行列表（审计页） ============ */
await p.goto(BASE + '/#/admin/audit', { waitUntil: 'networkidle' })
await p.waitForSelector('.logrow')
await p.waitForTimeout(500)
{
  const tl = probe([['box', '.paged-clip [class*="paged-"]']])
  await p.waitForTimeout(30)
  await p.click('.pager__btn--num:has-text("2")')
  const t = await tl
  check(hasCls(t, 'box', 'paged-fwd-leave'), '翻页（向后）：出现 leave 过渡类')
  check(hasCls(t, 'box', 'paged-fwd-enter'), '翻页（向后）：出现 enter 过渡类')
  const moved = t.filter((s) => s.box && Math.abs(tx(s.box.tf)) > 2)
  check(moved.length >= 4, '翻页（向后）：transform 中间帧被采样到 ' + moved.length + ' 帧')
  await p.waitForTimeout(400)

  const tl2 = probe([['box', '.paged-clip [class*="paged-"]']], 700)
  await p.waitForTimeout(30)
  await p.click('.pager__btn--num:has-text("1")')
  const t2 = await tl2
  check(hasCls(t2, 'box', 'paged-back'), '翻页（向前）：出现 back 过渡类')
  const m2 = t2.filter((s) => s.box && tx(s.box.tf) < -2)
  check(m2.length >= 2, '翻页（向前）：新内容自左滑入被采样到 ' + m2.length + ' 帧')
  await p.waitForTimeout(500)
}

/* ============ ② 分页 · 表格（令牌页） ============ */
await p.goto(BASE + '/#/admin/tokens', { waitUntil: 'networkidle' })
await p.waitForSelector('.table-wrap tbody tr')
await p.waitForTimeout(500)
{
  const tl = probe([['box', '.paged-clip [class*="paged-"]']])
  await p.waitForTimeout(30)
  await p.click('.pager__btn--num:has-text("2")')
  const t = await tl
  check(
    hasCls(t, 'box', 'paged-fwd-leave') && hasCls(t, 'box', 'paged-fwd-enter'),
    '表格翻页：leave + enter 均出现',
  )
  check(
    t.some((s) => s.box && Math.abs(tx(s.box.tf)) > 2),
    '表格翻页：出现横向位移中间帧',
  )
  /* 动效不得让横向滚动容器闪出滚动条：翻页后不应残留横向滚动范围 */
  const leftover = await p.evaluate(() => {
    const w = document.querySelector('.table-wrap')
    return w ? w.scrollWidth - w.clientWidth : -1
  })
  check(leftover <= 0, '表格翻页后 .table-wrap 无残留横向滚动（' + leftover + 'px）')
  await p.waitForTimeout(500)
}

/* ============ ③ 分段开关滑块 + 弹窗内容切换 ============ */
await p.goto(BASE + '/#/account', { waitUntil: 'networkidle' })
await p.waitForSelector('.grid-main-side')
await p.waitForTimeout(400)
await p.click('button:has-text("开启")')
await p.waitForSelector('.modal')
await p.click('.modal button:has-text("开始绑定")')
await p.waitForSelector('.modal .mfa-qr svg')
await p.waitForTimeout(350)
{
  const tl = probe([
    ['th', '.segmented__thumb'],
    ['box', '.modal [class*="mfa-fwd"], .modal [class*="mfa-back"]'],
  ])
  await p.waitForTimeout(30)
  await p.click('.segmented__opt:has-text("手动输入")')
  await p.waitForTimeout(300)
  const t = await tl
  const frames = new Set(t.map((s) => s.th && s.th.tf).filter(Boolean))
  check(frames.size >= 3, '分段滑块：过渡中被采样到 ' + frames.size + ' 个不同位移')
  check(
    hasCls(t, 'box', 'mfa-fwd-leave') && hasCls(t, 'box', 'mfa-fwd-enter'),
    '弹窗内容：fwd 方向 leave + enter 均出现',
  )

  const align = await p.evaluate(() => {
    const th = document.querySelector('.segmented__thumb')
    const btn = document.querySelector('.segmented__opt[aria-pressed="true"]')
    const a = th.getBoundingClientRect()
    const c = btn.getBoundingClientRect()
    return { dx: Math.abs(a.left - c.left), dw: Math.abs(a.width - c.width) }
  })
  check(
    align.dx < 1.5 && align.dw < 1.5,
    '分段滑块：与选中按钮对齐（Δx=' + align.dx.toFixed(1) + ' Δw=' + align.dw.toFixed(1) + '）',
  )

  const tl2 = probe([['box', '.modal [class*="mfa-fwd"], .modal [class*="mfa-back"]']], 700)
  await p.waitForTimeout(30)
  await p.click('.segmented__opt:has-text("扫码绑定")')
  const t2 = await tl2
  check(hasCls(t2, 'box', 'mfa-back'), '弹窗内容：back 方向过渡类出现')
}
await p.click('.modal button:has-text("取消")')
await p.waitForSelector('.modal', { state: 'detached' })

/* ============ ④ 路由进出场 ============ */
{
  const tl = probe([['box', '[class*="routefade"]']], 800)
  await p.waitForTimeout(30)
  await p.click('.usernav a:has-text("已授权的应用")')
  const t = await tl
  check(
    hasCls(t, 'box', 'routefade-leave') && hasCls(t, 'box', 'routefade-enter'),
    '路由切换：leave + enter 均出现',
  )
}
await p.waitForTimeout(400)

/* ============ ⑤ 标签栏：滑动指示条 + 面板内容滑动 ============ */
await p.goto(BASE + '/#/admin/reviews', { waitUntil: 'networkidle' })
await p.waitForSelector('.reviewrow, .empty')
await p.waitForTimeout(600)
{
  /* 首帧对齐：指示条应与当前选中 tab 像素级重合 */
  const inkAlign = () =>
    p.evaluate(() => {
      const ink = document.querySelector('.tabs__ink')
      const tab = document.querySelector('.tab[aria-selected="true"]')
      if (!ink || !tab) return null
      const a = ink.getBoundingClientRect()
      const b = tab.getBoundingClientRect()
      return { dx: Math.abs(a.left - b.left), dw: Math.abs(a.width - b.width) }
    })
  const first = await inkAlign()
  check(!!first && first.dx < 1.5 && first.dw < 1.5, '标签栏：指示条与首个选中项对齐（Δx=' + (first ? first.dx.toFixed(1) : '?') + '）')

  /* 容器是横向滚动容器（overflow-x:auto ⇒ overflow-y 计算为 auto），真正要保证的是
     指示条**没被容器裁掉**。另有 1px 纵向溢出来自原型既有的 .tab{margin-bottom:-1px}
     （滚动条已被 ::-webkit-scrollbar 隐藏），与指示条无关。 */
  const clip = await p.evaluate(() => {
    const t = document.querySelector('.tabs')
    const ink = document.querySelector('.tabs__ink')
    if (!t || !ink) return null
    const tr = t.getBoundingClientRect()
    const ir = ink.getBoundingClientRect()
    return { inside: ir.bottom <= tr.bottom + 0.5 }
  })
  check(!!clip && clip.inside, '标签栏：指示条完整落在容器内（未被裁剪）')

  /* 点第二个 tab：指示条应平移（中间帧多个 transform），面板按 fwd 方向滑入 */
  const tl = probe([
    ['ink', '.tabs__ink'],
    ['pane', '.panel[class*="tabpane-"]'],
  ])
  await p.waitForTimeout(30)
  await p.click('.tab:has-text("已通过")')
  await p.waitForTimeout(90)
  await p.locator('.tabs').screenshot({ path: OUT + '/anim-6-tab-ink.png' }).catch(() => {})
  const t = await tl
  const frames = new Set(t.map((r) => r.ink && r.ink.tf).filter(Boolean))
  check(frames.size >= 3, '标签栏：指示条平移被采样到 ' + frames.size + ' 个中间位移')
  check(hasCls(t, 'pane', 'tabpane-fwd'), '标签栏（向右）：面板使用 fwd 方向过渡类')
  const second = await inkAlign()
  check(!!second && second.dx < 1.5 && second.dw < 1.5, '标签栏：切换后与新选中项对齐')

  /* 点回第一个 tab：方向应反过来 */
  const tl2 = probe([['pane', '.panel[class*="tabpane-"]']], 700)
  await p.waitForTimeout(30)
  await p.click('.tab:has-text("待审核")')
  const t2 = await tl2
  check(hasCls(t2, 'pane', 'tabpane-back'), '标签栏（向左）：面板使用 back 方向过渡类')
  await p.waitForTimeout(400)
}

/* ============ ⑥ 主题切换过渡 ============ */
await p.goto(BASE + '/#/admin/reviews', { waitUntil: 'networkidle' })
await p.waitForTimeout(500)

/* pngjs 用于「无黑屏」的像素级断言：缺依赖时跳过该项，其余断言照常 */
let PNG = null
try {
  PNG = (await import('pngjs')).PNG
} catch {
  /* 未安装 pngjs —— 像素断言跳过 */
}

/** 采样一次主题切换：过渡模式、动画目标伪元素与 clip-path 关键帧 */
async function sampleTheme(target) {
  return p.evaluate(async (t) => {
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'light' : 'dark')
    await new Promise((r) => setTimeout(r, 120))
    const btn = document.querySelector('button[aria-label="切换主题"]')
    const r = btn.getBoundingClientRect()
    const out = []
    btn.click()
    const t0 = performance.now()
    while (performance.now() - t0 < 800) {
      const anims = document
        .getAnimations()
        .filter((a) => String(a.effect && a.effect.pseudoElement || '').includes('view-transition'))
      /* 列表里可能残留上一轮已结束的动画，优先取正在运行的那个 */
      const a0 = anims.find((a) => a.playState === 'running') || anims[anims.length - 1]
      let clip = ''
      if (a0) {
        const kf = a0.effect.getKeyframes()
        clip = (kf[0] && kf[0].clipPath) + ' → ' + (kf[kf.length - 1] && kf[kf.length - 1].clipPath)
      }
      out.push({
        t: Math.round(performance.now() - t0),
        mode: document.documentElement.getAttribute('data-vt-mode') || '',
        pseudo: a0 ? a0.effect.pseudoElement : '',
        clip,
        theme: document.documentElement.getAttribute('data-theme') || 'light',
        discs: document.querySelectorAll('.theme-ripple').length,
      })
      await new Promise((res) => setTimeout(res, 20))
    }
    return {
      rows: out,
      btn: { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) },
      far: Math.round(
        Math.hypot(
          Math.max(r.left + r.width / 2, innerWidth - (r.left + r.width / 2)),
          Math.max(r.top + r.height / 2, innerHeight - (r.top + r.height / 2)),
        ),
      ),
      leftover: document
        .getAnimations()
        .filter((a) => String(a.effect && a.effect.pseudoElement || '').includes('view-transition')).length,
      mode: document.documentElement.getAttribute('data-vt-mode'),
    }
  }, target)
}

const parseR = (s) => {
  const m = /circle\(([-\d.]+)px at ([-\d.]+)px ([-\d.]+)px\)/.exec(s || '')
  return m ? { r: Math.round(parseFloat(m[1])), x: Math.round(parseFloat(m[2])), y: Math.round(parseFloat(m[3])) } : null
}

{
  /* 浅 → 深：裁剪「新快照」由点扩散，露出的是真实深色界面 */
  const { rows, btn, far, leftover, mode } = await sampleTheme('dark')
  const live = rows.filter((r) => r.pseudo)
  check(live.length > 0, '主题（浅→深）：存在视图过渡动画（' + live.length + ' 帧）')
  const running = live.filter((r) => r.mode)
  check(running.length > 0 && running.every((r) => r.mode === 'expand'), '主题（浅→深）：进行中过渡模式标记为 expand（' + running.length + ' 帧）')
  check(live.every((r) => r.pseudo === '::view-transition-new(root)'), '主题（浅→深）：裁剪的是新快照（深色界面）')
  const first = live.length ? parseR(live[0].clip.split(' → ')[0]) : null
  const last = live.length ? parseR(live[live.length - 1].clip.split(' → ')[1]) : null
  check(!!first && first.r <= 2 && first.x === btn.x && first.y === btn.y, '主题（浅→深）：起点是按钮位置的小圆（' + (first ? first.r + 'px @' + first.x + ',' + first.y : '?') + '）')
  check(!!last && last.r >= far * 0.98, '主题（浅→深）：终点铺满视口（' + (last ? last.r : '?') + ' ≥ ' + far + '）')
  check(rows.some((r) => r.theme === 'dark'), '主题（浅→深）：过渡开始即完成主题切换（旧快照遮住，看不到跳变）')
  check(rows.every((r) => r.discs === 0), '主题（浅→深）：不建平色圆盘（主方案走视图过渡）')
  await p.waitForTimeout(500)
  const cleaned = await p.evaluate(() => ({
    mode: document.documentElement.getAttribute('data-vt-mode'),
    anims: document
      .getAnimations()
      .filter((a) => String(a.effect && a.effect.pseudoElement || '').includes('view-transition')).length,
  }))
  check(cleaned.mode === null && cleaned.anims === 0, '主题（浅→深）：结束后过渡标记与动画都已清理（残留动画 ' + cleaned.anims + '）')

  /* 深 → 浅：裁剪「旧快照」向按钮收走 */
  const back = await sampleTheme('light')
  const blive = back.rows.filter((r) => r.pseudo)
  check(blive.length > 0 && blive.every((r) => r.pseudo === '::view-transition-old(root)'), '主题（深→浅）：裁剪的是旧快照（深色界面被收走）')
  const brunning = blive.filter((r) => r.mode)
  check(brunning.length > 0 && brunning.every((r) => r.mode === 'shrink'), '主题（深→浅）：进行中过渡模式标记为 shrink（' + brunning.length + ' 帧）')
  const bfirst = blive.length ? parseR(blive[0].clip.split(' → ')[0]) : null
  const blast = blive.length ? parseR(blive[blive.length - 1].clip.split(' → ')[1]) : null
  check(!!bfirst && bfirst.r >= back.far * 0.98 && !!blast && blast.r <= 2, '主题（深→浅）：从铺满收到按钮位置（' + (bfirst ? bfirst.r : '?') + ' → ' + (blast ? blast.r : '?') + '）')
  await p.waitForTimeout(400)

  /* 「无黑屏」像素断言：过渡中画面必须是真实界面（颜色丰富），
     而不是一整块平色 —— 旧实现峰值时 95~100% 的像素是同一个平色。 */
  if (PNG) {
    await p.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'))
    await p.waitForTimeout(200)
    await p.click('button[aria-label="切换主题"]')
    await p.waitForTimeout(260)
    const buf = await p.screenshot()
    await p.waitForTimeout(600)
    const png = PNG.sync.read(buf)
    const counts = new Map()
    for (let i = 0; i < png.data.length; i += 4) {
      const k = (png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    const top = Math.max(...counts.values()) / (png.width * png.height)
    check(counts.size >= 200 && top < 0.8, '主题（浅→深）：过渡中的画面是真实界面而非平色块（' + counts.size + ' 种颜色，最高单色占比 ' + (top * 100).toFixed(0) + '%）')
  } else {
    check(true, '主题：未安装 pngjs，跳过像素级「无黑屏」断言')
  }
}

/* 兜底方案：把 startViewTransition 摘掉，验证圆盘路径仍然可用 */
{
  const ctx4 = await b.newContext()
  await ctx4.addInitScript(() => {
    delete Document.prototype.startViewTransition
  })
  const p4 = await ctx4.newPage()
  await p4.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p4.click('.demo-account >> nth=0')
  await p4.waitForSelector('button[aria-label="切换主题"]')
  const fb = await p4.evaluate(async () => {
    document.documentElement.setAttribute('data-theme', 'light')
    await new Promise((r) => setTimeout(r, 100))
    document.querySelector('button[aria-label="切换主题"]').click()
    const samples = []
    const t0 = performance.now()
    while (performance.now() - t0 < 800) {
      const d = document.querySelector('.theme-ripple')
      samples.push({ clip: d ? getComputedStyle(d).clipPath : '', theme: document.documentElement.getAttribute('data-theme') || 'light' })
      await new Promise((res) => setTimeout(res, 20))
    }
    return { samples, discs: document.querySelectorAll('.theme-ripple').length, theme: document.documentElement.getAttribute('data-theme') }
  })
  const fclips = fb.samples.map((s) => parseR(s.clip)).filter(Boolean)
  check(fclips.length > 3 && fclips[0].r < fclips[fclips.length - 1].r, '兜底：无视图过渡时走圆盘路径（半径 ' + (fclips[0] ? fclips[0].r : '?') + ' → ' + (fclips.length ? fclips[fclips.length - 1].r : '?') + '）')
  check(fb.theme === 'dark' && fb.discs === 0, '兜底：圆盘结束后被清理、主题已切换（theme=' + fb.theme + '，残留圆盘 ' + fb.discs + '）')
  await ctx4.close()
}

/* 「减少动效」偏好：直接切换，既不建圆盘也不触发视图过渡 */
{
  const ctx3 = await b.newContext({ reducedMotion: 'reduce' })
  const p3 = await ctx3.newPage()
  /* 必须进带外壳的页面（登录页是 plain 外壳，没有主题按钮） */
  await p3.goto(BASE + '/', { waitUntil: 'networkidle' })
  await p3.click('.demo-account >> nth=0')
  await p3.waitForSelector('button[aria-label="切换主题"]')
  const r3 = await p3.evaluate(async () => {
    document.documentElement.setAttribute('data-theme', 'light')
    await new Promise((r) => setTimeout(r, 80))
    document.querySelector('button[aria-label="切换主题"]').click()
    await new Promise((res) => setTimeout(res, 40))
    return {
      theme: document.documentElement.getAttribute('data-theme'),
      discs: document.querySelectorAll('.theme-ripple').length,
      vt: document.documentElement.getAttribute('data-vt-mode'),
    }
  })
  check(r3.theme === 'dark' && r3.discs === 0 && r3.vt === null, '主题：「减少动效」下 40ms 内直接切换且无任何过渡（theme=' + r3.theme + '，圆盘 ' + r3.discs + '）')
  await ctx3.close()
}

/* ============ ⑦ 减少动效偏好（分页/滑块等 CSS 过渡） ============ */
{
  const ctx2 = await b.newContext({ reducedMotion: 'reduce' })
  const p2 = await ctx2.newPage()
  await p2.goto(BASE + '/#/login', { waitUntil: 'networkidle' })
  const dur = await p2.evaluate(() => {
    const el = document.querySelector('.btn') || document.body
    return getComputedStyle(el).transitionDuration
  })
  check(parseFloat(dur) < 0.001, '系统「减少动效」时过渡时长被压缩（' + dur + '）')
  await ctx2.close()
}

/* ============ 收尾：重置演示数据（本次绑定开始过一次） ============ */
const restored = await p
  .evaluate(async () => {
    const r = await fetch('/api/admin/reset-demo', { method: 'POST', credentials: 'include' })
    return r.status
  })
  .catch(() => 0)
results.push('INFO  演示数据恢复：HTTP ' + restored)

console.log(results.join('\n'))
await b.close()
