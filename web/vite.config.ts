import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-*.png'],
      manifest: {
        name: '基金助手',
        short_name: '基金助手',
        description: '基金投资助手，帮助您管理和分析基金投资',
        theme_color: '#20c997',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-192-maskable.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['finance', 'productivity'],
        screenshots: [
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,woff,woff2,ttf,eot}'],
        runtimeCaching: [
          // API 缓存策略：网络优先，确保数据最新
          {
            urlPattern: /^https:\/\/api\.|^https:\/\/.*\.(api|proxy).*|^\/api-proxy\//i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 基金数据接口
          {
            urlPattern: /^https:\/\/(push2\.eastmoney|data\.eastmoney|fundmobapi\.eastmoney|dgs\.tiantianfunds|api\.fund\.eastmoney)\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'fund-data-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 图片资源：缓存优先
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // 字体资源：缓存优先
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'font-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Google 字体：过期后重新验证
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ],
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      },
      devOptions: {
        enabled: false // 禁用开发环境 PWA，避免缓存干扰调试
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0',
    headers: {
      'Service-Worker-Allowed': '/'
    },
    proxy: {
      // 东方财富板块数据（CORS 限制）
      '/api-proxy/bkzj': {
        target: 'https://data.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/bkzj/, '/dataapi/bkzj'),
        headers: {
          'Referer': 'https://data.eastmoney.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      },
      // fundmobapi 整个域名（来源检测）
      '/api-proxy/fundmob': {
        target: 'https://fundmobapi.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/fundmob/, ''),
        headers: {
          'Referer': 'https://mpservice.com/app',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Origin': ''
        }
      },
      // 天天基金合并接口（需要特定 Origin）
      '/api-proxy/tiantian': {
        target: 'https://dgs.tiantianfunds.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/tiantian/, ''),
        headers: {
          'Origin': 'https://h5.1234567.com.cn',
          'Referer': 'https://h5.1234567.com.cn/'
        }
      },
      // 历史净值接口（需要 Referer）
      '/api-proxy/eastfund': {
        target: 'https://api.fund.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/eastfund/, ''),
        headers: {
          'Referer': 'https://fundf10.eastmoney.com/'
        }
      }
    }
  }
})
