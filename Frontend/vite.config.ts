// Ruta: Frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    allowedHosts: ['.ngrok-free.dev']  // solo dominios de ngrok
  },
  build: {
    outDir: 'dist'
  }
})