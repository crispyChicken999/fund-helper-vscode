import { useSettingStore } from '@/stores'
import { fundService, groupService, syncService } from '@/services'
import { storageService } from '@/services/storageService'

let initialized = false
let initPromise: Promise<void> | null = null
let refreshTimerStarted = false

export async function initApp(): Promise<void> {
  if (initialized) return
  if (!initPromise) {
    initPromise = (async () => {
      const settingStore = useSettingStore()
      await settingStore.loadFromStorage()
      await groupService.initialize()
      await fundService.initialize()
      await syncService.initialize()
      storageService.saveSettings(settingStore.getSettings())

      // Apply grayscale mode to DOM
      document.documentElement.dataset.grayscale = String(settingStore.grayscaleMode)

      const interval = settingStore.refreshInterval
      if (interval > 0) {
        await fundService.refreshAllFunds().catch(console.error)
        if (!refreshTimerStarted) {
          refreshTimerStarted = true
          setInterval(() => {
            fundService.refreshAllFunds().catch(console.error)
          }, interval * 1000)
        }
      }

      initialized = true
    })().finally(() => {
      initPromise = null
    })
  }
  await initPromise
}
