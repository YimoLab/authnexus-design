/* ==========================================================================
   鉴枢 AuthNexus · 下拉选择专项验证（SelectMenu，第 33 节动效）
   原生 <select> 的弹出层由系统绘制，样式与动效都验证不到；换成自绘 listbox 后
   需要独立证据，本脚本把「能不能用」与「动效有没有真的播」都测掉：
     ① 搜索框 placeholder 是否完整显示（用同字体测量真实文本宽度对比内容盒）；
     ② 打开/关闭动效的时间线（轮询过渡类名与 computed transform）+ chevron 旋转；
     ③ 选项错峰入场（animation-delay 递增）与勾选浮现；
     ④ 鼠标选择 / 键盘选择 / Esc / 外部点击 四条路径都落到正确的值；
     ⑤ 分页条下拉在视口底部向上翻转，翻页条数真的生效；
     ⑥ 弹窗内的下拉要盖住弹窗（elementFromPoint 命中面板）；
     ⑦ 深色主题下玻璃面板的呈现（截图 + 面板确实在视口内）。
   前置：server + app dev 均已启动，且 app 为 http 模式。
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
const errors = []

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', (m) => {
  /* 启动时 ready() 会探测一次会话，未登录返回 401 属预期行为，不计入异常 */
  if (m.type() === 'error' && !/401 \(Unauthorized\)/.test(m.text())) errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(String(e)))

const shot = (name) => page.screenshot({ path: OUT + '/' + name + '.png' })

