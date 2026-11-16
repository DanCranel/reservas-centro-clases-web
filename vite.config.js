import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

const API = process.env.API_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt', // el usuario decide cuándo actualizar (no se recarga a mitad de un formulario)
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Reservas · Centro de Clases Paute',
        short_name: 'Reservas Paute',
        description: 'Reserva clases de tareas, recuperación y programación en el Centro de Clases Paute.',
        lang: 'es-EC',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#f4f6fa',
        theme_color: '#1f4e8c',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell precacheado: la interfaz abre sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Catálogo público: se muestra al instante desde caché y se actualiza en segundo plano.
            urlPattern: ({ url, request }) => url.pathname === '/api/servicios' && request.method === 'GET',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-servicios',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Datos personales (sesión, reservas, comprobantes): NUNCA se guardan en caché.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    // Mismo origen en desarrollo: la cookie de sesión funciona sin CORS.
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/socket.io': { target: API, ws: true, changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: API, changeOrigin: true },
      '/socket.io': { target: API, ws: true, changeOrigin: true },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.js'],
  },
});
