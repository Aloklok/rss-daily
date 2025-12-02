// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// 【改】我们不再需要 command，可以直接返回配置对象
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 1. 基本 PWA 配置
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: {
        enabled: false
      },

      // 2. Workbox 缓存策略 (保持不变)
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              cacheableResponse: {
                statuses: [200],
              },
            },
          },
          {
            // Cache daily photos from picsum
            urlPattern: /^https:\/\/picsum\.photos\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'daily-photos-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      // 3. Web App Manifest (保持不变)
      manifest: {
        short_name: 'Briefing Hub',
        name: 'Personal RSS Briefing Hub',
        start_url: '.',
        display: 'standalone',
        theme_color: '#f9fafb',
        background_color: '#ffffff',
        icons: [
          {
            src: 'computer_cat_180.jpeg', // 【重要】确保这个文件在 public 目录下
            sizes: '180x180',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: 'computer_cat.jpeg', // 【重要】确保这个文件在 public 目录下
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: 'computer_cat.jpeg', // 【重要】确保这个文件在 public 目录下
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ],

      },

    }),
  ],
});