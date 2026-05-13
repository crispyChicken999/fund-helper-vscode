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
    proxy: {
      '/api-proxy/bkzj': {
        target: 'https://data.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/bkzj/, '/dataapi/bkzj')
      },
      '/api-proxy/tiantian': {
        target: 'https://dgs.tiantianfunds.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/tiantian/, '')
      },
      '/api-proxy/eastfund': {
        target: 'https://api.fund.eastmoney.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api-proxy\/eastfund/, ''),
        headers: { Referer: 'https://fundf10.eastmoney.com/' }
      }
    }
  }
})
