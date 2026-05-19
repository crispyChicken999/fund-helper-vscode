import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import './style.css'

// PWA 全局监听 - 必须最先导入，以便捕获 beforeinstallprompt 事件
import '@/utils/pwa'

// PWA 服务
import { pwaService } from '@/services/pwaService'
import { initThemeColor } from '@/utils/themeColor'

// vite-plugin-pwa 的自动注册
import { registerSW } from 'virtual:pwa-register'

const app = createApp(App)

// 初始化Pinia
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')

// 注册 Service Worker，自动检查更新
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('✓ New PWA version available!')
    pwaService.showUpdateNotification()
  },
  onOfflineReady() {
    console.log('✓ App ready to work offline!')
  },
})

// 初始化 PWA 服务
pwaService.init(updateSW, {
  enableNotifications: true,
  enableOfflineWarning: true,
  checkUpdateInterval: 60 * 60 * 1000 // 每小时检查一次更新
})

// 初始化主题色为默认值（应用启动时的初始值）
initThemeColor('light')

// 导出更新函数供外部使用
export { updateSW, pwaService }