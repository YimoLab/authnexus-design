/* eslint-disable */
/**
 * AuthNexus Design · Vue 3 组件类型
 * ---------------------------------------------------------------------------
 * 本文件由 tools/gen-types.mjs 从 contracts/components/*.json **自动生成**，请勿手改。
 * 改组件请改源码 → 跑 python tools/extract-contracts.py → 跑 node tools/gen-types.mjs
 * 数据源：contracts/schema.json（契约即唯一真相）
 */
import type { DefineComponent, VNodeChild, Component } from 'vue'

export interface FieldOption {
  value: string
  label: string
}

/** 描述列表行：[标签, 值] 或 [标签, HTML 值, true] */
export type KvRow = [string, string] | [string, string, boolean]


/* ===== data ===== */
/** 代码框 —— 等宽代码块 + 一键复制 */
export interface CodeBoxProps {
  value: string
  wrap?: boolean
  copy?: boolean
}
export declare const CodeBox: DefineComponent<CodeBoxProps>

/** KV 列表 —— 键值对列表 */
export interface KvListProps {
  rows: KvRow[]; tight?: boolean
}
export declare const KvList: DefineComponent<KvListProps>

/** 统计块 —— 指标卡：标签 / 数值 / 涨跌 */
export interface StatCardProps {
  label: string
  value: string
  unit?: string
  delta?: string
  deltaTone?: 'up' | 'down'
}
export interface StatCardSlots {
  delta(): unknown
}
export declare const StatCard: DefineComponent<StatCardProps>

/** 分页条 —— 总数 + 每页条数 + 页码，整块滑动过渡 */
export interface TablePagerProps {
  total: number
  page: number
  pageSize: number
  sizes?: number[]
}
export interface TablePagerEmits {
  (e: 'update:page', payload: number): void
  (e: 'update:pageSize', payload: number): void
}
export declare const TablePager: DefineComponent<TablePagerProps, TablePagerEmits>

/* ===== display ===== */
/** 提示条 —— info / ok / warn / danger 四种语气 */
export interface AlertBoxProps {
  tone?: 'info' | 'ok' | 'warn' | 'danger' | 'plain'
  title?: string
  text?: string
  lines?: string[]
}
export declare const AlertBox: DefineComponent<AlertBoxProps>

/** 徽记 —— 小圆角状态标签 */
export interface BadgeProps {
  text: string
  tone?: string
  icon?: string
}
export declare const Badge: DefineComponent<BadgeProps>

/** 空状态 —— 空列表占位：图标 + 文案 + 动作 */
export interface EmptyStateProps {
  icon?: string
  title: string
  text?: string
}
export interface EmptyStateSlots {
  actions(): unknown
  text(): unknown
}
export declare const EmptyState: DefineComponent<EmptyStateProps>

/** 图标 —— 24 视框内联 SVG 图标组件 */
export interface IconProps {
  name: string
  size?: number
  stroke?: number
}
export declare const Icon: DefineComponent<IconProps>

/** 二维码 —— 无依赖二维码渲染 */
export interface QrCodeProps {
  text: string
  label?: string
  size?: number
}
export declare const QrCode: DefineComponent<QrCodeProps>

/** 时间线 —— 竖向动态流 */
export interface TimelineListProps {
  items: TimelineItem[]
}
export declare const TimelineList: DefineComponent<TimelineListProps>

/** 用户头像 —— 图片 / 首字母回退，支持三档尺寸 */
export interface UserAvatarProps {
  user?: AvatarUser | null
  size?: '' | 'sm' | 'lg'
}
export declare const UserAvatar: DefineComponent<UserAvatarProps>

/* ===== feedback ===== */
/** 骨架屏 —— 无 props */
export type RouteSkeletonProps = Record<string, never>
export declare const RouteSkeleton: DefineComponent<RouteSkeletonProps>

/* ===== form ===== */
/** 输入框 —— 输入框 / 文本域 / 下拉三态合一 */
export interface FieldInputProps {
  modelValue?: string
  label?: string
  type?: 'text' | 'email' | 'password' | 'search' | 'url' | 'number' | 'textarea' | 'select'
  id?: string
  name?: string
  required?: boolean
  placeholder?: string
  hint?: string
  error?: string
  mono?: boolean
  rows?: number
  options?: FieldOption[]
  autocomplete?: string
  spellcheck?: boolean
  disabled?: boolean
  inputmode?: 'text' | 'numeric' | 'email' | 'url'
  ariaLabel?: string
}
export interface FieldInputEmits {
  (e: 'update:modelValue', payload: string): void
}
export interface FieldInputSlots {
  hint(): unknown
}
export declare const FieldInput: DefineComponent<FieldInputProps, FieldInputEmits>

