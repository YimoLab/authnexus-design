/* eslint-disable */
/**
 * AuthNexus Design · 逻辑模块类型（从源码提取，请勿手改）
 * ---------------------------------------------------------------------------
 * 本文件由 tools/gen-types.mjs 从 contracts/components/*.json **自动生成**，请勿手改。
 * 改组件请改源码 → 跑 python tools/extract-contracts.py → 跑 node tools/gen-types.mjs
 * 数据源：contracts/schema.json（契约即唯一真相）
 */
import type { VNodeChild, Component, Ref, ComputedRef, InjectionKey } from 'vue'

/* ===== 图标集（icons）· vue/lib/icons.ts ===== */
export declare const ICONS: Record<string, string>
export declare function iconBody(name?: string): string;

/* ===== 浮层命令 API（manager）· vue/overlay/manager.ts ===== */
export interface ConfirmOptions {
  title: string
  desc?: string
  /** danger：确认按钮走红色；默认墨黑主按钮 */
  tone?: 'danger' | 'primary'
  confirmText?: string
  cancelText?: string
  confirmIcon?: string
  /** 补充说明区（用 h() 组合的组件内容，例如提示条、代码块、影响清单） */
  body?: () => VNodeChild
  /** 纯信息提示：只保留一个「知道了」按钮，不出现取消/危险的二选一 */
  infoOnly?: boolean
  dismissible?: boolean
  onConfirm?: (ctx: { close: () => void }) => void
}
/** 通用二次确认对话框 */
export declare function confirmDialog(opts: ConfirmOptions): OverlayHandle;

/* ===== 浮层状态（overlayState）· vue/overlay/overlayState.ts ===== */
export interface OverlayEntry {
  id: number
  kind: 'modal' | 'drawer'
  /* 打开的浮层内容组件（如 EditProfileModal / ConfirmDialog） */
  component: Component
  props: Record<string, unknown>
  dismissible: boolean
  closing: boolean
}
export declare const overlayState: { entries: OverlayEntry[] }
export interface OverlayHandle {
  entry: OverlayEntry
  close: () => void
}
export declare function openModal(
  component: Component,
  props?: Record<string, unknown>,
  options?: { dismissible?: boolean },
): OverlayHandle;
export declare function openDrawer(
  component: Component,
  props?: Record<string, unknown>,
  options?: { dismissible?: boolean },
): OverlayHandle;
export declare function closeEntry(entry: OverlayEntry): void;
export declare function closeTop(): boolean;
export declare function isTopEntry(entry: OverlayEntry): boolean;
export interface OverlayContext {
  entry: OverlayEntry
  close: () => void
}
export declare const OVERLAY_KEY: InjectionKey<OverlayContext>
/** 清空全部浮层（路由切换时兜底） */
export declare function closeAllOverlays(): void;

/* ===== 二维码矩阵（qr）· vue/lib/qr.ts ===== */
export interface QrCodeMatrix {
  /** 模块数（不含静默区），标准取值为 21 + 4k */
  count: number
  /** 静默区宽度（模块数）。QR 规范要求 ≥ 4，这里取 2，其余由展示容器的留白补足 */
  margin: number
  /** 含静默区的边长（模块数） */
  size: number
  /** SVG path：每个模块 1 单位、含静默区偏移，横向连续模块合并成一段 */
  path: string
  viewBox: string
  /** 全图坐标（含静默区）下指定行列是否为深色模块 */
  isDark: (row: number, col: number) => boolean
}
/**
 * 把文本编码为二维码矩阵。
 * 纠错等级固定 M（可恢复约 15%）：屏幕扫码画质高，M 在模块密度与容错之间最均衡。
 */
export declare function qrMatrix(text: string, opts?: { margin?: number }): QrCodeMatrix;

/* ===== 主题（theme）· vue/lib/theme.ts ===== */
export type Theme = 'light' | 'dark'
export declare function currentTheme(): Theme;
export declare function applyTheme(theme: Theme): void;
export declare const themeState: Ref<Theme>
export interface ToggleThemeOptions {
  /** 触发按钮：涟漪以它为圆心。模板里通常传 `$event.currentTarget`（类型是 EventTarget） */
  origin?: EventTarget | Element | null
  /** 不弹「已切换到…」提示（首屏预置等场景） */
  silent?: boolean
}
/** 切换主题（带涟漪过渡）；返回切换后的主题 */
export declare function toggleTheme(opts?: ToggleThemeOptions): Theme;

/* ===== 轻提示（toast）· vue/overlay/toast.ts ===== */
export type ToastTone = 'ok' | 'danger' | 'info'
export interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  text?: string
  duration: number
  closing: boolean
}
export interface ToastOptions {
  tone?: ToastTone
  title: string
  text?: string
  duration?: number
}
export declare const toastState: { items: ToastItem[] }
export declare function dismissToast(id: number): void;
export declare function toast(opts: string | ToastOptions): () => void;

/* ===== 分页逻辑（usePager）· vue/lib/usePager.ts ===== */
export interface Pager<T> {
  /** 当前页（1 起） */
  page: Ref<number>
  /** 每页条数 */
  pageSize: Ref<number>
  /** 数据总条数 */
  total: ComputedRef<number>
  /** 总页数（至少 1） */
  pageCount: ComputedRef<number>
  /** 当前页应渲染的切片 */
  paged: ComputedRef<T[]>
  /** 翻页方向：1 = 向后翻（页码变大，内容向左滑出 / 自右滑入），-1 = 向前翻 */
  direction: Ref<1 | -1>
  /** 筛选 / 搜索条件变化时回到第一页 */
  reset: () => void
}
export declare function usePager<T>(source: ComputedRef<T[]>, defaultSize?: number): Pager<T>;
