import React from 'react'
import { createRoot } from 'react-dom/client'

/* 设计系统样式：按 docs/ADOPT.md 的顺序引入（fonts 最先） */
import '../../../fonts/fonts.css'
import '../../../css/tokens.css'
import '../../../css/brand.css'
import '../../../css/base.css'
import '../../../css/components.css'
import '../../../css/motion.css'

/* --------------------------------------------------------------------------
   React 骨架：证明「CSS 层在 React 环境完整可用」。
   交互组件（浮层 / 下拉 / 分页 / 标签栏…）尚未在此实现——按 docs/BEHAVIOR.md
   逐条实现后，用 audit/ 的同一套断言验收（审计是浏览器黑盒，不看框架）。
   -------------------------------------------------------------------------- */

const THEME_KEY = 'authnexus.theme'

function toggleTheme() {
  const root = document.documentElement
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
  root.setAttribute('data-theme', next)
  try { localStorage.setItem(THEME_KEY, next) } catch { /* 隐私模式忽略 */ }
}

const ROWS = [
  { name: '云枢笔记', id: 'app_yunshu', owner: '林知远', calls: '1,284' },
  { name: 'Figma', id: 'app_figma', owner: '何叙', calls: '872' },
]

function App() {
  return (
    <div className="demo-wrap">
      <header className="demo-head">
        <h1 className="t-h2">AuthNexus Design · React 接线骨架</h1>
        <button className="btn btn--ghost btn--sm push" type="button" onClick={toggleTheme}>
          切换主题
        </button>
      </header>

      <div className="alert alert--info" style={{ marginBottom: 24 }}>
        <div className="alert__body">
          <div className="alert__title">CSS 层已就绪</div>
          <div className="alert__text">
            tokens / brand / base / components / motion 全部可用（含明暗双主题与玻璃配方）。
            交互组件请按 docs/BEHAVIOR.md 实现，完成后用 audit/ 验收。
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div>
            <h2>组件样式示例</h2>
            <p>纯 class 驱动，React 直接可用</p>
          </div>
        </div>
        <div className="panel__body">
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
            <button className="btn btn--primary" type="button">主行动</button>
            <button className="btn btn--ghost" type="button">幽灵按钮</button>
            <button className="btn btn--danger" type="button">危险操作</button>
            <span className="badge badge--ok">已上线</span>
            <span className="badge badge--warn">待审核</span>
            <span className="tag tag--scope">读取个人资料<span className="tag__key">profile:read</span></span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>应用</th><th>归属</th><th className="is-num">调用数</th></tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="cell-main">
                        <span className="appicon appicon--letter">{r.name.slice(0, 1)}</span>
                        <div>
                          <div className="cell-title">{r.name}</div>
                          <div className="cell-sub">{r.id}</div>
                        </div>
                      </div>
                    </td>
                    <td>{r.owner}</td>
                    <td className="is-num">{r.calls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="t-sm t-muted" style={{ marginTop: 24 }}>
        接入路径见 docs/ADOPT.md §5（React 项目）；组件清单与 Vue 参考实现见 vue/。
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
