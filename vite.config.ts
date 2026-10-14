import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-full.png', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Docket',
        short_name: 'Docket',
        description: 'Private, offline-first tracker for training, nutrition, habits and physique progress',
        start_url: '/',
        scope: '/',
        theme_color: '#0A0D14',
        background_color: '#0A0D14',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webmanifest}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
