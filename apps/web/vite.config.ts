import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // 让 .tsx/.ts 优先于 .js，避免同名 .js 文件遮蔽 .tsx 文件
    extensions: ['.tsx', '.ts', '.jsx', '.mjs', '.js', '.mts', '.json'],
  },
  server: {
    proxy: {
      // 所有 /api/* 请求统一代理到单一 Worker（端口 8787）
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
