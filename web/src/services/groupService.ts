// 分组业务逻辑服务

import { useGroupStore, useFundStore } from '@/stores'
import { storageService } from './storageService'

/**
 * 分组服务
 */
class GroupService {
  /**
   * 初始化 - 从本地存储加载数据
   */
  async initialize(): Promise<void> {
    const groupStore = useGroupStore()
    
    // 加载分组数据
    const { groups, groupOrder } = storageService.loadGroups()
    
    // 初始化到store
    groupStore.initGroupsFromObject(groups, groupOrder)
    
    // Sync fund groupKey based on group membership
    this.syncFundGroupKeys()
    
    console.log(`已加载 ${Object.keys(groups).length} 个分组`)
  }

  /**
   * 添加分组
   */
  async addGroup(name: string, color?: string): Promise<string> {
    const groupStore = useGroupStore()
    
    // 添加到store
    const key = await groupStore.addGroup(name, color)
    
    // 保存到本地存储
    this.saveGroups()
    
    return key
  }

  /**
   * 更新分组
   */
  async updateGroup(key: string, name: string, color?: string): Promise<void> {
    const groupStore = useGroupStore()
    
    // 更新store
    await groupStore.updateGroup(key, name, color)
    
    // 保存到本地存储
    this.saveGroups()
  }

  /**
   * 删除分组
   */
  async deleteGroup(key: string): Promise<void> {
    const groupStore = useGroupStore()
    
    // 从store删除
    await groupStore.deleteGroup(key)
    
    // 保存到本地存储
    this.saveGroups()
  }

  /**
   * 添加基金到分组
   */
  async addFundToGroup(fundCode: string, groupKey: string): Promise<void> {
    const groupStore = useGroupStore()
    
    // 添加到store
    await groupStore.addFundToGroup(fundCode, groupKey)
    
    // 保存到本地存储
    this.saveGroups()
  }

  /**
   * 从分组中移除基金
   */
  async removeFundFromGroup(fundCode: string, groupKey: string): Promise<void> {
    const groupStore = useGroupStore()
    
    // 从store移除
    await groupStore.removeFundFromGroup(fundCode, groupKey)
    
    // 保存到本地存储
    this.saveGroups()
  }

  /**
   * 重新排序分组
   */
  async reorderGroups(newOrder: string[]): Promise<void> {
    const groupStore = useGroupStore()
    
    // 更新store
    await groupStore.reorderGroups(newOrder)
    
    // 保存到本地存储
    this.saveGroups()
  }

  /**
   * 保存分组数据到本地存储
   */
  private saveGroups(): void {
    const groupStore = useGroupStore()
    const { groups, groupOrder } = groupStore.exportGroupsToObject()
    storageService.saveGroups(groups, groupOrder)
  }

  /**
   * 同步基金分组 membership（group.fundCodes 与 Fund.groupKey）
   */
  async syncFundGroupMembership(
    fundCode: string,
    previousGroupKey: string | undefined,
    nextGroupKey: string | undefined
  ): Promise<void> {
    const groupStore = useGroupStore()
    if (previousGroupKey && previousGroupKey !== nextGroupKey) {
      // 检查分组是否存在，存在才移除（防止分组已删除导致错误）
      if (groupStore.getGroup(previousGroupKey)) {
        await groupStore.removeFundFromGroup(fundCode, previousGroupKey)
      }
    }
    if (nextGroupKey && nextGroupKey !== previousGroupKey) {
      // 检查分组是否存在，存在才添加
      if (groupStore.getGroup(nextGroupKey)) {
        await groupStore.addFundToGroup(fundCode, nextGroupKey)
      }
    }
    this.saveGroups()
  }

  /**
   * Sync fund groupKey based on group membership (group.fundCodes)
   */
  syncFundGroupKeys(): void {
    const groupStore = useGroupStore()
    const fundStore = useFundStore()
    
    // Build a code -> groupKey map from all groups
    const codeToGroupKey = new Map<string, string>()
    for (const group of groupStore.getGroupList) {
      for (const code of group.fundCodes) {
        codeToGroupKey.set(code, group.key)
      }
    }
    
    // Apply to funds
    for (const fund of fundStore.funds) {
      const groupKey = codeToGroupKey.get(fund.code)
      fund.groupKey = groupKey
    }
  }

  /**
   * 获取分组的基金数量
   */
  getGroupFundCount(groupKey: string): number {
    const groupStore = useGroupStore()
    const group = groupStore.getGroup(groupKey)
    return group ? group.fundCodes.length : 0
  }
}

// 导出单例
export const groupService = new GroupService()