/** 图片选择器 —— 点击选图 → 中心裁剪 → dataURL */
export interface ImagePickerProps {
  modelValue?: string | null
  variant?: 'avatar' | 'icon'
  size?: number
  hint?: string
}
export interface ImagePickerEmits {
  (e: 'update:modelValue', payload: string | null): void
}
export declare const ImagePicker: DefineComponent<ImagePickerProps, ImagePickerEmits>

/** 分段开关 —— 2–4 个互斥选项，选中项以滑块平移 */
export interface SegmentedControlProps {
  modelValue: string
  options: FieldOption[]
}
export interface SegmentedControlEmits {
  (e: 'update:modelValue', payload: string): void
}
export declare const SegmentedControl: DefineComponent<SegmentedControlProps, SegmentedControlEmits>

/** 下拉选择 —— 自绘 listbox 取代原生 <select>；键盘/翻转/先设宽再测量 */
export interface SelectMenuProps {
  modelValue?: string
  options?: FieldOption[]
  id?: string
  placeholder?: string
  disabled?: boolean
  ariaLabel?: string
  compact?: boolean
}
export interface SelectMenuEmits {
  (e: 'update:modelValue', payload: string): void
}
export declare const SelectMenu: DefineComponent<SelectMenuProps, SelectMenuEmits>

/* ===== layout ===== */
/** 页面头 —— 标题 / 描述 / 右侧动作 */
export interface PageHeadProps {
  title: string
  desc?: string
}
export interface PageHeadSlots {
  actions(): unknown
  desc(): unknown
}
export declare const PageHead: DefineComponent<PageHeadProps>

/** 面板 —— 带标题栏的内容面板 */
export interface PanelBlockProps {
  title?: string
  subtitle?: string
  tight?: boolean
}
export interface PanelBlockSlots {
  actions(): unknown
  foot(): unknown
}
export declare const PanelBlock: DefineComponent<PanelBlockProps>

/** 路由过渡 —— 无 props */
export type RouteFadeProps = Record<string, never>
export declare const RouteFade: DefineComponent<RouteFadeProps>

/* ===== nav ===== */
/** 标签栏容器 —— Tabs 的受控包装（v-model + aria 接线） */
export interface TabBarProps {
  active?: string
}
export declare const TabBar: DefineComponent<TabBarProps>

/* ===== overlay ===== */
/** 确认对话框 —— 危险操作二次确认 */
export interface ConfirmDialogProps {
  title: string
  desc?: string
  tone?: 'danger' | 'primary'
  confirmText?: string
  cancelText?: string
  confirmIcon?: string
  body?: () => VNodeChild
  infoOnly?: boolean
  onConfirm?: (ctx: { close: () => void }) => void
}
export declare const ConfirmDialog: DefineComponent<ConfirmDialogProps>

/** 抽屉 —— 右侧贴边抽屉，仅左侧圆角 */
export interface DrawerShellProps {
  title?: string
  desc?: string
}
export interface DrawerShellSlots {
  foot(): unknown
}
export declare const DrawerShell: DefineComponent<DrawerShellProps>

/** 弹窗 —— 液态玻璃弹窗；必须挂在 .anx-overlay-layer 内 */
export interface ModalShellProps {
  title?: string
  desc?: string
  size?: '' | 'sm' | 'lg'
}
export interface ModalShellSlots {
  foot(): unknown
}
export declare const ModalShell: DefineComponent<ModalShellProps>

/** 浮层宿主 —— 无 props */
export type OverlayHostProps = Record<string, never>
export declare const OverlayHost: DefineComponent<OverlayHostProps>

/** 浮层插槽 —— 在 #overlay-layer 内声明式挂载浮层 */
export interface OverlaySlotProps {
  entry: OverlayEntry
}
export declare const OverlaySlot: DefineComponent<OverlaySlotProps>

/** 通知宿主 —— 无 props */
export type ToastHostProps = Record<string, never>
export declare const ToastHost: DefineComponent<ToastHostProps>

/* ===== 公共类型（被组件 props 引用，自源码提取）===== */
export interface TimelineItem {
  tone?: '' | 'ok' | 'warn' | 'danger'
  title: string
  meta: string
}
/** 头像数据：只需这几个字段，任何满足此形状的对象（含字段更宽的实体类型）均可传入 */
interface AvatarUser {
  id?: string | number
  name: string
  initials?: string
  color?: string
  avatar?: string | null
}
export interface OverlayEntry {
  id: number
  kind: 'modal' | 'drawer'
  /* 打开的浮层内容组件（如 EditProfileModal / ConfirmDialog） */
  component: Component
  props: Record<string, unknown>
  dismissible: boolean
  closing: boolean
}
