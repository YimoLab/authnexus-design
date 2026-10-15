#!/usr/bin/env node
/* ==========================================================================
   AuthNexus Design · MCP Server（stdio）
   --------------------------------------------------------------------------
   把设计系统变成 AI 编码代理可调用的工具。**零依赖手写 JSON-RPC**——不引入
   MCP SDK，避免给设计系统资产带来供应链风险；协议本身足够简单。

   工具（描述从 contracts/ 生成，与实现永不漂移）：
     list_components   列出组件/模块（可按分组或关键词过滤）
     get_component     取完整契约：props / emits / slots / class 契约 / 依赖 / a11y
     get_tokens        取设计令牌的**真实值**（色值/间距/圆角/玻璃/动效）
                       —— 让 AI 不再凭记忆写 #1890ff 这类默认蓝
     search_patterns   取已验证的组合范式（登录页 / 表格分页 / 抽屉表单 / 确认弹窗…）

   启动：node mcp/server.mjs
   在 MCP 客户端配置里加：
     { "mcpServers": { "authnexus-design": { "command": "node",
       "args": ["/绝对路径/mcp/server.mjs"] } } }

   另提供 --selftest 自检（不走 stdio，直接调用工具并断言输出）。
   ========================================================================== */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(HERE, '..')
const CONTRACTS = path.join(ROOT, 'contracts', 'components')
const CSS_DIR = path.join(ROOT, 'css')

const PROTOCOL_VERSION = '2024-11-05'
const SERVER_INFO = { name: 'authnexus-design', version: '0.1.0' }

/* ---------------------------------------------------------------- 契约装载 */
function loadContracts() {
  if (!fs.existsSync(CONTRACTS)) return {}
  const out = {}
  for (const f of fs.readdirSync(CONTRACTS)) {
    if (!f.endsWith('.json')) continue
    const c = JSON.parse(fs.readFileSync(path.join(CONTRACTS, f), 'utf8'))
    delete c.$schema
    out[c.name] = c
  }
  return out}

const CONTRACTS_CACHE = loadContracts()

/* ---------------------------------------------------------------- 令牌读取 */
/** 令牌分组：决定 get_tokens 返回时归到哪一组 */
const TOKEN_GROUPS = [
  ['color', /^(?:paper|bone|ink|ink-hover|ink-press|muted-text|muted|hairline|hairline-hover|acid|on-acid|on-dark|ok|danger|warn|info|link|focus|logo-[\w-]+|surface[\w-]*|code-[\w-]+|scrollbar[\w-]*)$/],
  ['radius', /^r/],
  ['space', /^(?:space|gutter|gap)/],
  ['glass', /^glass-/],
  ['motion', /^(?:t|ease)$/],
  ['layout', /^(?:nav-h|nav-gap|nav-total|sidebar-w[\w-]*|container)$/],
  ['font', /^font-/],
]

function groupOf(name) {
  const bare = name.replace(/^--/, '')
  for (const [g, re] of TOKEN_GROUPS) if (re.test(bare)) return g
  return 'other'
}

/**
 * 解析 CSS 自定义属性。
 * 不用正则逐个匹配令牌——令牌值可能跨多行（如 --glass-shadow）与含嵌套括号，
 * 正则会截断。这里用「配平花括号 + 逐条读取」的方式，值原样保留。
 */
function loadTokens() {
  const out = {}
  for (const file of ['tokens.css', 'brand.css']) {
    const p = path.join(CSS_DIR, file)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    // 逐个块（:root / [data-theme="dark"] / html）扫描
    const blockRe = /([^{}]+)\{/g
    let m
    while ((m = blockRe.exec(text)) !== null) {
      const selector = m[1].trim()
      const start = m.index + m[0].length
      let depth = 1
      let i = start
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth++
        else if (text[i] === '}') depth--
        i++
      }
      const body = text.slice(start, i - 1)
      for (const dm of body.matchAll(/(--[\w-]+)\s*:\s*([\s\S]*?);(?=\s*(?:--[\w-]+\s*:|[^{}]*?$))/g)) {
        const [, name, raw] = dm
        const value = raw.trim().replace(/\s+/g, ' ')
        if (!value) continue
        const g = groupOf(name)
        if (!out[g]) out[g] = {}
        // 同名令牌：浅色块是基础值，深色块是覆盖。**基础值优先**（深色值另行标注），
        // 否则品牌色这类明暗同值的令牌会显示成 dark 覆盖后的那条。
        if (name in out[g] && !out[g][name].includes('dark') && selector.includes('dark')) {
          out[g][name] = `${out[g][name]}   /* dark: ${value} */`
        } else if (!(name in out[g]) || !out[g][name].includes('dark')) {
          out[g][name] = value
        }
      }
    }
  }
  return out
}

