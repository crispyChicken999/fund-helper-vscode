// 分组管理 Store

import { defineStore } from 'pinia'
import type { Group } from '@/types'

interface GroupStoreState {
  groups: Map<string, Group>
  groupOrder: string[]
}

export const useGroupStore = defineStore('group', {
  state: (): GroupStoreState => ({
    groups: new Map(),
    groupOrder: []
  }),

  getters: {
    // 分组数量
    groupCount(): number {
      return this.groups.size
    },

    // 获取分组名称
    getGroupName: (state) => (key: string): string => {
      return state.groups.get(key)?.name || ''
    },

    // 获取分组列表
    getGroupList(): Group[] {
      return this.groupOrder
        .map(key => this.groups.get(key))
        .filter(Boolean) as Group[]
    },

    // 根据基金代码获取分组
    getGroupsByFund: (state) => (fundCode: string): Group[] => {
      return Array.from(state.groups.values()).filter(group =>
        group.fundCodes.includes(fundCode)
      )
    }
  },

  actions: {
    // 添加分组
    async addGroup(name: string, color?: string): Promise<string> {
      // 检查名称是否已存在
      const existingGroup = Array.from(this.groups.values()).find(g => g.name === name)
      if (existingGroup) {
        throw new Error('分组名称已存在')
      }
      
      // 生成唯一key
      const key = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const group: Group = {
        key,
        name,
        fundCodes: [],
        color,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      
      this.groups.set(key, group)
      this.groupOrder.push(key)
      
      return key
    },

    // 更新分组
    async updateGroup(key: string, name: string, color?: string) {
      const group = this.groups.get(key)
      if (!group) {
        throw new Error('分组不存在')
      }
      
      // 检查新名称是否与其他分组重复
      const existingGroup = Array.from(this.groups.values()).find(
        g => g.name === name && g.key !== key
      )
      if (existingGroup) {
        throw new Error('分组名称已存在')
      }
      
      group.name = name
      if (color !== undefined) {
        group.color = color
      }
      group.updatedAt = Date.now()
    },

    // 删除分组
    async deleteGroup(key: string) {
      const group = this.groups.get(key)
      if (!group) {
        throw new Error('分组不存在')
      }
      
      this.groups.delete(key)
      this.groupOrder = this.groupOrder.filter(k => k !== key)
    },

    // 获取分组
    getGroup(key: string): Group | undefined {
      return this.groups.get(key)
    },

    // 添加基金到分组
    async addFundToGroup(fundCode: string, groupKey: string) {
      const group = this.groups.get(groupKey)
      if (!group) {
        throw new Error('分组不存在')
      }
      
      if (!group.fundCodes.includes(fundCode)) {
        group.fundCodes.push(fundCode)
        group.updatedAt = Date.now()
      }
    },

    // 从分组中移除基金
    async removeFundFromGroup(fundCode: string, groupKey: string) {
      const group = this.groups.get(groupKey)
      if (!group) {
        throw new Error('分组不存在')
      }
      
      group.fundCodes = group.fundCodes.filter(code => code !== fundCode)
      group.updatedAt = Date.now()
    },

    // 重新排序分组
    async reorderGroups(newOrder: string[]) {
      // 验证所有key都存在
      const allValid = newOrder.every(key => this.groups.has(key))
      if (!allValid) {
        throw new Error('包含无效的分组key')
      }
      
      this.groupOrder = newOrder
    },

    // 获取分组的基金列表
    getGroupFunds(key: string): string[] {
      const group = this.groups.get(key)
      return group ? group.fundCodes : []
    },

    // 清空所有分组
    clearGroups() {
      this.groups.clear()
      this.groupOrder = []
    },

    // 从对象初始化分组（用于从存储加载）
    initGroupsFromObject(groupsObj: Record<string, string[]>, order?: string[]) {
      this.groups.clear()
      this.groupOrder = []
      
      Object.entries(groupsObj).forEach(([name, fundCodes]) => {
        const key = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const group: Group = {
          key,
          name,
          fundCodes,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        this.groups.set(key, group)
        this.groupOrder.push(key)
      })
      
      if (order && order.length > 0) {
        this.groupOrder = order
      }
    },

    // 导出为对象格式（用于存储）
    exportGroupsToObject(): { groups: Record<string, string[]>, groupOrder: string[] } {
      const groupsObj: Record<string, string[]> = {}
      
      this.groups.forEach(group => {
        groupsObj[group.name] = group.fundCodes
      })
      
      return {
        groups: groupsObj,
        groupOrder: this.groupOrder
      }
    }
  }
})
