// 本地存储服务

import type { Fund, Settings, SyncMetadata } from '@/types'

// 存储键名
const STORAGE_KEYS = {
  FUNDS: 'fund_helper_funds',
  GROUPS: 'fund_helper_groups',
  GROUP_ORDER: 'fund_helper_group_order',
  SETTINGS: 'fund_helper_settings',
  SYNC_META: 'fund_helper_sync_meta',
  FUND_DETAILS_CACHE: 'fund_helper_fund_details_cache'
}

export const FUND_HELPER_BOX_NAME_KEY = 'fund_helper_box_name'

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'

function randomId(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ID_CHARS[bytes[i]! % ID_CHARS.length]
  }
  return out
}

/**
 * 保证本地存在 JSONBox 名称：优先读 fund_helper_box_name；无则迁移旧 settings 或生成 fh_ + 随机串。
 */
export function ensureBoxName(): string {
  let name = localStorage.getItem(FUND_HELPER_BOX_NAME_KEY)
  if (!name) {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      const parsed = raw ? (JSON.parse(raw) as { jsonboxName?: string }) : null
      const legacy = parsed?.jsonboxName
      if (legacy && /^[a-zA-Z0-9_-]{20,64}$/.test(legacy)) {
        name = legacy
      }
    } catch {
      /* ignore */
    }
    if (!name) {
      name = `fh_${randomId(21)}`
    }
    localStorage.setItem(FUND_HELPER_BOX_NAME_KEY, name)
  }
  return name
}

/**
 * 本地存储服务
 */
class StorageService {
  /**
   * 保存基金列表
   */
  saveFunds(funds: Fund[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FUNDS, JSON.stringify(funds))
    } catch (error) {
      console.error('保存基金列表失败:', error)
      throw new Error('本地存储空间不足')
    }
  }

  /**
   * 读取基金列表
   */
  loadFunds(): Fund[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FUNDS)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('读取基金列表失败:', error)
      return []
    }
  }

  /**
   * 保存分组数据
   */
  saveGroups(groups: Record<string, string[]>, groupOrder: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups))
      localStorage.setItem(STORAGE_KEYS.GROUP_ORDER, JSON.stringify(groupOrder))
    } catch (error) {
      console.error('保存分组数据失败:', error)
      throw new Error('本地存储空间不足')
    }
  }

  /**
   * 读取分组数据
   */
  loadGroups(): { groups: Record<string, string[]>, groupOrder: string[] } {
    try {
      const groupsData = localStorage.getItem(STORAGE_KEYS.GROUPS)
      const orderData = localStorage.getItem(STORAGE_KEYS.GROUP_ORDER)
      
      return {
        groups: groupsData ? JSON.parse(groupsData) : {},
        groupOrder: orderData ? JSON.parse(orderData) : []
      }
    } catch (error) {
      console.error('读取分组数据失败:', error)
      return { groups: {}, groupOrder: [] }
    }
  }

  /**
   * 保存设置
   */
  saveSettings(settings: Settings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch (error) {
      console.error('保存设置失败:', error)
      throw new Error('本地存储空间不足')
    }
  }

  /**
   * 读取设置
   */
  loadSettings(): Settings | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('读取设置失败:', error)
      return null
    }
  }

  /**
   * 保存同步元数据
   */
  saveSyncMeta(meta: SyncMetadata): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_META, JSON.stringify(meta))
    } catch (error) {
      console.error('保存同步元数据失败:', error)
    }
  }

  /**
   * 读取同步元数据
   */
  loadSyncMeta(): SyncMetadata | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_META)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('读取同步元数据失败:', error)
      return null
    }
  }

  /**
   * 保存基金详情缓存
   */
  saveFundDetailsCache(cache: Record<string, any>): void {
    try {
      localStorage.setItem(STORAGE_KEYS.FUND_DETAILS_CACHE, JSON.stringify(cache))
    } catch (error) {
      console.error('保存基金详情缓存失败:', error)
    }
  }

  /**
   * 读取基金详情缓存
   */
  loadFundDetailsCache(): Record<string, any> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FUND_DETAILS_CACHE)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('读取基金详情缓存失败:', error)
      return {}
    }
  }

  /**
   * 清空所有数据
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo(): { used: number, total: number, percentage: number } {
    let used = 0
    
    Object.values(STORAGE_KEYS).forEach(key => {
      const item = localStorage.getItem(key)
      if (item) {
        used += item.length
      }
    })
    
    // localStorage通常限制为5MB
    const total = 5 * 1024 * 1024
    const percentage = (used / total) * 100
    
    return { used, total, percentage }
  }
}

// 导出单例
export const storageService = new StorageService()