const TOKENS = loadTokens()

/* ---------------------------------------------------------------- 组合范式 */
const PATTERNS = [
  {
    id: 'login-form',
    title: '登录表单',
    need: '登录 / 注册 / 找回密码等页面',
    parts: ['FieldInput（type=text）', 'FieldInput（type=password）', 'AlertBox（tone=error）', 'btn--primary（整宽）', 'AlertBox（tone=info，放演示入口说明）'],
    code: `<div class="anx-field">
  <label class="anx-field__label" for="mail">邮箱</label>
  <input id="mail" class="anx-input" type="text" v-model="form.mail" />
  <span class="anx-field__error" v-if="err.mail">{{ err.mail }}</span>
</div>
<button class="anx-btn anx-btn--primary anx-btn--block" @click="submit">登录</button>`,
  },
  {
    id: 'table-with-pager',
    title: '表格 + 分页',
    need: '任何列表页',
    parts: ['PanelBlock', 'anx-table（.anx-table--clickable）', 'usePager', 'TablePager'],
    code: `<div class="anx-pager__size">…</div>
<!-- usePager 负责页码/每页条数/切片；TablePager 只负责渲染与派发事件 -->
<TablePager :total="total" :page="p.page.value" :page-size="p.pageSize.value"
            @update:page="p.page.value = $event"
            @update:page-size="p.pageSize.value = $event" />`,
    notes: [
      '翻页动画要加在**整块容器**上并用 .anx-paged-clip 裁剪；只给 tbody 加 transform 会撑出横向滚动条。',
      '每页条数下拉用 SelectMenu（原生 select 弹出层由系统绘制，无法定制）。',
    ],
  },
  {
    id: 'drawer-form',
    title: '抽屉表单',
    need: '侧边编辑 / 详情查看',
    parts: ['DrawerShell', 'FieldInput', 'SelectMenu', '表单底部按钮组'],
    code: `<!-- 抽屉必须挂在 .anx-overlay-layer 内（承载层提供 z-index:100） -->
<OverlayHost />
<DrawerShell title="编辑应用" @close="close">
  <div class="anx-form-col"> … </div>
  <template #foot>
    <button class="anx-btn anx-btn--ghost" @click="close">取消</button>
    <button class="anx-btn anx-btn--primary" @click="save">保存</button>
  </template>
</DrawerShell>`,
    notes: [
      'index.html 必须提供 <div id="overlay-layer" class="anx-overlay-layer">，否则浮层不显示且无报错。',
      '抽屉只有左侧圆角；宽度用组件默认，不要自己加 border-radius。',
    ],
  },
  {
    id: 'confirm-dialog',
    title: '确认弹窗',
    need: '删除 / 下架 / 撤销等不可逆操作',
    parts: ['confirmDialog（overlay/manager）', 'AlertBox（tone=danger）'],
    code: `const ok = await confirmDialog({
  title: '确认下架应用？',
  desc: '回调地址将立即停用。',
  tone: 'danger',
  confirmText: '确认下架',
})`,
    notes: ['破坏性操作一律 tone=danger；确认按钮文案写动作本身（「确认下架」而不是「确定」）。'],
  },
  {
    id: 'empty-state',
    title: '空状态',
    need: '列表/搜索无结果',
    parts: ['EmptyState', 'btn--primary（主行动）'],
    code: `<EmptyState icon="file" title="还没有应用"
            text="创建第一个应用，开始接入 OAuth 授权">
  <button class="anx-btn anx-btn--primary" @click="create">新建应用</button>
</EmptyState>`,
  },
  {
    id: 'toast-feedback',
    title: '操作反馈',
    need: '保存成功/失败等轻反馈',
    parts: ['toast（lib）', 'ToastHost'],
    code: `import { toast } from './overlay/toast'
toast('ok', '已保存', '偏好设置已更新。')
toast('danger', '保存失败', '回调地址必须为 https。')
toast('info', '已切换到深色主题')`,
    notes: [
      '三态视觉区分在 .anx-toast__icon 的图标颜色上——自绘 toast 必须包含该元素，否则三态看起来一样。',
      'danger 用 role="alert"，其余 role="status"。',
    ],
  },
]

