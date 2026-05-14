// 数据同步服务

import { useFundStore, useGroupStore, useSettingStore, useSyncStore } from '@/stores'
import { jsonboxApi, type JsonboxData } from '@/api/jsonbox'
import { storageService } from './storageService'
import type { DataConflict } from '@/types'

/**
 * 数据同步服务
 */
class SyncService {
  /**
   * 初始化同步服务
   */
  async initialize(): Promise<void> {
    const settingStore = useSettingStore()
    const syncStore = useSyncStore()
    
    // 设置JSONBox ID
    if (settingStore.jsonboxName) {
      jsonboxApi.setBoxId(settingStore.jsonboxName)
    }
    
    // 加载同步元数据
    const syncMeta = storageService.loadSyncMeta()
    if (syncMeta) {
      syncStore.localVersion = syncMeta.localVersion
      syncStore.cloudVersion = syncMeta.cloudVersion
      syncStore.lastSyncTime = syncMeta.lastSyncTime
    }
    
    console.log('同步服务已初始化')
  }

  /**
   * 同步到云端
   */
  async syncToCloud(): Promise<void> {
    const fundStore = useFundStore()
    const groupStore = useGroupStore()
    const settingStore = useSettingStore()
    const syncStore = useSyncStore()
    
    if (!settingStore.jsonboxName) {
      throw new Error('请先配置JSONBox名称')
    }
    
    try {
      syncStore.setSyncStatus('syncing')
      syncStore.clearSyncError()
      
      // 设置Box ID
      jsonboxApi.setBoxId(settingStore.jsonboxName)
      
      // 先读取云端已有数据，保留 VSCode 专属字段（hideStatusBar, defaultViewMode, jsonboxName）
      let vscodeFields: Record<string, any> = {}
      try {
        const existing = await jsonboxApi.read()
        if (existing) {
          const preserveKeys = ['hideStatusBar', 'defaultViewMode', 'jsonboxName']
          for (const key of preserveKeys) {
            if ((existing as any)[key] !== undefined) {
              vscodeFields[key] = (existing as any)[key]
            }
          }
        }
      } catch {
        // 读取失败不影响上传
      }
      
      // 准备数据 — 保持与 VSCode 导出格式一致
      const { groups, groupOrder } = groupStore.exportGroupsToObject()
      
      // funds 只保留 code/num/cost（与 VSCode 格式一致）
      const cleanFunds = fundStore.funds.map(f => ({
        code: f.code,
        num: String(f.num),
        cost: String(f.cost)
      }))
      
      const settings = settingStore.getSettings()
      
      const data: JsonboxData = {
        funds: cleanFunds as any,
        groups,
        groupOrder,
        columnSettings: {
          columnOrder: settings.columnOrder,
          visibleColumns: settings.visibleColumns
        },
        sortMethod: settings.sortMethod,
        refreshInterval: settings.refreshInterval,
        privacyMode: settings.privacyMode,
        grayscaleMode: settings.grayscaleMode,
        // 保留 VSCode 专属字段
        ...vscodeFields,
        version: syncStore.localVersion,
        lastModified: Date.now()
      } as any
      
      // 上传到云端
      await jsonboxApi.write(data)
      
      // 更新同步状态
      syncStore.setCloudVersion(syncStore.localVersion)
      syncStore.updateLastSyncTime()
      syncStore.setSyncStatus('success')
      
      // 保存同步元数据
      this.saveSyncMetadata()
      
      console.log('数据已同步到云端')
    } catch (error: any) {
      console.error('同步到云端失败:', error)
      syncStore.setSyncStatus('error')
      syncStore.setSyncError(error.message)
      throw error
    }
  }

  /**
   * 从云端同步
   */
  async syncFromCloud(): Promise<void> {
    const settingStore = useSettingStore()
    const syncStore = useSyncStore()
    
    if (!settingStore.jsonboxName) {
      throw new Error('请先配置JSONBox名称')
    }
    
    try {
      syncStore.setSyncStatus('syncing')
      syncStore.clearSyncError()
      
      // 设置Box ID
      jsonboxApi.setBoxId(settingStore.jsonboxName)
      
      // 从云端读取数据
      const data = await jsonboxApi.read()
      
      if (!data) {
        throw new Error('云端没有数据')
      }
      
      // 检查版本冲突
      if (data.version < syncStore.localVersion) {
        // 云端版本较旧，提示冲突
        const conflict: DataConflict = {
          type: 'version_mismatch',
          localVersion: syncStore.localVersion,
          cloudVersion: data.version,
          localData: this.getLocalData(),
          cloudData: data,
          timestamp: Date.now()
        }
        syncStore.setDataConflict(conflict)
        syncStore.setSyncStatus('error')
        syncStore.setSyncError('检测到数据冲突，请选择使用哪个版本')
        return
      }
      
      // 应用云端数据
      await this.applyCloudData(data)
      
      // 更新同步状态
      syncStore.setCloudVersion(data.version)
      syncStore.localVersion = data.version
      syncStore.updateLastSyncTime()
      syncStore.setSyncStatus('success')
      
      // 保存同步元数据
      this.saveSyncMetadata()
      
      console.log('数据已从云端同步')
    } catch (error: any) {
      console.error('从云端同步失败:', error)
      syncStore.setSyncStatus('error')
      syncStore.setSyncError(error.message)
      throw error
    }
  }

