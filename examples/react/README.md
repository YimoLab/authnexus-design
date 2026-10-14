# React 接线骨架

React 项目接入本设计系统的**骨架示例**：证明 CSS 层（tokens / brand / base / components / motion + 字体）在 React 环境完整可用；**交互组件尚未在 React 侧实现**（按规范实现 + 审计验收的路径见下）。

## 运行

```bash
cd examples/react
npm install
npm run dev          # http://127.0.0.1:5175
```

## 接入路径（React 项目）

1. **复制 CSS 资产**：`fonts/` + `css/` 五件套 + 六件套引入顺序（本示例的 `src/main.tsx` 开头即是）；
2. **交互组件按 [docs/BEHAVIOR.md](../../docs/BEHAVIOR.md) 实现**（不为 React 预设实现）：
   - 浮层铁律：Teleport→Portal + fixed + JS 坐标；z-index 层级表
   - 下拉：combobox + aria-activedescendant 键盘、先设 min-width 再测量、data-up 翻转
   - 分页：整块滑动 + `.paged-clip`；标签栏：指示条几何测量
   - ARIA 即样式钩子：`aria-selected` / `aria-pressed` 等设错样式就不生效
3. **验收**：用 [audit/](../../audit/README.md) 的同一套断言（浏览器黑盒，不看框架）；
   视觉对照 [gallery/](../../gallery/) 与鉴枢页面；
4. 在项目 README 记录来源版本（如 `authnexus-design v0.1.0`）。

> Vue 参考实现（`vue/`）与 React 实现应保持行为一致——审计通过即「一模一样」。
