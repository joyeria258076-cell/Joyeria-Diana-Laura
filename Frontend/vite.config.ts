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
        // Estrategias de caché en tiempo de ejecución (además del precache,
        // que funciona como Cache Only para los archivos del build):
        runtimeCaching: [
          // Network First: catálogo y contenido público (GET). Si hay
          // internet se pide fresco; si no, se muestra lo último guardado.
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              /\/api\/(products|content)(\/|$|\?)/.test(url.pathname) &&
              !url.pathname.includes('/resenas'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-publica',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Network Only: el resto de la API (login, carrito, pedidos,
          // apartados, admin). Nunca se guarda en caché.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          // Cache First: imágenes de Cloudinary (no cambian una vez subidas).
          {
            urlPattern: ({ url }) => url.hostname === 'res.cloudinary.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'imagenes-cloudinary',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Stale-While-Revalidate: hojas de estilo de Google Fonts.
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          // Cache First: archivos de fuente (woff2), versionados por Google.
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-archivos',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
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
