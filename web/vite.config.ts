import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    host: '0.0.0.0',
    proxy: {
      // 东方财富板块数据（CORS 限制）
      '/api-proxy/bkzj': {
        target: 'https://data.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/bkzj/, '/dataapi/bkzj')
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
