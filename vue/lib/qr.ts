/* ==========================================================================
   AuthNexus Design · 二维码生成（纯本地，密钥绝不外发）
   TOTP 绑定密钥属于敏感信息，**绝不能**用在线二维码服务来生成——这里用
   qrcode-generator 在浏览器/Node 本地把 otpauth 链接编码成模块矩阵，网络层零接触。

   输出不是位图，而是「模块矩阵 + SVG path」：
     · SVG 在任意缩放下都锐利（高分屏不糊、手机相机更容易对焦）；
     · path 每个模块 1 个单位，配合 viewBox 无级缩放；
     · 同色的横向连续模块合并为一条子路径，path 体积可控。
   ========================================================================== */
import qrcode from 'qrcode-generator'

/* 库默认的 stringToBytes 是 Latin-1（charCodeAt & 0xff），非 ASCII 文本会变乱码。
   换成 UTF-8 是官方推荐的扩展点：Byte 模式从此对任意文本都正确
   （当前 otpauth 链接是纯 ASCII，但这行让本模块对任何调用方都安全）。 */
qrcode.stringToBytes = (s: string): number[] => Array.from(new TextEncoder().encode(s))

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
export function qrMatrix(text: string, opts: { margin?: number } = {}): QrCodeMatrix {
  const value = String(text || '')
  if (!value) throw new Error('二维码内容不能为空')
  const margin = Math.max(0, opts.margin ?? 2)

  const qr = qrcode(0, 'M') /* 0 = 按内容自动选择最小版本 */
  qr.addData(value, 'Byte')
  qr.make()
  const count = qr.getModuleCount()

  let d = ''
  for (let row = 0; row < count; row += 1) {
    let col = 0
    while (col < count) {
      if (!qr.isDark(row, col)) {
        col += 1
        continue
      }
      let run = 1
      while (col + run < count && qr.isDark(row, col + run)) run += 1
      d += `M${col + margin} ${row + margin}h${run}v1h-${run}z`
      col += run
    }
  }

  const size = count + margin * 2
  return {
    count,
    margin,
    size,
    path: d,
    viewBox: `0 0 ${size} ${size}`,
    isDark: (row, col) =>
      row >= margin && col >= margin && row < count + margin && col < count + margin
        ? qr.isDark(row - margin, col - margin)
        : false,
  }
}
