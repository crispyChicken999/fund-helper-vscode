import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import router from './router'
import './style.css'

// 导入服务
import { fundService, groupService, syncService } from './services'
import { useSettingStore } from './stores'
import { storageService } from './services/storageService'

const app = createApp(App)

// 初始化Pinia
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// 应用启动后初始化数据
app.mount('#app')

// 异步初始化数据
;(async () => {
  try {
    // 加载设置
    const settingStore = useSettingStore()
    const savedSettings = storageService.loadSettings()
    if (savedSettings) {
      await settingStore.updateSettings(savedSettings)
    }
    
    // 初始化同步服务
    await syncService.initialize()
    
    // 初始化分组
    await groupService.initialize()
    
    // 初始化基金
    await fundService.initialize()
    
    // 刷新基金数据
    if (settingStore.refreshInterval > 0) {
      await fundService.refreshAllFunds()
      
      // 设置自动刷新
      setInterval(() => {
        fundService.refreshAllFunds().catch(console.error)
      }, settingStore.refreshInterval * 1000)
    }
    
    console.log('应用初始化完成')
  } catch (error) {
    console.error('应用初始化失败:', error)
  }
})()