/* ---------------------------------------------------------------- 工具定义 */
const TOOLS = [
  {
    name: 'list_components',
    description:
      '列出 AuthNexus Design 的全部组件与逻辑模块。返回 name / 中文名 / 分组 / 一句话说明。' +
      '写新代码前先调用它，避免用错组件名或自造 class。',
    inputSchema: {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          enum: ['form', 'data', 'display', 'layout', 'nav', 'overlay', 'feedback', 'logic', 'other'],
          description: '按分组过滤',
        },
        keyword: { type: 'string', description: '按名称/说明里的关键词模糊匹配（中文或英文均可）' },
      },
    },
  },
  {
    name: 'get_component',
    description:
      '取单个组件的完整契约：props（类型/必填/默认值）、emits、slots、class 契约、依赖、a11y 约定。' +
      '**用 class 时照抄 classes.asset 列表**，不要自己拼——那是本设计系统唯一的命名空间（anx-）。',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: '组件名，如 SelectMenu / TablePager' } },
      required: ['name'],
    },
  },
  {
    name: 'get_tokens',
    description:
      '取设计令牌的**真实计算值**（颜色/圆角/间距/玻璃/动效/布局/字体）。' +
      '写样式时用它取色值——不要凭记忆写 #1890ff 之类。brand.css 里的是可覆盖的品牌层。',
    inputSchema: {
      type: 'object',
      properties: {
        group: {
          type: 'string',
          enum: ['color', 'radius', 'space', 'glass', 'motion', 'layout', 'font'],
          description: '只取某一组；不传则全给',
        },
        name: { type: 'string', description: '只要某个具体令牌，如 --acid' },
      },
    },
  },
  {
    name: 'search_patterns',
    description:
      '取已验证的组合范式（登录表单 / 表格分页 / 抽屉表单 / 确认弹窗 / 空状态 / 操作反馈）。' +
      '遇到「这类页面怎么搭」的问题先查这里——范式里的铁律都是踩过坑总结的。',
    inputSchema: {
      type: 'object',
      properties: { need: { type: 'string', description: '需求描述关键词，如 登录 / 分页 / 抽屉' } },
    },
  },
]

/* ---------------------------------------------------------------- 工具实现 */
function text(s) {
  return { content: [{ type: 'text', text: typeof s === 'string' ? s : JSON.stringify(s, null, 2) }] }
}

function t_listComponents(args) {
  let items = Object.values(CONTRACTS_CACHE)
  if (args.group) items = items.filter((c) => c.group === args.group)
  if (args.keyword) {
    const k = String(args.keyword).toLowerCase()
    items = items.filter((c) =>
      [c.name, c.label.zh, c.label.en, c.summary.zh, c.group].join(' ').toLowerCase().includes(k))
  }
  items.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
  const lines = items.map(
    (c) => `${c.name.padEnd(20)} ${c.label.zh.padEnd(8)} [${c.group}] ${c.summary.zh}`
  )
  return text(
    `共 ${items.length} 个（用 get_component 取某个的完整契约）\n\n` + lines.join('\n')
  )
}

