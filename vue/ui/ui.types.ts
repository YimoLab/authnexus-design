/* AuthNexus Design · UI 原语共用类型 */

export interface FieldOption {
  value: string
  label: string
}

/** 描述列表行：[标签, 值] 或 [标签, HTML 值, true] */
export type KvRow = [string, string] | [string, string, boolean]
