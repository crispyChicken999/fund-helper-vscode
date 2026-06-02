import { useSettingStore, useFundStore } from '@/stores'
import { fundService, groupService, syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { initHolidayData } from '@/utils/holiday'
import { getChinaMarketStatus } from '@/utils/marketChina'
import { getReadyPendingBuys } from '@/services/pendingBuyService'
import { updateThemeColor } from '@/utils/themeColor'

export let initialized = false
let initPromise: Promise<void> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

/** 全局 pending 确认弹窗回调，由 HomeView 注册 */
let pendingCheckCallback: ((readyList: ReturnType<typeof getReadyPendingBuys>) => void) | null = null

export function registerPendingCheckCallback(cb: typeof pendingCheckCallback) {
  pendingCheckCallback = cb
}

export function triggerPendingCheck() {
  const readyList = getReadyPendingBuys()
  if (readyList.length > 0 && pendingCheckCallback) {
    pendingCheckCallback(readyList)
  }
}

export async function initApp(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = (async () => {
      // 等待节假日数据加载完成，确保后续休市判断准确
      await initHolidayData().catch(console.error)

      const settingStore = useSettingStore()
      const fundStore = useFundStore()
      await settingStore.loadFromStorage()

      // 初始化主题色 - 从存储中读取用户的主题设置
      updateThemeColor(settingStore.theme)

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
        const { isClosed, isOpen } = getChinaMarketStatus()

        if (!hasCachedDetails) {
          // 无缓存时无论是否休市都强制刷新一次，确保列表显示基金名称等基本信息
          console.log('[AppInit] 无本地缓存，强制刷新一次基金数据')
          fundService.refreshAllFunds().then(() => triggerPendingCheck()).catch(console.error)
        } else if (isClosed) {
          // 有缓存且当前休市，跳过刷新，直接使用缓存数据
          console.log('[AppInit] 当前休市，跳过自动刷新，使用缓存数据')
          triggerPendingCheck()
        } else {
          // 有缓存且是交易日，立即刷新一次
          console.log('[AppInit] 交易日刚进来刷新一次基金数据')
          fundService.refreshAllFunds().then(() => triggerPendingCheck()).catch(console.error)
        }

        // 只在交易时间段内且用户启用自动刷新时启动定时刷新
        if (isOpen) {
          if (interval > 0) {
            console.log('[AppInit] 当前处于交易时间段，启动定时刷新')
            if (refreshTimer !== null) clearInterval(refreshTimer)
            refreshTimer = setInterval(() => {
              // 每次定时触发时重新判断市场状态
              const { isOpen: nowOpen } = getChinaMarketStatus()
              if (!nowOpen) {
                console.log('[AppInit] 已离开交易时间段，停止定时刷新')
                if (refreshTimer !== null) {
                  clearInterval(refreshTimer)
                  refreshTimer = null
                }
                return
              }
              console.log('[AppInitTimer] 定时刷新基金数据 ' + new Date().toLocaleTimeString())
              fundService.refreshAllFunds().catch(console.error)
            }, interval * 1000)
          } else {
            console.log('[AppInit] 用户未启用自动刷新')
          }
        } else {
          console.log('[AppInit] 当前不在交易时间段，不启动定时刷新')
        }
        console.log('[AppInit] 应用初始化完成')
      }, 100)
    })().finally(() => {
      initPromise = null
    })
  }
  await initPromise
}