function t_getComponent(args) {
  const c = CONTRACTS_CACHE[args.name]
  if (!c) {
    return text(`未找到组件「${args.name}」。可用组件见 list_components。`)
  }
  const out = [`# ${c.label.zh} · ${c.name}（${c.group} / ${c.kind}）`, '', c.summary.zh, '']
  if (c.props?.length) {
    out.push('## Props', '', '| 名称 | 类型 | 必填 | 默认 | 说明 |', '|---|---|---|---|---|')
    for (const p of c.props) {
      out.push(
        `| ${p.name} | \`${p.type}\` | ${p.required ? '是' : '否'} | ${p.default ? `\`${p.default}\`` : '—'} | ${p.description || ''} |`
      )
    }
    out.push('')
  }
  if (c.emits?.length) {
    out.push('## Emits', '')
    for (const e of c.emits) out.push(`- \`${e.name}\`${e.payload ? ` — 载荷 \`${e.payload}\`` : ''}`)
    out.push('')
  }
  if (c.slots?.length) {
    out.push('## Slots', '', ...c.slots.map((s) => `- \`${s.name}\``), '')
  }
  if (c.classes?.asset?.length) {
    out.push(
      '## Class 契约（照抄，不要自造）',
      '',
      '资产类：' + c.classes.asset.map((x) => `\`${x}\``).join(' '),
      ''
    )
    if (c.classes.state.length) out.push('状态类（不加前缀）：' + c.classes.state.map((x) => `\`${x}\``).join(' '), '')
  }
  if (c.deps?.length) out.push('## 依赖', '', ...c.deps.map((d) => `- ${d}`), '')
  if (c.exports?.length) out.push('## 导出', '', ...c.exports.map((d) => `- \`${d}\``), '')
  if (c.a11y?.length) out.push('## 无障碍', '', ...c.a11y.map((d) => `- ${d}`), '')
  out.push(`源文件：${c.source}`)
  return text(out.join('\n'))
}

function t_getTokens(args) {
  if (args.name) {
    const key = args.name.startsWith('--') ? args.name : '--' + args.name
    for (const [g, items] of Object.entries(TOKENS)) {
      if (items[key] !== undefined) return text(`${key} = ${items[key]}（分组：${g}）`)
    }
    return text(`未找到令牌 ${key}。可用 get_tokens 不带参数查看全部。`)
  }
  if (args.group) {
    const items = TOKENS[args.group]
    if (!items) return text(`未知分组 ${args.group}`)
    return text(
      Object.entries(items).map(([k, v]) => `${k}: ${v}`).join('\n')
    )
  }
  const out = ['# 设计令牌（浅色主题实测值；深色主题同名令牌在 [data-theme="dark"] 下有覆盖）', '']
  for (const [g, items] of Object.entries(TOKENS)) {
    out.push(`## ${g}`, '')
    for (const [k, v] of Object.entries(items)) out.push(`  ${k}: ${v}`)
    out.push('')
  }
  return text(out.join('\n'))
}

function t_searchPatterns(args) {
  let items = PATTERNS
  if (args.need) {
    const k = String(args.need).toLowerCase()
    const hit = items.filter((p) =>
      [p.id, p.title, p.need, ...p.parts].join(' ').toLowerCase().includes(k)
    )
    if (hit.length) items = hit
  }
  const out = items.map((p) => {
    const s = [`# ${p.title}（${p.id}）`, `适用：${p.need}`, '', '组成：' + p.parts.join(' · '), '', '```html', p.code, '```']
    if (p.notes?.length) s.push('', ...p.notes.map((n) => `⚠ ${n}`))
    return s.join('\n')
  })
  return text(out.join('\n\n---\n\n'))
}

const HANDLERS = {
  list_components: t_listComponents,
  get_component: t_getComponent,
  get_tokens: t_getTokens,
  search_patterns: t_searchPatterns,
}

/* ---------------------------------------------------------------- MCP 协议 */
function handle(msg) {
  const { id, method, params } = msg
  const reply = (result) => ({ jsonrpc: '2.0', id, result })
  const fail = (code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'AuthNexus Design：鉴枢设计系统的 MCP 接口。写前端代码时先 list_components 找组件、' +
          'get_component 取契约（class 照抄契约里的 classes.asset）、get_tokens 取真实色值、' +
          'search_patterns 查已验证范式。',
      })
    case 'notifications/initialized':
    case 'notifications/cancelled':
      return null
    case 'ping':
      return reply({})
    case 'tools/list':
      return reply({ tools: TOOLS })
    case 'tools/call': {
      const fn = HANDLERS[params?.name]
      if (!fn) return fail(-32602, `未知工具 ${params?.name}`)
      try {
        return reply(fn(params.arguments || {}))
      } catch (e) {
        return fail(-32603, String(e && e.message ? e.message : e))
      }
    }
    default:
      return fail(-32601, `未实现的方法 ${method}`)
  }
}