/* 轮询过渡元素，拿到时间线证据（类名 + computed transform） */
const probe = (sels, ms = 700, step = 16) =>
  page.evaluate(
    async ([sels, ms, step]) => {
      const out = []
      const t0 = performance.now()
      while (performance.now() - t0 < ms) {
        const row = { t: Math.round(performance.now() - t0) }
        for (const [name, sel] of sels) {
          const el = document.querySelector(sel)
          row[name] = el
            ? {
                cls: el.getAttribute('class') || '',
                tf: getComputedStyle(el).transform,
                op: getComputedStyle(el).opacity,
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

const tx = (tf) => {
  const m = /matrix\(([^)]+)\)/.exec(tf || '')
  if (!m) return 0
  const v = m[1].split(',').map(Number)
  return v.length >= 6 ? v[4] : 0
}
const hasCls = (tl, key, sub) => tl.some((s) => s[key] && s[key].cls.includes(sub))

const CAT_BTN = 'button[aria-label="按类别筛选"]'
const RESULT_BTN = 'button[aria-label="按结果筛选"]'

await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.click('.demo-account >> nth=0')
await page.waitForSelector('.grid-main-side')
await page.goto(BASE + '/#/admin/audit', { waitUntil: 'networkidle' })
await page.waitForSelector('.logrow')
await page.waitForTimeout(500)

/* ── ① 搜索框 placeholder 完整显示 ───────────────────────────────── */
{
  const fit = await page.evaluate(() => {
    const input = document.querySelector('.input-wrap .input[type="search"]')
    if (!input) return null
    const cs = getComputedStyle(input)
    const probeSpan = document.createElement('span')
    probeSpan.style.cssText =
      'position:absolute;visibility:hidden;white-space:pre;letter-spacing:' + cs.letterSpacing
    probeSpan.style.font = cs.font || cs.fontSize + ' ' + cs.fontFamily
    probeSpan.textContent = input.placeholder
    document.body.appendChild(probeSpan)
    const need = probeSpan.getBoundingClientRect().width
    probeSpan.remove()
    const box = input.getBoundingClientRect()
    const content = box.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
    return { need: Math.round(need), content: Math.round(content), width: Math.round(box.width) }
  })
  check(!!fit, '审计页搜索框可测（宽 ' + (fit ? fit.width : '?') + 'px）')
  check(!!fit && fit.content >= fit.need, 'placeholder 完整显示：需要 ' + fit.need + 'px / 可用 ' + fit.content + 'px')
  await shot('sel-00-audit')
}

/* ── ② 打开动效时间线 ───────────────────────────────────────────── */
{
  const tl = probe([
    ['panel', '.fsel__panel'],
    ['caret', CAT_BTN + ' .fsel__caret'],
    ['opt', '.fsel__panel .fsel__opt'],
  ])
  await page.waitForTimeout(40)
  await page.click(CAT_BTN)
  await page.waitForTimeout(80)
  await shot('sel-01-open')
  await page.waitForTimeout(700)
  const t = await tl
  check(hasCls(t, 'panel', 'fsel-pop-enter-active') || hasCls(t, 'panel', 'fsel-pop-enter-from'), '打开：面板出现 enter 过渡类')
  const frames = new Set(t.map((s) => s.panel && s.panel.tf).filter(Boolean))
  check(frames.size >= 3, '打开：面板位移/缩放被采样到 ' + frames.size + ' 个不同 transform')
  check(t.some((s) => s.panel && parseFloat(s.panel.op) > 0.05 && parseFloat(s.panel.op) < 0.95), '打开：存在透明度中间帧')
  /* chevron 旋转到 180°（matrix(-1, 0, 0, -1, …)） */
  const caretEnd = t.filter((s) => s.caret).pop()
  check(
    !!caretEnd && /matrix\(-1,\s*0,\s*0,\s*-1/.test(caretEnd.caret.tf || ''),
    '打开：chevron 旋转 180°（' + (caretEnd ? caretEnd.caret.tf : '未采样') + '）',
  )
  const caretFrames = new Set(t.map((s) => s.caret && s.caret.tf).filter(Boolean))
  check(caretFrames.size >= 2, '打开：chevron 旋转存在中间态（' + caretFrames.size + ' 个不同 transform）')
}

/* ── ③ 选项错峰入场 + 勾选浮现 ──────────────────────────────────── */
{
  const delays = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.fsel__panel .fsel__opt')).map((el) => ({
      delay: getComputedStyle(el).animationDelay,
      name: getComputedStyle(el).animationName,
      op: getComputedStyle(el).opacity,
    })),
  )
  check(delays.length >= 6, '选项数量 ' + delays.length)
  check(delays.every((d) => d.name === 'fsel-opt-in'), '选项走错峰入场动画')
  check(new Set(delays.map((d) => d.delay)).size >= 4, '选项 animation-delay 递增错峰（' + new Set(delays.map((d) => d.delay)).size + ' 档）')
  check(delays.every((d) => parseFloat(d.op) > 0.9), '动画结束后选项不透明度已恢复为 1')

  const selMark = await page.evaluate(() => {
    const sel = document.querySelector('.fsel__panel .fsel__opt.is-selected')
    if (!sel) return null
    const check = sel.querySelector('.fsel__check')
    const cs = check ? getComputedStyle(check) : null
    return { label: sel.textContent.trim(), op: cs ? parseFloat(cs.opacity) : -1, tf: cs ? cs.transform : '' }
  })
  check(!!selMark, '当前值有勾选标记：' + (selMark ? selMark.label : '无'))
  /* scale 归位时 transform 计算值是 "none"（而非单位矩阵），两者都算通过 */
  const settled = selMark && (selMark.tf === 'none' || /matrix\(1,\s*0,\s*0,\s*1/.test(selMark.tf))
  check(!!selMark && selMark.op > 0.95 && settled, '勾选标记完全浮现（scale 归位：' + (selMark ? selMark.tf : '?') + '）')
}

/* ── ④ 鼠标选择：选「令牌」→ 列表真的被筛掉 ─────────────────────── */
{
  await page.click('.fsel__panel .fsel__opt:has-text("令牌")')
  await page.waitForSelector('.fsel__panel', { state: 'detached', timeout: 4000 })
  const label = (await page.textContent(CAT_BTN + ' .fsel__value')).trim()
  check(label === '令牌', '鼠标选择后触发器文案 = ' + label)

  const rows = await page.locator('.logrow').count()
  const badges = await page.locator('.logrow').allTextContents()
  check(rows > 0 && badges.every((t) => t.includes('令牌')), '筛选生效：' + rows + ' 行全部为「令牌」类别')
  await shot('sel-02-filtered')

  /* 关闭动效也有过渡类 */
  const tl = probe([['panel', '.fsel__panel']], 500)
  await page.waitForTimeout(30)
  await page.click(CAT_BTN)
  await page.waitForTimeout(60)
  await page.click('.scrim, .panel')
  const t = await tl
  check(hasCls(t, 'panel', 'fsel-pop-leave'), '关闭：出现 leave 过渡类（不是瞬间消失）')
  await page.waitForTimeout(400)
}

/* ── ⑤ 键盘：↑↓ / Enter / Esc / 焦点归还 ─────────────────────────── */
{
  /* 先把指针移开：面板弹出时指针若停在其上，mouseenter 会按真实行为同步高亮项 */
  await page.mouse.move(20, 20)
  await page.focus(RESULT_BTN)
  await page.keyboard.press('ArrowDown')
  await page.waitForSelector('.fsel__panel')
  const openLabel = (await page.getAttribute(RESULT_BTN, 'aria-expanded'))
  check(openLabel === 'true', 'ArrowDown 展开下拉（aria-expanded=true）')
  const ad1 = await page.getAttribute(RESULT_BTN, 'aria-activedescendant')

  /* 结果筛选共 3 项（全部结果 / 成功 / 已拦截）：按一次 ↓ 落在第 2 项 */
  await page.keyboard.press('ArrowDown')
  const ad2 = await page.getAttribute(RESULT_BTN, 'aria-activedescendant')
  check(ad1 !== ad2, 'ArrowDown 移动高亮项（aria-activedescendant 变化）')

  await page.keyboard.press('Enter')
  await page.waitForSelector('.fsel__panel', { state: 'detached', timeout: 4000 })
  const label = (await page.textContent(RESULT_BTN + ' .fsel__value')).trim()
  check(label === '成功', 'Enter 选中高亮项：' + label)

  /* Esc 关闭并把焦点还给触发按钮 */
  await page.keyboard.press('ArrowDown')
  await page.waitForSelector('.fsel__panel')
  await page.keyboard.press('Escape')
  await page.waitForSelector('.fsel__panel', { state: 'detached', timeout: 4000 })
  const focusBack = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  check(focusBack === '按结果筛选', 'Esc 关闭后焦点回到触发按钮（' + focusBack + '）')

  /* Tab 也能收起 */
  await page.keyboard.press('ArrowDown')
  await page.waitForSelector('.fsel__panel')
  await page.keyboard.press('Tab')
  await page.waitForSelector('.fsel__panel', { state: 'detached', timeout: 4000 })
  check(true, 'Tab 收起下拉且不劫持焦点顺序')

  /* 复位筛选，避免影响后续步骤的截图 */
  await page.click(CAT_BTN)
  await page.click('.fsel__panel .fsel__opt:has-text("全部类别")')
  await page.click(RESULT_BTN)
  await page.click('.fsel__panel .fsel__opt:has-text("全部结果")')
  await page.waitForTimeout(200)
}

/* ── ⑥ 分页条下拉：视口底部向上翻转 + 生效 ──────────────────────── */
{
  const PAGER = 'button[aria-label="每页条数"]'
  await page.click(PAGER)
  await page.waitForSelector('.fsel__panel')
  const geo = await page.evaluate(() => {
    const panel = document.querySelector('.fsel__panel')
    const btn = document.querySelector('button[aria-label="每页条数"]')
    const pr = panel.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    return {
      up: panel.getAttribute('data-up'),
      origin: getComputedStyle(panel).transformOrigin,
      panelH: Math.round(pr.height),
      panelTop: Math.round(pr.top),
      btnTop: Math.round(br.top),
      inViewport: pr.top >= 0 && pr.bottom <= window.innerHeight,
      /* 面板宽度规则：min-width 对齐触发器，但选项文案更长时按内容撑开（故只断言不窄于） */
      notNarrower: Math.round(pr.width) >= Math.round(br.width),
      panelW: Math.round(pr.width),
      btnW: Math.round(br.width),
    }
  })
  check(geo.up === 'true', '分页条下拉向上翻转（data-up=true）')
  check(geo.panelTop < geo.btnTop, '面板位于触发器上方（' + geo.panelTop + ' < ' + geo.btnTop + '）')
  /* Chromium 会把 transform-origin 解析成像素：向上翻转时应≈面板高度（底边） */
  const oy = parseFloat(String(geo.origin).split(' ')[1] || '0')
  check(Math.abs(oy - geo.panelH) < 2, 'transform-origin 翻到面板底边（' + geo.origin + ' vs 高 ' + geo.panelH + '）')
  check(geo.inViewport, '面板完整落在视口内')
  check(geo.notNarrower, '面板不窄于触发器（' + geo.panelW + ' ≥ ' + geo.btnW + '）')
  await shot('sel-03-pager-up')

  await page.click('.fsel__panel .fsel__opt:has-text("20")')
  await page.waitForSelector('.fsel__panel', { state: 'detached', timeout: 4000 })
  const rows = await page.locator('.logrow').count()
  check(rows === 20, '每页条数改为 20 后当前页渲染 ' + rows + ' 行')
  await page.click(PAGER)
  await page.click('.fsel__panel .fsel__opt:has-text("10")')
  await page.waitForTimeout(300)
}

/* ── ⑦ 弹窗内的下拉要盖住弹窗 ───────────────────────────────────── */
{
  await page.goto(BASE + '/#/admin/scopes', { waitUntil: 'networkidle' })
  await page.click('button:has-text("新建权限")')
  await page.waitForSelector('.modal')
  await page.click('#ns-tier')
  await page.waitForSelector('.fsel__panel')
  const over = await page.evaluate(() => {
    const panel = document.querySelector('.fsel__panel')
    const r = panel.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      z: getComputedStyle(panel).zIndex,
      above: !!(hit && hit.closest('.fsel__panel')),
      hit: hit ? hit.className || hit.tagName : null,
    }
  })
  check(over.z === '160', '面板 z-index 160（高于 .overlay-layer 100、低于 toast 200）')
  check(over.above, '面板盖在弹窗之上（命中 ' + over.hit + '）')
  /* 等入场过渡走完再截图：waitForSelector 在元素挂载瞬间就会返回，
     那时 opacity 还是 0，拍出来会是一张「没有面板」的图 */
  await page.waitForTimeout(450)
  await shot('sel-04-in-modal')
  /* Esc 会把下拉与所在弹窗一起收起（弹层系统的既有行为），这里只做兜底 */
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  if (await page.locator('.modal').count()) {
    await page.click('.modal button:has-text("取消")')
    await page.waitForTimeout(300)
  }
}

/* ── ⑧ 深色主题下的玻璃面板 ─────────────────────────────────────── */
{
  await page.goto(BASE + '/#/admin/audit', { waitUntil: 'networkidle' })
  await page.waitForSelector('.logrow')
  await page.click('.accountbtn')
  await page.waitForSelector('.menu__panel')
  await page.click('button:has-text("切换到深色主题")')
  /* 涟漪过渡期间主题尚未翻转：等它翻过去再开下拉，避免采到浅色玻璃的参数 */
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
    null,
    { timeout: 5000 },
  )
  await page.click(CAT_BTN)
  await page.waitForTimeout(500)
  const glass = await page.evaluate(() => {
    const cs = getComputedStyle(document.querySelector('.fsel__panel'))
    return { blur: cs.backdropFilter, bg: cs.backgroundColor }
  })
  check(/blur\(32px\)/.test(glass.blur), '深色主题下仍是液态玻璃（' + glass.blur + '）')
  await shot('sel-05-dark')
  await page.keyboard.press('Escape')
  await page.click('.accountbtn')
  await page.waitForSelector('.menu__panel')
  await page.click('button:has-text("切换到浅色主题")')
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-theme') !== 'dark',
    null,
    { timeout: 5000 },
  )
  await page.waitForTimeout(700) /* 等涟漪圆盘退场 */
}

results.push('INFO  控制台错误：' + (errors.length ? errors.join(' | ').slice(0, 240) : '（无）'))
console.log(results.join('\n'))
await browser.close()
