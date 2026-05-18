/**
 * PWA 服务 - 管理 Service Worker、缓存和离线功能
 */

import { ElNotification, ElMessage } from 'element-plus'

export interface PWAConfig {
  enableNotifications?: boolean
  enableOfflineWarning?: boolean
  checkUpdateInterval?: number // 毫秒
}

class PWAService {
  private isOnline = navigator.onLine
  private updateSW: ((showPrompt?: boolean | undefined) => Promise<void>) | null = null
  private config: Required<PWAConfig> = {
    enableNotifications: true,
    enableOfflineWarning: true,
    checkUpdateInterval: 60 * 60 * 1000 // 1小时
  }

  /**
   * 初始化 PWA 服务
   */
  public init(updateSwFn: (showPrompt?: boolean | undefined) => Promise<void>, config?: PWAConfig) {
    this.updateSW = updateSwFn
    this.config = { ...this.config, ...config }

    this.setupNetworkListener()
    this.setupUpdateChecker()
    // 注意：beforeinstallprompt 事件已在 src/utils/pwa.ts 中全局处理
    // 此处不再重复监听
    this.logPWAStatus()
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListener() {
    window.addEventListener('online', () => {
      this.isOnline = true
      if (this.config.enableOfflineWarning) {
        ElMessage.success({
          message: '网络已连接',
          duration: 2000
        })
      }
      console.log('✓ Back online')
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      if (this.config.enableOfflineWarning) {
        ElMessage.warning({
          message: '网络已断开，将使用离线模式',
          duration: 3000
        })
      }
      console.log('✗ Offline')
    })
  }

  /**
   * 设置自动更新检查
   */
  private setupUpdateChecker() {
    if ('serviceWorker' in navigator) {
      setInterval(() => {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => {
            registration.update()
          })
        })
      }, this.config.checkUpdateInterval)
    }
  }

  /**
   * 显示更新通知
   */
  public showUpdateNotification() {
    if (!this.config.enableNotifications) return

    ElNotification({
      title: '新版本可用',
      message: '检测到应用新版本，点击此处立即更新',
      type: 'success',
      duration: 0, // 不自动关闭
      onClick: () => {
        this.applyUpdate()
      },
      onClose: () => {
        // 用户关闭通知，继续使用旧版本
        console.log('Update notification dismissed')
      }
    })
  }

  /**
   * 应用更新
   */
  public async applyUpdate() {
    if (this.updateSW) {
      try {
        await this.updateSW()
        ElMessage.success('更新成功，页面即将刷新')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } catch (error) {
        ElMessage.error('更新失败，请稍后重试')
        console.error('Update failed:', error)
      }
    }
  }

  /**
   * 检测 PWA 安装状态
   */
  public isInstalledAsPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true
  }

  /**
   * 获取在线状态
   */
  public getOnlineStatus(): boolean {
    return this.isOnline
  }

  /**
   * 获取 PWA 支持情况
   */
  public getPWASupport() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      caches: 'caches' in window,
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      offlineReady: 'serviceWorker' in navigator && 'caches' in window
    }
  }

  /**
   * 清除所有缓存
   */
  public async clearAllCaches(): Promise<void> {
    try {
      // 清除 Service Worker 缓存
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        console.log('✓ All caches cleared')
      }

      // 清除 IndexedDB
      if ('indexedDB' in window) {
        const databases = await (indexedDB as any).databases?.() || []
        databases.forEach((db: { name: string }) => {
          indexedDB.deleteDatabase(db.name)
        })
        console.log('✓ IndexedDB cleared')
      }

      ElMessage.success('缓存已清除')
    } catch (error) {
      ElMessage.error('清除缓存失败')
      console.error('Clear cache error:', error)
    }
  }

  /**
   * 获取缓存大小
   */
  public async getCacheSize(): Promise<number> {
    let size = 0

    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        size = estimate.usage || 0
      }
    } catch (error) {
      console.error('Get cache size error:', error)
    }

    return size
  }

  /**
   * 注销所有 Service Worker
   */
  public async unregisterAllServiceWorkers(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map(reg => reg.unregister()))
        console.log('✓ All Service Workers unregistered')
        ElMessage.success('Service Worker已注销，请刷新页面')
      } catch (error) {
        console.error('Unregister error:', error)
        ElMessage.error('注销失败')
      }
    }
  }

  /**
   * 记录 PWA 状态
   */
  private logPWAStatus() {
    const support = this.getPWASupport()
    const isPWA = this.isInstalledAsPWA()

    console.group('📱 PWA Status')
    console.log('Installed as PWA:', isPWA)
    console.log('Support:', support)
    console.log('Online:', this.isOnline)
    console.groupEnd()
  }
}

export const pwaService = new PWAService()
