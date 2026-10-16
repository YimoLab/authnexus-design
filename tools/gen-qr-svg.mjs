#!/usr/bin/env node
/* ============================================================================
   AuthNexus Design · 生成画廊演示用的静态二维码 SVG
   ----------------------------------------------------------------------------
   从 vue/lib/qr.ts（真实算法）产出——保证画廊里的二维码与组件运行时渲染的是
   同一份矩阵，而不是随便贴的一张图。改 qr.ts 后重跑本命令即可刷新。

   前置：`npm i`（qrcode-generator 是 qr.ts 的运行时依赖）
   用法：
     node --experimental-strip-types tools/gen-qr-svg.mjs [文本] [边长]
   产物打印到 stdout；粘贴进 gallery/index.html 的 #demo-qr 区块。
   ============================================================================ */
import { qrMatrix } from '../vue/lib/qr.ts'

const text = process.argv[2] || 'https://github.com/YimoLab/authnexus-design'
const size = Number(process.argv[3] || 176)
const qr = qrMatrix(text)

console.log(
  `<svg width="${size}" height="${size}" viewBox="${qr.viewBox}" role="img" aria-label="二维码：${text}" shape-rendering="crispEdges"><rect width="${qr.size}" height="${qr.size}" fill="#ffffff"/><path d="${qr.path}" fill="#111111"/></svg>`
)
