// Ruta: Frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Desactivado en `npm run dev` a propósito: el Service Worker solo
      // se genera en el build de producción, para no interferir mientras
      // se programa/prueba localmente.
      devOptions: { enabled: false },
      registerType: 'autoUpdate', // se actualiza solo en cada deploy, nunca queda "atascado" en una versión vieja
      includeAssets: ['DL.ico', 'favicon.ico'],
      manifest: {
        name: 'Joyería Diana Laura',
        short_name: 'Diana Laura',
        description: 'Joyería y bisutería premium — catálogo, pedidos y apartados en línea.',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precachea únicamente los archivos estáticos del build (JS, CSS,
        // imágenes, íconos) — ya vienen con hash de Vite, así que cada
        // deploy invalida solo lo que cambió.
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Nunca cachear llamadas a la API: precios, stock, carrito, login
        // y pedidos siempre se piden frescos al servidor, sin excepción.
        // También se excluye cualquier URL con extensión de archivo
        // (manifest.webmanifest, pwa-512.png, robots.txt, etc.) para que
        // abrirlas directo en el navegador sirva el archivo real y no la
        // pantalla de "404" de la app (el "app shell" solo debe aplicar a
        // rutas de navegación de React, no a archivos estáticos).
        navigateFallbackDenylist: [/^\/api\//, /\.[a-zA-Z0-9]+$/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
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
