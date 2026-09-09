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
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Solo Firebase: se usa casi en toda la app (login, registro,
          // sesiones), así que vale la pena que Vite lo precargue.
          // chart.js/react-chartjs-2 NO van aquí a propósito: solo los usa
          // AdminReportesScreen (carga diferida). Nombrarlos como chunk
          // manual hacía que Vite emitiera un <link rel="modulepreload">
          // para ellos en el index.html, forzando su descarga (182 KB) en
          // TODAS las páginas —incluida el Inicio público— aunque nadie
          // los necesitara ahí. Sin esta entrada, Rollup los deja en su
          // propio chunk automático, ligado solo al import() diferido de
          // esa pantalla, sin precarga global.
          firebase: ['firebase/app', 'firebase/auth'],
        },
      },
    },
  }
})