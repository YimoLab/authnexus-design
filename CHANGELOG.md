# Changelog

本资产的变更记录。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本遵循语义化版本；发布时打 tag。

## [Unreleased]

### Fixed

- `vue/overlay/ToastHost.vue`：tone 状态类补 `anx-` 前缀（`toast--ok` → `anx-toast--ok`），
  修复三种 tone 的图标颜色不生效。
- `docs/ADOPT.md`、`docs/BEHAVIOR.md`、`examples/vue/index.html`：浮层与 Toast 承载层类名
  补 `anx-` 前缀（`overlay-layer` → `anx-overlay-layer`、`toast-layer` → `anx-toast-layer`）。
  按旧文档接入会丢失承载层的 `position: fixed / inset / z-index`，导致浮层层级与遮罩失效。
- `mcp/server.mjs`：`search_patterns` 的 toast 示例改为真实签名
  （`toast(string | opts)`），此前写成三参数形式会误导调用方。
- 同步修正 `audit/audit-select.mjs`、`demo/admin/index.html`、`gallery/index.html`
  中的旧类名引用。

### Added

- 补建本 `CHANGELOG.md`（`ADOPT.md` 已引用但此前缺失）。

## [0.1.0] - 2026-10-14

### Added

- CSS 令牌、品牌层、基础样式、组件配方、动效、中后台外壳（`css/`，单入口 `css/index.css`）。
- 自托管字体：Albert Sans（可变）、IBM Plex Mono（SIL OFL 1.1）。
- Vue 3 组件与逻辑：`vue/ui/`、`vue/overlay/`、`vue/lib/`。
- 组件契约（`contracts/`）、TS 类型生成、官网构建与组件详情页。
- MCP Server（`list_components` / `get_component` / `get_tokens` / `search_patterns`）。
- 静态样式画廊（`gallery/`）、中后台演示（`demo/admin/`）、接线示例（`examples/`）。
- 浏览器黑盒审计（`audit/`）与 usage lint（`tools/lint-usage.mjs`）。
