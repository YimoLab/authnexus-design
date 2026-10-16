#!/usr/bin/env node
/* ==========================================================================
   AuthNexus Design · 从契约生成 TypeScript 类型与 API 文档
   --------------------------------------------------------------------------
   单一数据源 contracts/components/*.json → 两处消费：
     dist/vue.d.ts        Vue3 组件的类型声明（props 推导、emits、slots）
     dist/index.d.ts      逻辑模块（usePager / theme / toast…）的函数签名
     contracts/generated/api.md      组件 API 表（官网与 README 复用）
     contracts/generated/api.en.md   同一份数据渲染的英文版
   全部自动生成——**不要手改**，改契约后重跑本脚本。

   用法：
     node tools/gen-types.mjs              # 生成
     node tools/gen-types.mjs --check      # 只校验是否与契约同步（CI 闸门）
   ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const CONTRACTS = path.join(ROOT, 'contracts', 'components')
const DIST = path.join(ROOT, 'dist')
const GEN = path.join(ROOT, 'contracts', 'generated')

const load = () => {
  const out = []
  for (const f of fs.readdirSync(CONTRACTS).sort()) {
    if (!f.endsWith('.json')) continue
    const c = JSON.parse(fs.readFileSync(path.join(CONTRACTS, f), 'utf8'))
    delete c.$schema
    out.push(c)
  }
  return out
}

const banner = (name) => `/* eslint-disable */
/**
 * ${name}
 * ---------------------------------------------------------------------------
 * 本文件由 tools/gen-types.mjs 从 contracts/components/*.json **自动生成**，请勿手改。
 * 改组件请改源码 → 跑 python tools/extract-contracts.py → 跑 node tools/gen-types.mjs
 * 数据源：contracts/schema.json（契约即唯一真相）
 */`

/* ---------------------------------------------------------------- 共享类型 */
function sharedTypes() {
  const p = path.join(ROOT, 'vue', 'ui', 'ui.types.ts')
  if (!fs.existsSync(p)) return 'export interface FieldOption {\n  value: string\n  label: string\n}\n'
  return fs.readFileSync(p, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, '')
}

/* ------------------------------------------------- 类型引用解析（防悬空） */
/* vue.d.ts 里组件 props 会引用跨文件类型（TimelineItem 定义在 SFC 内、
   OverlayEntry 在 overlayState.ts）——必须把它们补进同一份声明，
   解析不到就报错（宁可失败，也不产出 tsc 一片红的 .d.ts）。 */
const VUE_TYPE_CANDIDATES = [
  'DefineComponent', 'VNodeChild', 'VNode', 'Component', 'Ref', 'ComputedRef',
  'ShallowRef', 'InjectionKey', 'PropType', 'CSSProperties',
]
const TS_GLOBALS = new Set([
  'Record', 'Readonly', 'Partial', 'Required', 'Pick', 'Omit', 'Exclude', 'Extract',
  'NonNullable', 'ReturnType', 'Awaited', 'Array', 'ReadonlyArray', 'Promise',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'Date', 'RegExp', 'Error', 'Function',
  'Object', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt', 'JSON', 'Math',
  'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement',
  'HTMLButtonElement', 'HTMLDivElement', 'HTMLSpanElement', 'HTMLImageElement',
  'HTMLFormElement', 'HTMLAnchorElement', 'HTMLLabelElement', 'SVGSVGElement', 'SVGElement',
  'EventTarget', 'Event', 'CustomEvent', 'InputEvent', 'SubmitEvent', 'KeyboardEvent',
  'MouseEvent', 'PointerEvent', 'FocusEvent', 'TouchEvent', 'DragEvent', 'ClipboardEvent',
  'WheelEvent', 'DOMRect', 'DOMRectReadOnly', 'Node', 'Text', 'Document', 'Window',
  'FormData', 'File', 'Blob', 'FileList', 'URL', 'URLSearchParams', 'AbortController',
  'AbortSignal', 'IntersectionObserver', 'ResizeObserver', 'MutationObserver',
  'CSSStyleDeclaration', 'Clipboard', 'Navigator',
])

/** 找出 text 引用但未定义的类型名并从注册表补回（含链式引用）；解析不到就抛错。
    返回要追加到 text 末尾的声明列表。
    要点：① 注释不算引用（说明文字里会提到组件名）② `declare const X` 是值定义，
    引用它不算悬空 ③ 类型/值定义都计入"已声明"。 */
function resolveRefs(text, registry) {
  const stripComments = (s) =>
    s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  const declaredNames = (s) => {
    const set = new Set()
    for (const m of s.matchAll(/\b(interface|type|declare\s+const)\s+([A-Za-z_$][\w$]*)/g)) set.add(m[2])
    return set
  }
  const declared = declaredNames(stripComments(text))
  const extras = []
  let grown = text
  for (;;) {
    const scan = stripComments(grown)
    for (const n of declaredNames(scan)) declared.add(n)
    const refs = new Set([...scan.matchAll(/\b[A-Z][A-Za-z0-9_$]*\b/g)].map((m) => m[0]))
    const missing = [...refs].filter(
      (n) => n.length > 1 && !declared.has(n) && !TS_GLOBALS.has(n) && !VUE_TYPE_CANDIDATES.includes(n)
    )
    if (!missing.length) break
    const got = missing.filter((n) => registry.has(n))
    if (!got.length) {
      throw new Error(`类型引用无法解析（既不在声明内也不在注册表）：${missing.join(', ')}`)
    }
    for (const n of got) {
      const d = registry.get(n)
      extras.push(d.text)
      declared.add(n)
      grown += '\n' + d.text
    }
  }
  return extras
}

function genVueDts(contracts) {
  const body = ['']
  const byGroup = groupBy(contracts.filter((c) => c.kind === 'vue-component'))
  for (const [group, list] of byGroup) {
    body.push(`/* ===== ${group} ===== */`)
    for (const c of list) {
      const Props = `${c.name}Props`
      if (c.props.length) {
        body.push(`/** ${c.label.zh} —— ${c.summary.zh} */`)
        body.push(`export interface ${Props} {`)
        for (const p of c.props) {
          const doc = p.description ? `  /** ${p.description} */\n` : ''
          body.push(`${doc}  ${jsonName(p.name)}${p.required ? '' : '?'}: ${p.type}`)
        }
        body.push('}')
      } else {
        body.push(`/** ${c.label.zh} —— 无 props */`)
        body.push(`export type ${Props} = Record<string, never>`)
      }
      if (c.emits.length) {
        body.push(`export interface ${c.name}Emits {`)
        for (const e of c.emits) {
          body.push(`  (e: '${e.name}'${e.payload ? `, payload: ${e.payload.replace(/^v:\s*/, '')}` : ''}): void`)
        }
        body.push('}')
      }
      if (c.slots.length) {
        body.push(`export interface ${c.name}Slots {`)
        for (const s of c.slots) body.push(`  ${jsonName(s.name)}(): unknown`)
        body.push('}')
      }
      const Emits = c.emits.length ? `, ${c.name}Emits` : ''
      body.push(`export declare const ${c.name}: DefineComponent<${Props}${Emits}>`)
      body.push('')
    }
  }
  const text = body.join('\n')
  // 类型注册表：SFC 自己 script 段的类型 + 全部逻辑模块的类型
  const registry = new Map()
  for (const c of contracts) {
    if (c.kind === 'vue-component' && c.source) {
      const src = fs.readFileSync(path.join(ROOT, c.source), 'utf8')
      const script = (src.match(/<script[^>]*>([\s\S]*?)<\/script>/) || [])[1] || ''
      for (const d of extractTsDeclsFromText(script, { typesOnly: true, label: c.source })) {
        if (!registry.has(d.name)) registry.set(d.name, d)
      }
    } else if (c.kind === 'module' && c.source) {
      for (const d of extractTsDecls(c.source, { typesOnly: true })) {
        if (!registry.has(d.name)) registry.set(d.name, d)
      }
    }
  }
  const prelude = sharedTypes()
  const extras = resolveRefs(`${prelude}\n${text}`, registry)
  const full = extras.length
    ? `${text}\n/* ===== 公共类型（被组件 props 引用，自源码提取）===== */\n${extras.join('\n')}\n`
    : text
  const need = vueTypeImports(prelude + full, VUE_TYPE_CANDIDATES)
  return [
    banner('AuthNexus Design · Vue 3 组件类型'),
    need ? `import type { ${need.join(', ')} } from 'vue'` : '',
    '',
    prelude,
    full,
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n')
}

/* ============================================================ TS 声明提取
   原则：**签名必须来自源码**——手写签名会与实现漂移。
   （本工具第一版就翻过车：Pager / toast / confirmDialog 的签名全凭记忆写，
   与真实源码完全不同；被 tsc 与人工核对双重抓出。）

   提取规则（针对本仓库的代码风格：顶格声明、JSDoc 在上）：
     interface         整块保留（含字段注释）；大括号配平
     type              单行（若行尾是 | & , < 则续行）
     function          签名保留到函数体 `{` 为止，函数体丢弃；
                       返回类型里的对象类型 {..} 与箭头 => 不会误判为函数体
     const             取 `: Type` 注解；无注解且初始化为 reactive<X>() 时取 X
   导出策略：function/const 只保留 export 的；interface/type 全量保留
   （导出的签名可能引用内部类型，缺了 tsc 直接报错），不加 export 即内部类型。
   ============================================================ */
function skipStr(t, i) {
  const q = t[i]
  i++
  while (i < t.length) {
    if (t[i] === '\\') { i += 2; continue }
    if (t[i] === q) return i + 1
    i++
  }
  return i
}

function skipWsC(t, i) {
  for (;;) {
    while (i < t.length && /\s/.test(t[i])) i++
    if (t[i] === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue }
    if (t[i] === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? t.length : e + 2; continue }
    return i
  }
}

/** 从开括号 i 起找配平结束位置（跳过字符串与注释），返回结束位置之后 */
function balancedEnd(t, i) {
  const open = t[i]
  const close = { '(': ')', '{': '}', '[': ']' }[open]
  if (!close) return i + 1
  let depth = 0
  while (i < t.length) {
    const ch = t[i]
    if (ch === '"' || ch === "'" || ch === '`') { i = skipStr(t, i); continue }
    if (ch === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue }
    if (ch === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? t.length : e + 2; continue }
    if (ch === open) depth++
    else if (ch === close) { depth--; if (depth === 0) return i + 1 }
    i++
  }
  return t.length
}

/** 剥掉参数里的默认值（`defaultSize = 10` → `defaultSize`），同时**补 `?` 保持可选性**。
    ambient 声明（.d.ts）不允许参数初始化器（TS2371）；而源码里"有默认值"就意味着
    "调用时可省略"，声明里必须写成 `param?: T`，否则签名会比真实函数更严格。 */
function stripParamDefaults(sig) {
  const open = sig.indexOf('(')
  if (open < 0) return sig
  const close = balancedEnd(sig, open) - 1        // 指向 `)`
  const inner = sig.slice(open + 1, close)
  let out = ''
  let depth = 0
  let skipping = false
  let segStart = 0                                // 当前参数在 out 里的起点（用于补 ?）
  let i = 0
  while (i < inner.length) {
    const ch = inner[i]
    if (ch === '"' || ch === "'" || ch === '`') {
      const j = skipStr(inner, i)
      out += inner.slice(i, j)
      i = j
      continue
    }
    if (ch === '=' && inner[i + 1] === '>') {       // 箭头函数：整体保留，不参与深度
      if (!skipping) out += '=>'
      i += 2
      continue
    }
    if ('([{<'.includes(ch)) {
      depth++
      if (!skipping) out += ch
      i++
      continue
    }
    if (')]}>'.includes(ch)) {
      depth = Math.max(0, depth - 1)
      if (!skipping) out += ch
      i++
      continue
    }
    if (skipping) {
      if (ch === ',' && depth === 0) {
        skipping = false
        out += ch
        segStart = out.length
      }
      i++
      continue
    }
    if (ch === ',' && depth === 0) {
      out += ch
      segStart = out.length
      i++
      continue
    }
    if (ch === '=' && depth === 0 && inner[i + 1] !== '=' && !'=!<>'.includes(inner[i - 1] || '')) {
      // 有默认值 ⇒ 可选：给参数名补 `?`（若尚未标注）
      const seg = out.slice(segStart)
      const colon = seg.indexOf(':')
      if (colon >= 0 && seg[colon - 1] !== '?') {
        out = out.slice(0, segStart + colon) + '?' + out.slice(segStart + colon)
      }
      out = out.replace(/\s+$/, '')                 // 默认值连同前面的空白一起剥掉
      skipping = true
      i++
      continue
    }
    out += ch
    i++
  }
  return sig.slice(0, open + 1) + out + sig.slice(close)
}

function extractTsDecls(rel, opts = {}) {
  return extractTsDeclsFromText(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { ...opts, label: rel })
}

/** opts.label：报错时显示的名字；opts.typesOnly：只提取 interface/type（SFC script 用） */
function extractTsDeclsFromText(t, opts = {}) {
  const label = opts.label || '<text>'
  const out = []
  const re = /^(export\s+)?(interface|type|function|const)\s+([A-Za-z_$][\w$]*)/gm
  let m
  while ((m = re.exec(t)) !== null) {
    const lineStart = t.lastIndexOf('\n', m.index) + 1
    if (m.index !== lineStart) continue            // 只认顶格声明（嵌套的都带缩进）
    const exported = !!m[1]
    const kind = m[2]
    const name = m[3]
    // 紧邻上方的 JSDoc：必须"不含内部 */ 且之后到声明之间只有空白"——
    // 否则 [\s\S]*? 会跨过代码去找更后面的 */，把中间整段代码误当成注释
    const jd = t.slice(0, lineStart).match(/\/\*\*((?!\*\/)[\s\S])*\*\/\s*$/)
    const doc = jd ? jd[0].replace(/\s+$/, '') + '\n' : ''

    if (kind === 'interface') {
      const brace = t.indexOf('{', m.index + m[0].length)
      const end = balancedEnd(t, brace)
      out.push({ name, kind, exported, text: doc + t.slice(m.index, end).trim() })
    } else if (kind === 'type') {
      // 续行条件：括号（([{）未配平，或行尾是 | & , < （联合类型 / 泛型未完）
      const unbalanced = (s) => {
        let d = 0
        for (const ch of s) {
          if (ch === '(' || ch === '[' || ch === '{') d++
          else if (ch === ')' || ch === ']' || ch === '}') d--
        }
        return d > 0
      }
      let end = t.indexOf('\n', m.index)
      if (end < 0) end = t.length
      for (;;) {
        const seg = t.slice(m.index, end)
        const more = (/[|&,<]\s*$/.test(seg.trimEnd()) || unbalanced(seg)) && end < t.length
        if (!more) break
        const next = t.indexOf('\n', end + 1)
        end = next < 0 ? t.length : next
      }
      out.push({ name, kind, exported, text: doc + t.slice(m.index, end).trim() })
    } else if (kind === 'function') {
      if (!exported || opts.typesOnly) continue
      const paren = t.indexOf('(', m.index + m[0].length)
      const paramsEnd = balancedEnd(t, paren)
      let i = paramsEnd
      let body = -1
      while (i < t.length) {
        i = skipWsC(t, i)
        const ch = t[i]
        if (ch === ';' || ch === undefined) break
        if (ch === '{') {
          let k = i - 1
          while (k >= 0 && /\s/.test(t[k])) k--
          const prev = t[k]
          const prev2 = k > 0 ? t[k - 1] : ''
          const arrow = prev === '>' && prev2 === '='
          const typeCtx = [':', '|', '&', ',', '(', '=', '<'].includes(prev)
          if (arrow || typeCtx) { i = balancedEnd(t, i); continue }   // 返回类型里的 {..} / => 字面量
          body = i
          break
        }
        if (ch === '(' || ch === '[') { i = balancedEnd(t, i); continue }
        i++
      }
      const raw = t.slice(m.index, body < 0 ? paramsEnd : body).trim()
      // 硬约定：导出的函数必须显式标注返回类型（.d.ts 不允许隐式 any → TS7010），
      // 缺了就报错——宁可当场失败，也不生成"看起来能用、实际是 any"的类型。
      // （paramsEnd 是参数表 `)` 之后的位置，从这里取"返回类型区"最精确）
      const restAfterParams = t.slice(paramsEnd, body < 0 ? paramsEnd : body).trim()
      if (!restAfterParams.startsWith(':')) {
        throw new Error(
          `${label} · 导出函数 ${name} 缺少返回类型标注——请在源码补上（如 \`): void {\`）后重跑`
        )
      }
      const sig = stripParamDefaults(raw)
      out.push({ name, kind, exported, text: doc + sig.replace(/^export\s+/, 'export declare ') + ';' })
    } else if (kind === 'const') {
      if (!exported || opts.typesOnly) continue
      // 顶层 `=` 定位（跟踪 <({[ 深度；跳过 => == 等非赋值）
      let i = m.index + m[0].length
      let depth = 0
      let eq = -1
      while (i < t.length) {
        const ch = t[i]
        if (ch === '"' || ch === "'" || ch === '`') { i = skipStr(t, i); continue }
        if (ch === '/' && t[i + 1] === '/') { while (i < t.length && t[i] !== '\n') i++; continue }
        if ('<({['.includes(ch)) depth++
        else if ('>)}]'.includes(ch)) depth--
        else if (ch === '=' && depth === 0 && t[i + 1] !== '>' && t[i + 1] !== '=' && !'=!<>'.includes(t[i - 1] || '')) { eq = i; break }
        i++
      }
      let type = 'unknown'
      if (eq > 0) {
        const head = t.slice(m.index + m[0].length, eq)
        const colon = head.indexOf(':')
        if (colon >= 0) type = head.slice(colon + 1).trim()
        else {
          const g = t.slice(eq + 1, eq + 160).match(/^\s*reactive\s*<([\s\S]*?)>\s*\(/)
          if (g) type = g[1].trim()
        }
      }
      out.push({ name, kind, exported, text: `${doc}export declare const ${name}: ${type}` })
    }
  }
  return out
}

/** 从生成文本里探测用到哪些 vue 类型（避免手写 import 漂移） */
function vueTypeImports(text, candidates) {
  return candidates.filter((x) => new RegExp(`\\b${x}\\b`).test(text))
}

/** 内部类型剪枝：只保留「被某个导出声明引用」的内部类型（含链式引用闭包）。
    否则 .d.ts 里会堆一批无人使用的内部实现细节（还可能是提取盲区）。 */
function pruneInternals(decls) {
  const byName = new Map(decls.map((d) => [d.name, d]))
  const keep = new Set(decls.filter((d) => d.exported).map((d) => d.name))
  for (;;) {
    let grew = false
    for (const name of [...keep]) {
      const text = byName.get(name)?.text || ''
      for (const [n, d] of byName) {
        if (!keep.has(n) && new RegExp(`\\b${n}\\b`).test(text)) {
          keep.add(n)
          grew = true
        }
      }
    }
    if (!grew) break
  }
  return decls.filter((d) => keep.has(d.name))
}

function genIndexDts(contracts) {
  const mods = contracts.filter((c) => c.kind === 'module')
  // 先全量提取（跨模块一起做内部类型剪枝——A 模块的内部类型可能被 B 模块的导出引用）
  const perModule = []
  for (const m of mods.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!m.source) continue
    let decls = []
    try {
      decls = extractTsDecls(m.source)
    } catch (e) {
      throw new Error(`提取 ${m.source} 失败：${e.message}`)
    }
    perModule.push({ m, decls })
  }
  const allKept = new Set(pruneInternals(perModule.flatMap((x) => x.decls)).map((d) => d.name))
  const seen = new Set()
  const chunks = []
  for (const { m, decls } of perModule) {
    const kept = []
    for (const d of decls) {
      if (!allKept.has(d.name) || seen.has(d.name)) continue   // 同名去重：先到先得
      seen.add(d.name)
      kept.push(d.text)
    }
    if (kept.length) {
      chunks.push(`/* ===== ${m.label.zh}（${m.name}）· ${m.source} ===== */`, ...kept, '')
    }
  }
  const body = chunks.join('\n')
  // 安全检查：body 里不应再有悬空类型引用（pruneInternals 已保证，这里是最后一道闸）
  const registryAll = new Map(perModule.flatMap((x) => x.decls).map((d) => [d.name, d]))
  const leftover = resolveRefs(body, registryAll)
  const checked = leftover.length ? body + '\n' + leftover.join('\n') : body
  const need = vueTypeImports(checked, VUE_TYPE_CANDIDATES)
  return [
    banner('AuthNexus Design · 逻辑模块类型（从源码提取，请勿手改）'),
    need.length ? `import type { ${need.join(', ')} } from 'vue'` : '',
    '',
    checked,
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n')
}

/* ---------------------------------------------------------------- API 文档 */
function apiTable(c, lang) {
  const rows = [
    `| ${lang === 'en' ? 'Name' : '名称'} | ${lang === 'en' ? 'Type' : '类型'} | ${lang === 'en' ? 'Required' : '必填'} | ${lang === 'en' ? 'Default' : '默认值'} | ${lang === 'en' ? 'Notes' : '说明'} |`,
    '|---|---|---|---|---|',
  ]
  for (const p of c.props) {
    const desc = lang === 'en' ? '' : p.description || ''
    rows.push(
      `| \`${p.name}\` | \`${p.type}\` | ${p.required ? (lang === 'en' ? 'yes' : '是') : (lang === 'en' ? 'no' : '否')} | ${p.default ? `\`${p.default}\`` : '—'} | ${desc} |`
    )
  }
  return rows.join('\n')
}

function genApiMd(contracts, lang) {
  const L = {
    zh: {
      title: '# 组件 API',
      note: '> 本文件由 `tools/gen-types.mjs` 从 `contracts/components/*.json` 自动生成，请勿手改。',
      groups: {
        form: '表单', data: '数据展示', display: '展示', layout: '布局',
        nav: '导航', overlay: '浮层', feedback: '反馈', logic: '逻辑', other: '其他',
      },
      props: 'Props', emits: 'Events', slots: 'Slots', classes: 'Class 契约',
      deps: '依赖', a11y: '无障碍', source: '源码', exports: '导出',
      classNote: '资产类（照抄，不要自造）：',
      stateNote: '状态类（不加前缀）：',
    },
    en: {
      title: '# Component API',
      note: '> Auto-generated by `tools/gen-types.mjs` from `contracts/components/*.json` — do not edit by hand.',
      groups: {
        form: 'Form', data: 'Data display', display: 'Display', layout: 'Layout',
        nav: 'Navigation', overlay: 'Overlay', feedback: 'Feedback', logic: 'Logic', other: 'Other',
      },
      props: 'Props', emits: 'Events', slots: 'Slots', classes: 'Class contract',
      deps: 'Dependencies', a11y: 'Accessibility', source: 'Source', exports: 'Exports',
      classNote: 'Asset classes (copy as-is, never invent): ',
      stateNote: 'State classes (no prefix): ',
    },
  }[lang]

  const out = [L.title, '', L.note, '']
  const byGroup = groupBy(contracts)
  for (const [g, list] of byGroup) {
    out.push(`## ${L.groups[g] || g}`, '')
    for (const c of list) {
      const name = lang === 'en' ? c.label.en : c.label.zh
      out.push(`### ${name} · \`${c.name}\``, '')
      out.push(c.summary[lang] || c.summary.zh, '')
      if (c.props.length) {
        out.push(`**${L.props}**`, '', apiTable(c, lang), '')
      }
      if (c.emits.length) {
        out.push(`**${L.emits}**`, '')
        for (const e of c.emits) out.push(`- \`${e.name}\`${e.payload ? ` — \`${e.payload}\`` : ''}`)
        out.push('')
      }
      if (c.slots.length) {
        out.push(`**${L.slots}**: ${c.slots.map((s) => `\`${s.name}\``).join(' · ')}`, '')
      }
      if (c.classes.asset.length) {
        out.push(`**${L.classes}**`, '', L.classNote, '')
        out.push(c.classes.asset.map((x) => `\`${x}\``).join(' '), '')
        if (c.classes.state.length) out.push(L.stateNote + c.classes.state.map((x) => `\`${x}\``).join(' '), '')
      }
      if (c.deps?.length) out.push(`**${L.deps}**: ${c.deps.map((d) => `\`${d}\``).join(' · ')}`, '')
      if (c.exports?.length) out.push(`**${L.exports}**: ${c.exports.map((x) => `\`${x}\``).join(' · ')}`, '')
      if (c.a11y?.length && lang === 'zh') out.push(`**${L.a11y}**: ${c.a11y.join('；')}`, '')
      out.push(`<sub>${L.source}: \`${c.source}\`</sub>`, '')
    }
  }
  return out.join('\n')
}

/* ---------------------------------------------------------------- 工具 */
function groupBy(list) {
  const m = new Map()
  for (const c of list) {
    if (!m.has(c.group)) m.set(c.group, [])
    m.get(c.group).push(c)
  }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

function jsonName(s) {
  return /^[A-Za-z_$][\w$]*$/.test(s) ? s : JSON.stringify(s)
}

function main() {
  const check = process.argv.includes('--check')
  const contracts = load()
  const files = {
    'dist/vue.d.ts': genVueDts(contracts),
    'dist/index.d.ts': genIndexDts(contracts),
    'contracts/generated/api.md': genApiMd(contracts, 'zh'),
    'contracts/generated/api.en.md': genApiMd(contracts, 'en'),
  }
  if (check) {
    const stale = []
    for (const [rel, content] of Object.entries(files)) {
      const p = path.join(ROOT, rel)
      if (!fs.existsSync(p)) stale.push(`${rel}：缺失`)
      else if (fs.readFileSync(p, 'utf8') !== content) stale.push(`${rel}：与契约不同步`)
    }
    if (stale.length) {
      console.log('[FAIL] 生成物与契约不一致：')
      stale.forEach((s) => console.log('  ' + s))
      process.exit(1)
    }
    console.log(`[PASS] 4 个生成物均与契约同步`)
    return
  }
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(ROOT, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, content, 'utf8')
    console.log(`  ${content.split('\n').length.toString().padStart(4)} 行  ${rel}`)
  }
  console.log(`\n由 ${contracts.length} 份契约生成（改契约后重跑）`)
}

main()
