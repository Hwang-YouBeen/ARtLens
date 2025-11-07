// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    hmr: false,              // ✅ HMR(웹소켓) 완전히 끔 — 443 바인딩 에러 차단
  },
})