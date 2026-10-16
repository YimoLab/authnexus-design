#!/usr/bin/env node
/* ==========================================================================
   AuthNexus Design · lint-usage —— 把 BEHAVIOR 铁律变成可执行检查
   --------------------------------------------------------------------------
   写完代码后跑一遍，把「AI 常犯的错」拦在提交之前。每条规则对应
   docs/BEHAVIOR.md 的一节或 ADOPT.md 的一条坑。

   用法：
     node tools/lint-usage.mjs <文件或目录…>      # 检查指定路径
     node tools/lint-usage.mjs --stdin            # 从 stdin 读代码片段
     node tools/lint-usage.mjs --selftest         # 用内置样本自测规则
   退出码：0 = 无违规；1 = 有违规。
   ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')

/** 资产类根名集合——判断「某 class 是不是资产类」的唯一依据。
 *  没有它，规则会把宿主项目的业务类（auth-card / perm__icon…）全误报成违规。 */
const ASSET_ROOTS = new Set(
  fs.existsSync(path.join(ROOT, 'tools', 'class-map.json'))
    ? Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'class-map.json'), 'utf8')))
    : []
)

const RULES = [
  {
    id: 'no-native-select',
    level: 'error',
    desc: '禁止原生 <select>：弹出层由系统绘制，圆角/动效/玻璃全部失效',
    why: 'assets 的 .anx-select 只有盒样式；assets 的 SelectMenu 才是可定制的下拉',
    // 先剥注释：文档里说明「本组件不用原生 select」不该被判违规
    test: (t) => /<select[\s>]/i.test(stripComments(t)),
    suggest: '改用 SelectMenu（见 MCP search_patterns 的表单范式）',
  },
  {
    id: 'overlay-must-wrap',
    level: 'error',
    desc: '浮层（.anx-modal / .anx-drawer / .anx-scrim）必须包在 .anx-overlay-layer 内',
    why: '浮层自身没有 z-index，承载层才提供 100 层；缺了会被顶栏(30)/侧栏(40) 反压',
    test: (t, ctx) => {
      const code = stripComments(t)
      const hasOverlay = /class="[^"]*\banx-(modal|drawer|scrim)\b/.test(code)
      if (!hasOverlay) return false
      // 浮层组件内部用 Teleport 挂到 #overlay-layer 是正确做法，不算违规
      if (/<Teleport\b/.test(code)) return false
      // 已挂承载层、或由 OverlayHost / OverlaySlot 承载
      if (/class="[^"]*\banx-overlay-layer\b/.test(code)) return false
      if (/OverlayHost|OverlaySlot/.test(code)) return false
      if (ctx.isComponent) return false
      return true
    },
    suggest: '包一层 <div class="anx-overlay-layer"> … </div>（或用 OverlayHost / OverlaySlot）',
  },
  {
    id: 'toast-need-icon',
    level: 'error',
    desc: 'toast 必须包含 .anx-toast__icon，否则三种 tone 看起来一样',
    why: 'tone 的视觉区分完全在图标颜色上（ok 绿 / danger 红 / info 墨）',
    test: (t, ctx) => {
      // toast-layer 是**容器**，不是 toast 实例，不要求它带图标
      const code = stripComments(t).replace(/class="[^"]*\banx-toast-layer\b[^"]*"/g, '')
      if (!/toast--|anx-toast\b/.test(code)) return false
      if (ctx.isComponent) return false           // 组件内由模板统一生成，不在调用处检查
      return !/anx-toast__icon/.test(code)
    },
    suggest: '调用 toast() 时让 ToastHost 渲染图标；若自绘 toast，务必包含 <span class="anx-toast__icon">',
  },
  {
    id: 'class-need-anx',
    level: 'error',
    desc: '资产 class 漏了 anx- 前缀',
    why: '命名空间隔离：与宿主框架/全局样式撞名会互相污染（见 ADOPT.md §5）',
    // 判据：**只管 class-map.json 登记过的资产类**。
    // 宿主项目自有的业务类（auth-card / perm__icon …）本来就不该加前缀，
    // 不能把它们误报为违规——否则规则会被噪音淹没、真正的问题反而看不见。
    test: (t) => {
      const bad = []
      // 只看模板部分：<script> 里的 className= 与变量名不是 class 契约
      const tpl = t.split(/<script\b/)[0]
      const re = /class="([^"]+)"/g
      let m
      while ((m = re.exec(tpl)) !== null) {
        for (const tok of m[1].split(/\s+/)) {
          if (!tok || /^(is|has|js|anx|od|g)-/.test(tok)) continue
          // 只判「资产根名」且必须整体像 class（无驼峰驼入、无驼峰变量名特征）
          if (/[A-Z]/.test(tok)) continue          // camelCase 多半是 JS 变量
          const root = tok.split('__')[0].split('--')[0]
          if (ASSET_ROOTS.has(root) && !tok.startsWith('anx-')) bad.push(tok)
        }
      }
      return bad.length ? bad : false
    },
    suggest: (v) => `给这些资产类加 anx- 前缀：${[].concat(v).join(' ')}`,
  },
  {
    id: 'no-raw-color',
    level: 'warn',
    desc: '样式里出现裸色值，应改用设计令牌',
    why: '令牌是明暗双主题与品牌覆盖的唯一入口；写死色值会在深色主题下错色',
    test: (t, ctx) => {
      if (!/\.(css|vue|scss|less)\b/.test(ctx.ext) && !ctx.ext.includes('vue')) return false
      if (ctx.isComponent) return false
      // hex / rgb() 直接写值（排除注释里与 CSS 变量引用）
      const code = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/var\(--[\w-]+\)/g, '')
      const hits = []
      const hex = code.match(/#[0-9a-fA-F]{3,8}\b/g) || []
      const rgb = code.match(/\brgba?\([^)]*\)/g) || []
      if (hex.length) hits.push(...hex.slice(0, 3))
      if (rgb.length) hits.push(...rgb.slice(0, 2))
      return hits.length ? hits : false
    },
    suggest: (v) => `改用 var(--*)：${[].concat(v).join(' ')}（用 MCP get_tokens 查真实值）`,
  },
  {
    id: 'no-paged-transform',
    level: 'error',
    desc: '分页滑动要加在整块容器上并用 .anx-paged-clip 裁剪，不能只给 tbody 加 transform',
    why: '只给 tbody 加 transform 会撑出横向滚动条（BEHAVIOR §4 实测教训）',
    test: (t) => {
      if (!/transform/.test(t)) return false
      const tbodyTransform = /tbody[^{]*\{[^}]*transform/.test(t.replace(/\s+/g, ' '))
      const hasClip = /paged-clip/.test(t)
      return tbodyTransform && !hasClip
    },
    suggest: '把 transform 移到包裹层（.anx-paged-clip 的直接子元素）上',
  },
  {
    id: 'no-od-leak',
    level: 'warn',
    desc: 'od-* 是 OpenDesign 第三方层，不应出现在新代码里',
    why: '它是原型遗留层；新代码应只用 anx- 资产类',
    test: (t) => /class="[^"]*\bod-/.test(t),
    suggest: '换成对应的 anx- 资产类',
  },
]

