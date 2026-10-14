/* ==========================================================================
   AuthNexus Design · 浮层统一入口
   业务代码从这里导入：openModal / openDrawer / confirmDialog / closeAllOverlays。
   ========================================================================== */

import type { VNodeChild } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { openModal } from './overlayState'

export * from './overlayState'

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
export function confirmDialog(opts: ConfirmOptions) {
  return openModal(ConfirmDialog, opts as unknown as Record<string, unknown>, {
    dismissible: opts.dismissible !== false,
  })
}
