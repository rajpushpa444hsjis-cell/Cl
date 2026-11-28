import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
import { VitePWA } from 'vite-plugin-pwa';

// 建置时间（UTC+8），显示在设置页最下面
const stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig(({ mode }) => ({
  // 相对路径：之后不论部署到网域根目录或子路径（如 GitHub Pages 的 /Cl/）都能运作
  base: './',
  define: { __BUILD__: JSON.stringify(stamp) },
  // 预览连结版没有 PWA 插件，virtual:pwa-register 换成空的版本
  resolve: {
    alias:
      mode === 'artifact'
        ? [{ find: 'virtual:pwa-register', replacement: decodeURIComponent(new URL('./src/lib/pwa-register-stub.ts', import.meta.url).pathname) }]
        : [],
  },
  plugins: [
    preact(),
    // 预览连结版（--mode artifact）没有 Service Worker，不产生 PWA 文件
    mode !== 'artifact' &&
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '清吉',
        short_name: '清吉',
        description: '每日一卦，掷筊求签',
        lang: 'zh-CN',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
}));