/** 剥掉 JS/CSS/HTML 注释——文档里提到某写法 ≠ 真的在用它 */
function stripComments(t) {
  return t
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

/* ---------------------------------------------------------------- 检查 */
function lintText(text, file) {
  const ext = path.extname(file)
  const isComponent = /[\\/](components|ui|overlay)[\\/]/.test(file)
  const inHtml = ext === '.html'
  const ctx = { ext, isComponent, inHtml, file }
  const findings = []
  for (const r of RULES) {
    let hit = false
    let detail = null
    try {
      hit = r.test(text, ctx)
    } catch (e) {
      hit = false
    }
    if (hit) {
      const raw = typeof hit === 'object' && hit !== null && !Array.isArray(hit) ? null : hit
      if (Array.isArray(hit)) detail = hit
      findings.push({ rule: r, detail })
    }
  }
  return findings
}

function collectFiles(target) {
  const st = fs.statSync(target)
  if (st.isFile()) return [target]
  const out = []
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) {
        if (['node_modules', 'dist', '.git', '_site', 'data', '.out'].includes(e.name)) continue
        walk(p)
      } else if (/\.(vue|ts|tsx|js|mjs|html|css|scss)$/.test(e.name)) {
        out.push(p)
      }
    }
  }
  walk(target)
  return out
}

