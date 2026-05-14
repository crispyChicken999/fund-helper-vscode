import { useSettingStore, useFundStore } from '@/stores'
import { fundService, groupService, syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { initHolidayData } from '@/utils/holiday'

let initialized = false
let initPromise: Promise<void> | null = null
let refreshTimerStarted = false

export async function initApp(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = (async () => {
      // 初始化节假日数据（不阻塞主流程）
      initHolidayData().catch(console.error)

      const settingStore = useSettingStore()
      const fundStore = useFundStore()
      await settingStore.loadFromStorage()
      await groupService.initialize()
      await fundService.initialize()
      await syncService.initialize()
      storageService.saveSettings(settingStore.getSettings())

      // 恢复排序配置
      const sortMethod = settingStore.sortMethod
      if (sortMethod && sortMethod !== 'holdingGainRate_desc' && sortMethod !== 'default') {
        const parts = sortMethod.split('_')
        // sortMethod 格式可能是 "field_asc" 或 "field_desc"，field 本身可能含下划线
        // 取最后一段作为 order，其余拼回作为 field
        const order = parts[parts.length - 1] as 'asc' | 'desc'
        const field = parts.slice(0, -1).join('_')
        if (field && (order === 'asc' || order === 'desc')) {
          fundStore.sortConfig = { field, order }
        }
      }

      // Apply grayscale mode to DOM
      document.documentElement.dataset.grayscale = String(settingStore.grayscaleMode)

      initialized = true

      // 数据刷新放到后台执行，不阻塞页面渲染
      const interval = settingStore.refreshInterval
      if (interval > 0) {
        // 延迟 100ms 后开始刷新，让页面先渲染出来
        setTimeout(() => {
          fundService.refreshAllFunds().catch(console.error)
          if (!refreshTimerStarted) {
            refreshTimerStarted = true
            setInterval(() => {
              fundService.refreshAllFunds().catch(console.error)
            }, interval * 1000)
          }
        }, 100)
      }
    })().finally(() => {
      initPromise = null
    })
  }
  await initPromise
}
