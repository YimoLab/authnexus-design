/* ==========================================================================
   AuthNexus Design · 浮层状态（弹窗 / 抽屉）
   命令式 API：openModal(Component, props, options)。
   打开的组件内部使用 ModalShell / DrawerShell 渲染外壳与内容，
   通过注入的 overlay 上下文拿到 close() 与 entry 状态。
   业务方从 './manager' 统一导入（含 confirmDialog）。
   ========================================================================== */

import { markRaw, reactive } from 'vue'
import type { Component, InjectionKey } from 'vue'

export interface OverlayEntry {
  id: number
  kind: 'modal' | 'drawer'
  /* 打开的浮层内容组件（如 EditProfileModal / ConfirmDialog） */
  component: Component
  props: Record<string, unknown>
  dismissible: boolean
  closing: boolean
}

export const overlayState = reactive<{ entries: OverlayEntry[] }>({ entries: [] })

let seq = 0

export interface OverlayHandle {
  entry: OverlayEntry
  close: () => void
}

function push(
  kind: OverlayEntry['kind'],
  component: Component,
  props: Record<string, unknown> = {},
  options: { dismissible?: boolean } = {},
): OverlayHandle {
  const entry: OverlayEntry = {
    id: ++seq,
    kind,
    component: markRaw(component),
    props,
    dismissible: options.dismissible !== false,
    closing: false,
  }
  overlayState.entries.push(entry)
  return { entry, close: () => closeEntry(entry) }
}

export function openModal(
  component: Component,
  props: Record<string, unknown> = {},
  options: { dismissible?: boolean } = {},
): OverlayHandle {
  return push('modal', component, props, options)
}

export function openDrawer(
  component: Component,
  props: Record<string, unknown> = {},
  options: { dismissible?: boolean } = {},
): OverlayHandle {
  return push('drawer', component, props, options)
}

export function closeEntry(entry: OverlayEntry) {
  if (entry.closing) return
  entry.closing = true
  setTimeout(() => {
    const i = overlayState.entries.indexOf(entry)
    if (i >= 0) overlayState.entries.splice(i, 1)
  }, 190)
}

export function closeTop() {
  const top = overlayState.entries[overlayState.entries.length - 1]
  if (top && top.dismissible) closeEntry(top)
  return !!top
}

export function isTopEntry(entry: OverlayEntry) {
  return overlayState.entries[overlayState.entries.length - 1] === entry
}

/* 注入上下文：ModalShell / DrawerShell / 内容组件共用 */
export interface OverlayContext {
  entry: OverlayEntry
  close: () => void
}

export const OVERLAY_KEY: InjectionKey<OverlayContext> = Symbol('authnexus-overlay')

/* Esc 关闭最上层浮层（不影响组件的其它键盘处理） */
if (typeof document !== 'undefined') {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return
      const top = overlayState.entries[overlayState.entries.length - 1]
      if (top && top.dismissible) {
        e.preventDefault()
        closeEntry(top)
      }
    },
    true,
  )
}

/* --------------------------------------------------------------------------
   清空
   -------------------------------------------------------------------------- */

/** 清空全部浮层（路由切换时兜底） */
export function closeAllOverlays() {
  overlayState.entries.slice().forEach((entry) => closeEntry(entry))
}
