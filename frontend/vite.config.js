import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Isso permite que o contêiner exponha a rede
    port: 5173,
    watch: {
      usePolling: true // Garante que o Hot-Reload funcione perfeitamente no Windows
    }
  }
})
