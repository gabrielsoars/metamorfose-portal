import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://monolito:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/scan-api': {
        target: process.env.VITE_SCAN_PROXY_TARGET || 'http://scan_service:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/scan-api/, ''),
      },
    },
    watch: {
      usePolling: true
    }
  }
})
