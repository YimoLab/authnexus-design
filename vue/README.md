# vue/ — 通用组件与工具（Vue 3）

从鉴枢 AuthNexus 摘离的通用组件源码。**迁移 = 复制本目录 + 改 import，禁止重写组件。**

## 组件清单

### ui/（20 个）

**纯 props 驱动（零项目依赖）**
`SelectMenu` `TablePager` `TabBar` `SegmentedControl` `FieldInput` `Badge` `AlertBox` `EmptyState` `PanelBlock` `PageHead` `KvList` `StatCard` `TimelineList` `RouteSkeleton` `RouteFade`

**依赖资产内部件（均为相对路径）**

| 组件 | 依赖 |
|---|---|
| `Icon` | `lib/icons`（图标集按项目裁剪 / 增补） |
| `ImagePicker` `CodeBox` | `overlay/toast` |
| `QrCode` | `lib/qr`（外部包 `qrcode-generator`） |
| `UserAvatar` | 无（props 为本地弱类型 `AvatarUser`，任何满足形状的对象可传入） |

### overlay/（浮层体系）

- 组件：`ModalShell` `DrawerShell` `ConfirmDialog` `ToastHost` `OverlayHost` `OverlaySlot`
- 服务：`manager.ts`（`openModal` / `confirmDialog` 统一入口）、`overlayState.ts`、`toast.ts`（`toast()`）
- 接线：在应用根挂载 `<OverlayHost />` 与 `<ToastHost />` 各一次

### lib/

- `usePager.ts` — 表格分页逻辑（配合 `TablePager` 与 `motion.css` 的翻页滑动）
- `theme.ts` — 主题状态与切换（View Transitions 涟漪 / 圆盘兜底；localStorage 键 `authnexus.theme`，index.html 首屏预置脚本需用同键）
- `icons.ts` — 图标集（`iconBody(name)`）
- `qr.ts` — 二维码矩阵生成（纯本地）

## 外部依赖

- `vue` ^3.3+
- `vue-router` ^4（仅 `RouteFade.vue`）
- `qrcode-generator`（仅 `QrCode` / `lib/qr`）

## 样式依赖

本目录不含样式：需配套本级仓库的 `css/`（引入顺序 `fonts → tokens → brand → base → components → motion`）。
交互铁律（浮层 Teleport / 层级 / 键盘 / 动效）见 `docs/BEHAVIOR.md`。
