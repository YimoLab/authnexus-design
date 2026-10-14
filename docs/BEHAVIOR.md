# BEHAVIOR.md — 交互规范与铁律

> 用途：**跨框架保真的契约**。Vue 组件（`vue/`）是第一参考实现；React 或其他框架按本规范实现，
> 用 `audit/`（浏览器黑盒审计）验收——审计不看框架，只看行为与像素。
> 每条尽量给出「为什么」与反例；只抄结论会在边界场景翻车。

---

## 1. 浮层铁律（最高优先级）

### 1.1 浮层必须「Teleport 挂 body + position: fixed + JS 计算坐标」

- **为什么**：任何渲染 `backdrop-filter` 的祖先都会成为后代的 backdrop root——挂在内部时，
  磨砂只能采样该祖先内部的内容（等于没有模糊），玻璃退化成「背景透明」。
- **做法**：面板 `position: fixed`，`left/top/minWidth` 由 JS 按触发器 `getBoundingClientRect()` 计算。
- **反例**：把下拉面板放进 `.topbar`（玻璃祖先）内部用 `position: absolute`。
- 涉及：`SelectMenu`、下拉菜单（`.menu__panel`）、所有弹层。

### 1.2 z-index 层级表（不得插队）

| 层 | z-index |
|---|---|
| 玻璃顶栏（sticky） | 30 |
| 玻璃侧栏 | 40 |
| 浮层菜单（menu__panel） | 60 |
| overlay 层（弹窗 / 抽屉 / scrim） | 100 |
| 下拉面板（fsel__panel，需盖住弹窗内容） | 160 |
| Toast | 200 |
| 主题涟漪 | 300 |

> **承载层**：弹窗 / 抽屉 / scrim 自身不设 z-index——它们必须放进 `.overlay-layer`
> （`position: fixed; inset: 0; z-index: 100; pointer-events: none`，子元素自动恢复事件）
> 内部才拿到 100 层。直接挂 body 的浮层只有 `z-index: auto`，会被顶栏(30) / 侧栏(40) 反压：
> 表现为 scrim 压不暗顶栏、抽屉顶部被顶栏盖住、被遮内容与浮层层级错乱（静态页与
> Vue 的 OverlayHost 都走这个承载层）。

### 1.3 定位算法要点（以 SelectMenu 为范本）

- **水平**：与触发器左对齐 → 视口两侧 8px 收敛。
- **垂直**：默认向下、留 6px 间隙；下方不足且上方够 → 向上翻转（`data-up="true"`，
  位移方向与 transform-origin 同步翻转）；上方也不够 → 贴底收敛。
- **先设 min-width 再测量**：面板宽度受「不小于触发器宽度」约束；不先对齐会量到偏小宽度，
  视口收敛计算错误、向右溢出。
- 首次定位完成前 `visibility: hidden`，避免在 (0,0) 闪一帧。
- 面板打开期间监听 window scroll（capture）与 resize，重新定位。
- 键盘高亮项保持在可视区：**自己算 panel.scrollTop 偏移**，不要 `scrollIntoView`（会连祖先一起滚）。

### 1.4 关闭动画与 scrim

- 关闭：挂 `.is-closing` 类播放反向动画（时长 `calc(var(--t) * .7)`），动画结束再移除节点
  （见 `toast.ts` 的 170ms 模式）。
- scrim 只压暗（浅色 `rgba(38,38,38,.38)` / 深色 `rgba(0,0,0,.58)`）、**不模糊**——
  模糊由面板自身的 backdrop-filter 一级完成；遮罩先糊一层会把透出内容抹平，玻璃失去层次。

## 2. 玻璃配方（--glass-*）

- 导航/顶栏/侧栏用 `--glass-bg` + blur/saturate/brightness 三件套 + `--glass-line` + `--glass-shadow`。
- 浮层面板用 `--glass-panel-*`（更实底、更强亮度补偿、带 sheen 受光渐变）。
- 降级已由 `tokens.css` 实现：`@supports not (backdrop-filter)` 与
  `prefers-reduced-transparency: reduce` 时退不透明面并撤模糊。
- **可读性只认像素采样**：DOM 审计（读计算样式）感知不到 backdrop 的实际合成结果——
  玻璃上文字对比度必须用截图采样像素验证。

## 3. 下拉选择（SelectMenu）

- **禁用原生 `<select>`**（弹出层由系统绘制，样式与动效无法对齐设计系统）。
- 触发器为 `role="combobox"` 的按钮；**焦点始终留在按钮上**，高亮项经 `aria-activedescendant` 播报。
- 键盘：关闭态 `↓ ↑ Enter Space` 打开；打开态 `↓ ↑` 循环移动、`Home/End` 两端、
  `Enter/Space` 选中、`Esc` 关闭并回焦按钮、`Tab` 收起（走默认 Tab 顺序）。
