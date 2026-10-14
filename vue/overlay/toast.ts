/* ==========================================================================
   AuthNexus Design · 全局通知（Toast）
   ========================================================================== */

import { reactive } from 'vue'

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

export const toastState = reactive<{ items: ToastItem[] }>({ items: [] })

let seq = 0

export function dismissToast(id: number) {
  const item = toastState.items.find((t) => t.id === id)
  if (!item || item.closing) return
  item.closing = true
  setTimeout(() => {
    const i = toastState.items.findIndex((t) => t.id === id)
    if (i >= 0) toastState.items.splice(i, 1)
  }, 170)
}

export function toast(opts: string | ToastOptions): () => void {
  const o: ToastOptions = typeof opts === 'string' ? { title: opts } : opts
  const item: ToastItem = {
    id: ++seq,
    tone: o.tone || 'info',
    title: o.title || '',
    text: o.text,
    duration: o.duration ?? 4600,
    closing: false,
  }
  toastState.items.push(item)
  setTimeout(() => dismissToast(item.id), item.duration)
  return () => dismissToast(item.id)
}
