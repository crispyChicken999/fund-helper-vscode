import { useSettingStore, useFundStore } from '@/stores'
import { fundService, groupService, syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { initHolidayData } from '@/utils/holiday'
import { getChinaMarketStatus } from '@/utils/marketChina'

let initialized = false
let initPromise: Promise<void> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

export async function initApp(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = (async () => {
      // 等待节假日数据加载完成，确保后续休市判断准确
      await initHolidayData().catch(console.error)

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

      // 判断是否有本地缓存数据
      const cache = storageService.loadFundDetailsCache()
      const hasCachedDetails = Object.keys(cache).length > 0

      const interval = settingStore.refreshInterval

      // 延迟 100ms 后执行，让页面先渲染出来
      setTimeout(() => {
        const { isClosed } = getChinaMarketStatus()

        if (!hasCachedDetails) {
          // 无缓存时无论是否休市都强制刷新一次，确保列表显示基金名称等基本信息
          console.log('[AppInit] 无本地缓存，强制刷新一次基金数据')
          fundService.refreshAllFunds().catch(console.error)
        } else if (isClosed) {
          // 有缓存且当前休市，跳过刷新，直接使用缓存数据
          console.log('[AppInit] 当前休市，跳过自动刷新，使用缓存数据')
        } else {
          // 有缓存且开市，立即刷新一次
          fundService.refreshAllFunds().catch(console.error)
        }

        // 只在开市状态下启动定时刷新
        if (!isClosed && interval > 0 && refreshTimer === null) {
          refreshTimer = setInterval(() => {
            // 每次定时触发时重新判断市场状态，避免开市期间跨越到休市后继续刷新
            const { isClosed: nowClosed } = getChinaMarketStatus()
            if (nowClosed) {
              console.log('[AppInit] 市场已休市，停止定时刷新')
              if (refreshTimer !== null) {
                clearInterval(refreshTimer)
                refreshTimer = null
              }
              return
            }
            fundService.refreshAllFunds().catch(console.error)
          }, interval * 1000)
        }
      }, 100)
    })().finally(() => {
      initPromise = null
    })
  }
  await initPromise
}
