// 数据同步管理 Store

import { defineStore } from 'pinia'
import type { SyncMetadata, SyncAction, DataConflict } from '@/types'

interface SyncStoreState {
  syncStatus: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncTime: number
  syncError?: string
  localVersion: number
  cloudVersion: number
  offlineQueue: SyncAction[]
  dataConflict?: DataConflict
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncStoreState => ({
    syncStatus: 'idle',
    lastSyncTime: 0,
    syncError: undefined,
    localVersion: 1,
    cloudVersion: 0,
    offlineQueue: [],
    dataConflict: undefined
  }),

  getters: {
    // 是否正在同步
    isSyncing(): boolean {
      return this.syncStatus === 'syncing'
    },

    // 是否可以同步
    canSync(): boolean {
      return this.syncStatus !== 'syncing'
    },

    // 是否有离线操作
    hasOfflineActions(): boolean {
      return this.offlineQueue.length > 0
    },

    // 是否有冲突
    hasConflict(): boolean {
      return this.dataConflict !== undefined
    },

    // 获取离线操作数量
    getOfflineActionCount(): number {
      return this.offlineQueue.length
    },

    // 获取同步元数据
    getSyncMetadata(): SyncMetadata {
      return {
        lastSyncTime: this.lastSyncTime,
        localVersion: this.localVersion,
        cloudVersion: this.cloudVersion,
        jsonboxName: '',
        status: this.syncStatus,
        error: this.syncError
      }
    }
  },

  actions: {
    // 设置同步状态
    setSyncStatus(status: SyncStoreState['syncStatus']) {
      this.syncStatus = status
    },

    // 设置同步错误
    setSyncError(error?: string) {
      this.syncError = error
    },

    // 清除同步错误
    clearSyncError() {
      this.syncError = undefined
    },

    // 更新最后同步时间
    updateLastSyncTime() {
      this.lastSyncTime = Date.now()
    },

    // 增加本地版本
    incrementLocalVersion() {
      this.localVersion++
    },

    // 设置云端版本
    setCloudVersion(version: number) {
      this.cloudVersion = version
    },

    // 添加离线操作
    queueAction(action: SyncAction) {
      this.offlineQueue.push({
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        synced: false
      })
    },

    // 清空离线队列
    clearOfflineQueue() {
      this.offlineQueue = []
    },

    // 标记操作已同步
    markActionSynced(actionId: string) {
      const action = this.offlineQueue.find(a => a.id === actionId)
      if (action) {
        action.synced = true
      }
    },

    // 移除已同步的操作
    removeActionFromQueue(actionId: string) {
      this.offlineQueue = this.offlineQueue.filter(a => a.id !== actionId)
    },

    // 设置数据冲突
    setDataConflict(conflict?: DataConflict) {
      this.dataConflict = conflict
    },

    // 清除数据冲突
    clearDataConflict() {
      this.dataConflict = undefined
    },

    // 重置同步状态
    resetSyncState() {
      this.syncStatus = 'idle'
      this.syncError = undefined
      this.dataConflict = undefined
    }
  }
})
