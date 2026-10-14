# Vue 接线示例

最小可运行的 Vue 3 + Vite 示例：**直接引用仓库资产**（`../../fonts`、`../../css`、`../../vue`），演示接线方式与组件用法。

## 运行

```bash
cd examples/vue
npm install
npm run dev          # http://127.0.0.1:5174
```

## 演示了什么

| 主题 | 看点 |
|---|---|
| 样式接入 | `src/main.ts` 按序引入六件套（fonts → tokens → brand → base → components → motion） |
| 分页表格 | `usePager` + `TablePager` + `.paged-clip` + 方向感知滑动过渡（翻页看左右滑动） |
| 下拉 / 分段 | 真组件 `SelectMenu`（键盘、上翻、定位）与 `SegmentedControl`（滑块平移） |
| 浮层 | `confirmDialog`（命令式确认框）与 `openDrawer`（自定义内容组件 + `DrawerShell`） |
| 通知 | `toast()` 三种语气 |
| 主题 | `toggleTheme({ origin })` 涟漪切换（右上角 ◐ 按钮）；index.html 首屏预置防闪 |
| 宿主 | `index.html` 提供 `#overlay-layer` / `#toast-layer` 两个 Teleport 容器（必需），应用根挂 `<OverlayHost />` 与 `<ToastHost />` 各一次 |

## 接到你自己项目里

复制 `fonts/`、`css/`、`vue/` 到项目内（如 `src/design/`），然后按
[docs/ADOPT.md](../../docs/ADOPT.md) 的 5 步接入；组件行为与坑见 [docs/BEHAVIOR.md](../../docs/BEHAVIOR.md)。
