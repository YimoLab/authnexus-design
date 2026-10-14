import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/* 示例直接引用仓库上层的资产（fonts / css），dev server 的 fs 白名单扩到仓库根 */
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../../', import.meta.url))],
    },
  },
})