  /**
   * 完整同步（双向）
   */
  async fullSync(): Promise<void> {
    const syncStore = useSyncStore()
    
    try {
      // 先从云端读取
      const data = await jsonboxApi.read()
      
      if (!data) {
        // 云端没有数据，直接上传
        await this.syncToCloud()
        return
      }
      
      // 比较版本
      if (data.version > syncStore.localVersion) {
        // 云端较新，下载
        await this.syncFromCloud()
      } else if (data.version < syncStore.localVersion) {
        // 本地较新，上传
        await this.syncToCloud()
      } else {
        // 版本相同，更新时间
        syncStore.updateLastSyncTime()
        syncStore.setSyncStatus('success')
        this.saveSyncMetadata()
      }
    } catch (error: any) {
      console.error('完整同步失败:', error)
      throw error
    }
  }

  /**
   * 解决冲突
   */
  async resolveConflict(strategy: 'local' | 'cloud'): Promise<void> {
    const syncStore = useSyncStore()
    
    if (!syncStore.dataConflict) {
      throw new Error('没有数据冲突')
    }
    
    try {
      if (strategy === 'local') {
        // 使用本地版本，上传到云端
        await this.syncToCloud()
      } else {
        // 使用云端版本，下载到本地
        const data = syncStore.dataConflict.cloudData as JsonboxData
        await this.applyCloudData(data)
        syncStore.setCloudVersion(data.version)
        syncStore.localVersion = data.version
        syncStore.updateLastSyncTime()
        this.saveSyncMetadata()
      }
      
      // 清除冲突
      syncStore.clearDataConflict()
      syncStore.setSyncStatus('success')
      
      console.log(`冲突已解决，使用${strategy === 'local' ? '本地' : '云端'}版本`)
    } catch (error: any) {
      console.error('解决冲突失败:', error)
      throw error
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    const settingStore = useSettingStore()
    
    if (!settingStore.jsonboxName) {
      throw new Error('请先配置JSONBox名称')
    }
    
    try {
      jsonboxApi.setBoxId(settingStore.jsonboxName)
      return await jsonboxApi.testConnection()
    } catch (error) {
      console.error('连接测试失败:', error)
      return false
    }
  }

  /**
   * 检查Box是否存在
   */
  async checkBoxExists(): Promise<boolean> {
    const settingStore = useSettingStore()
    
    if (!settingStore.jsonboxName) {
      return false
    }
    
    try {
      jsonboxApi.setBoxId(settingStore.jsonboxName)
      return await jsonboxApi.exists()
    } catch (error) {
      console.error('检查Box失败:', error)
      return false
    }
  }

  /**
   * 重置Box（清空云端数据）
   */
  async resetBox(): Promise<void> {
    const settingStore = useSettingStore()
    
    if (!settingStore.jsonboxName) {
      throw new Error('请先配置JSONBox名称')
    }
    
    try {
      jsonboxApi.setBoxId(settingStore.jsonboxName)
      await jsonboxApi.clear()
      console.log('Box已重置')
    } catch (error: any) {
      console.error('重置Box失败:', error)
      throw error
    }
  }

  /**
   * 获取本地数据
   */
  private getLocalData(): JsonboxData {
    const fundStore = useFundStore()
    const groupStore = useGroupStore()
    const settingStore = useSettingStore()
    const syncStore = useSyncStore()
    
    const { groups, groupOrder } = groupStore.exportGroupsToObject()
    const settings = settingStore.getSettings()
    
    // funds 只保留 code/num/cost（与 VSCode 格式一致）
    const cleanFunds = fundStore.funds.map(f => ({
      code: f.code,
      num: String(f.num),
      cost: String(f.cost)
    }))
    
    return {
      funds: cleanFunds as any,
      groups,
      groupOrder,
      columnSettings: {
        columnOrder: settings.columnOrder,
        visibleColumns: settings.visibleColumns
      },
      sortMethod: settings.sortMethod,
      refreshInterval: settings.refreshInterval,
      privacyMode: settings.privacyMode,
      grayscaleMode: settings.grayscaleMode,
      version: syncStore.localVersion,
      lastModified: Date.now()
    } as any
  }

  /**
   * 应用云端数据
   */
  private async applyCloudData(data: JsonboxData): Promise<void> {
    const fundStore = useFundStore()
    const groupStore = useGroupStore()
    const settingStore = useSettingStore()
    
    // 清空现有数据
    fundStore.clearFunds()
    groupStore.clearGroups()
    
    // 应用基金数据
    data.funds.forEach(fund => {
      fundStore.funds.push(fund)
    })
    
    // 应用分组数据
    groupStore.initGroupsFromObject(data.groups, data.groupOrder)
    
    // 应用设置
    if (data.settings) {
      await settingStore.updateSettings(data.settings)
    }
    
    // 保存到本地存储
    storageService.saveFunds(fundStore.funds)
    storageService.saveGroups(data.groups, data.groupOrder)
    storageService.saveSettings(settingStore.getSettings())
    
    console.log('云端数据已应用')
  }

  /**
   * 保存同步元数据
   */
  private saveSyncMetadata(): void {
    const settingStore = useSettingStore()
    const syncStore = useSyncStore()
    
    storageService.saveSyncMeta({
      lastSyncTime: syncStore.lastSyncTime,
      localVersion: syncStore.localVersion,
      cloudVersion: syncStore.cloudVersion,
      jsonboxName: settingStore.jsonboxName,
      status: syncStore.syncStatus,
      error: syncStore.syncError
    })
  }

  /**
   * 获取最后同步时间
   */
  getLastSyncTime(): number {
    const syncStore = useSyncStore()
    return syncStore.lastSyncTime
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): string {
    const syncStore = useSyncStore()
    return syncStore.syncStatus
  }
}

// 导出单例
export const syncService = new SyncService()