- 鼠标选择后焦点还给按钮；选项 `mousedown.prevent` 防止抢焦点。
- 选项入场错峰 `animationDelay = min(i, 8) * 16ms`；勾选缩放浮现。
- 打开时高亮落在当前选中项；options 变化时收敛高亮下标。

## 4. 分页列表（usePager + TablePager + 滑动过渡）

- 用 `usePager<T>(source, pageSize)`：`page / pageSize / total / pageCount / paged / direction / reset`。
- `direction`（1 向后 / -1 向前）决定过渡类名：`paged-fwd-*` / `paged-back-*`。
- **整块滑动 + 裁剪容器**：外面套 `.paged-clip`（overflow: hidden）。
  反例：只给 `<tbody>` 加 transform——会撑大 `.table-wrap` 的滚动范围、闪出横向滚动条（实测踩坑）。
- 表格行区用 `<tbody :key="page">`；div 行列表用 keyed 容器包住行区域。
- 数据增删导致总页数变小时收敛页码（不回第一页）；筛选/搜索变化调用 `reset()`。
- 每页条数用 `SelectMenu`（`compact` + `.pager__select` 定宽；特异性已处理）。

## 5. 标签栏（TabBar）

- 指示条按「当前 `aria-selected` 子元素」几何测量定位，**不能按份数均分**（选项宽度不等）。
- 首帧只定位不播动画：就位前选中项继续用 border 下划线，`is-ready` 后撤掉（防重影）。
- 容器底线用 `::after` 伪元素：`.tabs` 是横向滚动容器，绝对定位子元素会被 overflow 裁掉。
- 量不到宽度时逐帧重试（隐藏容器 / 字体未加载 / 路由切换首帧），30 帧后降级为无指示条。
- 标签本体由调用方提供（RouterLink / button）；面板切换方向滑动 `tabpane-fwd/back-*`，
  方向 = 目标序号 − 原序号。

## 6. 路由过渡（RouteFade）

- 过渡必须包一个 **keyed 普通 div**：多根节点会导致 leave 卡死、整页空白。
- `<RouteFade><div :key="route.fullPath">…</div></RouteFade>`；类名 `routefade-*`
 （enter 为 opacity + translateY(10px)，leave 只留 opacity 且更快）。

## 7. 主题切换（lib/theme.ts）

- 主方案 View Transitions（Chromium 111+）：真实界面快照 + clip-path 圆形裁剪；
  无 VT 时兜底平色圆盘。
- `toggleTheme({ origin })` **必须传 origin**（触发按钮 `$event.currentTarget`），
  涟漪以它为圆心；漏传退化为瞬时切换。
- `data-vt-mode="expand|shrink"` 控制快照层级；动画结束 `anim.cancel()` 释放 fill 引用。
- 「减少动效」偏好下直接切换；动画期间忽略重复点击（`rippling` 锁）。
- localStorage 键 `authnexus.theme`：**index.html 首屏预置脚本必须同键同值**（light|dark），否则闪主题。

## 8. 动效总则

- 一律使用 `--t`（.18s）与 `--ease`；例外：滑块/指示条平移 .24–.26s、各类关闭 .12–.13s。
- 「减少动效」：`motion.css` 末尾的全局媒体查询统一压缩（.01ms）；JS 驱动动画由 JS 自行跳过。
- 新增过渡类名后，加入项目的 audit-anim 探针白名单（如启用）。

## 9. ARIA 即样式钩子（易错点)

组件的「选中 / 当前」样式绑定在 ARIA 属性上，**实现时必须设对，否则样式不生效**（不是样式漏写）：

- `.tab[aria-selected="true"]`、`.segmented__opt[aria-pressed="true"]`、
  `.sidenav__item[aria-current="page"]`、`.fsel__btn[aria-expanded="true"]` …
- 焦点：全局 `:focus-visible` 焦点环；`:focus:not(:focus-visible)` 不显环。

## 10. 表单与输入细节速查

- 输入控件高 44px、圆角 `--r`、`--bone` 底；focus 为 2px outline（offset 1px）。
- `.input-wrap` 有动作按钮时右侧预留 48px，无按钮（`:has()` 判定）时不预留。
- 原生 checkbox/radio 用 `accent-color: var(--ink)`；开关是自绘 label + 隐藏 input。
- `[hidden] { display: none !important }` 必须保留（否则条件显隐被组件自身 display 压过）。
- 主按钮是墨黑底白字；**酸橙绿按钮（.btn--acid）只留给品牌时刻**（如授权同意）。

## 11. 字体与排版

- 自托管字体（`fonts/`）+ `font-display: swap`；中文走系统字体栈。
- 排版刻度：`t-display / t-h1 / t-h2 / t-h3 / t-body / t-sm / t-xs / t-mono`。
- 等宽体只给技术内容（scope 键、代码、数字）；**中文名一律无衬线**（如 `.tag--scope`）。
