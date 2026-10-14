import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/* 示例直接引用仓库上层的资产（fonts / css / vue），
   需要把允许访问的根扩到仓库根目录（dev server 的 fs 白名单） */
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL('../../', import.meta.url))],
    },
  },
})