function runStdio() {
  let buf = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => {
    buf += chunk
    let nl
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line) continue
      let msg
      try {
        msg = JSON.parse(line)
      } catch {
        continue
      }
      const out = handle(msg)
      if (out) process.stdout.write(JSON.stringify(out) + '\n')
    }
  })
  process.stderr.write(`[authnexus-design] MCP 已启动：${Object.keys(CONTRACTS_CACHE).length} 份契约、${TOOLS.length} 个工具\n`)
}

/* ---------------------------------------------------------------- 自检 */
async function selftest() {
  let fail = 0
  const check = (cond, label, extra = '') => {
    if (cond) console.log(`  PASS  ${label}`)
    else { fail++; console.log(`  FAIL  ${label}${extra ? ' → ' + extra : ''}`) }
  }
  console.log('MCP Server 自检\n')

  const init = handle({ id: 1, method: 'initialize', params: {} })
  check(init.result?.serverInfo?.name === 'authnexus-design', 'initialize 返回服务信息')
  check(init.result?.protocolVersion === PROTOCOL_VERSION, '协议版本正确')

  const list = handle({ id: 2, method: 'tools/list' })
  check(list.result?.tools?.length === 4, 'tools/list 返回 4 个工具', String(list.result?.tools?.length))

  const all = handle({ id: 3, method: 'tools/call', params: { name: 'list_components', arguments: {} } })
  const allText = all.result.content[0].text
  check(allText.includes('SelectMenu'), 'list_components 列出 SelectMenu')
  check(allText.includes('共 30 个'), '契约数量为 30', allText.split('\n')[0])

  const byGroup = handle({ id: 4, method: 'tools/call', params: { name: 'list_components', arguments: { group: 'overlay' } } })
  check(byGroup.result.content[0].text.includes('ModalShell'), '按分组过滤生效（overlay → ModalShell）')
  check(!byGroup.result.content[0].text.includes('TablePager'), '过滤结果不含其他分组')

  const one = handle({ id: 5, method: 'tools/call', params: { name: 'get_component', arguments: { name: 'SelectMenu' } } })
  const oneText = one.result.content[0].text
  check(oneText.includes('anx-fsel__panel'), 'get_component 返回 class 契约')
  check(oneText.includes('update:modelValue'), 'get_component 返回 emits')
  check(oneText.includes('默认值') || oneText.includes('默认'), 'get_component 返回默认值列')

  const miss = handle({ id: 6, method: 'tools/call', params: { name: 'get_component', arguments: { name: 'NotExist' } } })
  check(miss.result.content[0].text.includes('未找到'), '未知组件给出明确提示')

  const tok = handle({ id: 7, method: 'tools/call', params: { name: 'get_tokens', arguments: { name: '--acid' } } })
  check(tok.result.content[0].text.includes('#78EA57'), 'get_tokens(--acid) 返回真实色值', tok.result.content[0].text)

  const tokAll = handle({ id: 8, method: 'tools/call', params: { name: 'get_tokens', arguments: { group: 'color' } } })
  check(tokAll.result.content[0].text.includes('--ink'), 'get_tokens(color) 返回颜色组')

  const pat = handle({ id: 9, method: 'tools/call', params: { name: 'search_patterns', arguments: { need: '分页' } } })
  const patText = pat.result.content[0].text
  check(patText.includes('TablePager'), 'search_patterns(分页) 命中表格分页范式')
  check(patText.includes('⚠'), '范式带铁律提醒')

  console.log(`\n${fail ? `FAIL: ${fail} 项` : '全部通过'}（契约 ${Object.keys(CONTRACTS_CACHE).length} 份 / 工具 ${TOOLS.length} 个）`)
  process.exit(fail ? 1 : 0)
}

if (process.argv.includes('--selftest')) await selftest()
else runStdio()