function report(findings, label) {
  const errs = findings.filter((f) => f.rule.level === 'error')
  const warns = findings.filter((f) => f.rule.level === 'warn')
  if (!findings.length) {
    console.log(`  PASS  ${label}`)
    return 0
  }
  for (const f of findings) {
    const tag = f.rule.level === 'error' ? 'FAIL ' : 'WARN '
    console.log(`  ${tag} [${f.rule.id}] ${label}`)
    console.log(`        ${f.rule.desc}`)
    console.log(`        原因：${f.rule.why}`)
    if (f.rule.suggest) {
      console.log(`        建议：${typeof f.rule.suggest === 'function' ? f.rule.suggest(f.detail) : f.rule.suggest}`)
    }
  }
  return errs.length
}

/* ---------------------------------------------------------------- 自测 */
const SELFTEST = [
  ['合规：资产类 + 令牌', `<template><div class="anx-panel"><input class="anx-input" /></div></template>
<style scoped>.anx-panel { color: var(--ink); }</style>`, 0],
  ['违规：原生 select', `<template><select class="anx-select"><option>a</option></select></template>`, 1],
  ['违规：裸色值', `<style>.x { color: #1890ff; background: rgba(0,0,0,.5); }</style>`, 0],
  ['违规：缺 anx- 前缀', `<template><button class="btn btn--primary">x</button></template>`, 1],
  ['违规：浮层没包承载层', `<template><div class="anx-drawer">x</div></template>`, 1],
  ['合规：浮层包了承载层', `<template><div class="anx-overlay-layer"><div class="anx-drawer">x</div></div></template>`, 0],
  ['违规：tbody 直接 transform', `<style>.tb tbody { transform: translateX(20px); }</style>`, 1],
  ['合规：整块滑动 + clip', `<style>.paged-clip .inner { transform: translateX(20px); }</style>`, 0],
]

async function selftest() {
  console.log('lint-usage 自测\n')
  let fail = 0
  for (const [label, src, expectErr] of SELFTEST) {
    const f = lintText(src, 'src/demo/File.vue')
    const errs = f.filter((x) => x.rule.level === 'error').length
    const ok = errs === expectErr
    if (!ok) fail++
    const ids = f.map((x) => x.rule.id).join(',') || '—'
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(26)} 期望错误 ${expectErr} / 实际 ${errs}  [${ids}]`)
  }
  console.log(`\n${fail ? `FAIL: ${fail} 项` : '全部通过'}`)
  process.exit(fail ? 1 : 0)
}

/* 直接运行才执行 CLI；被 import（如官网构建器读规则表）时只导出数据 */
const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url
if (invokedDirectly) {
if (process.argv.includes('--selftest')) await selftest()
else if (process.argv.includes('--stdin')) {
  const code = fs.readFileSync(0, 'utf8')
  const n = report(lintText(code, 'stdin.tsx'), 'stdin')
  process.exit(n ? 1 : 0)
} else {
  const targets = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  if (!targets.length) {
    console.error('用法：node tools/lint-usage.mjs <文件或目录…> | --stdin | --selftest')
    process.exit(2)
  }
  let errs = 0
  let files = 0
  for (const t of targets) {
    for (const f of collectFiles(t)) {
      files++
      const findings = lintText(fs.readFileSync(f, 'utf8'), f)
      errs += report(findings, path.relative(process.cwd(), f))
    }
  }
  console.log(`\n检查 ${files} 个文件：${errs ? `${errs} 个文件有 error 级违规` : '无 error 级违规'}`)
  process.exit(errs ? 1 : 0)
}
}

export { RULES }
