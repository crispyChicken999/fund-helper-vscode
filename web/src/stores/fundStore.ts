// 基金数据管理 Store

import { defineStore } from 'pinia'
import type { Fund, FundInfo, FundView, SortConfig } from '@/types'
import {
  calculateHoldingGain,
  calculateHoldingGainRate,
  calculateDailyGain,
  calculateEstimatedGain,
  calculateEstimatedChange,
  calculateTotalAsset,
  calculateTotalHoldingGain,
  calculateTotalDailyGain,
  calculateAverageGainRate
} from '@/utils/calc'

interface FundStoreState {
  // 数据
  funds: Fund[]
  fundDetails: Map<string, FundInfo>
  
  // UI状态
  selectedGroupKey: string
  selectedFundCode?: string
  
  // 搜索和筛选
  searchQuery: string
  
  // 排序
  sortConfig: SortConfig
}

export const useFundStore = defineStore('fund', {
  state: (): FundStoreState => ({
    funds: [],
    fundDetails: new Map(),
    selectedGroupKey: 'all',
    selectedFundCode: undefined,
    searchQuery: '',
    sortConfig: {
      field: 'holdingGainRate',
      order: 'desc'
    }
  }),

  getters: {
    // 基金数量
    fundCount(): number {
      return this.funds.length
    },

    // 获取基金视图
    getFundView: (state) => (code: string): FundView | undefined => {
      const fund = state.funds.find(f => f.code === code)
      if (!fund) return undefined
      
      const detail = state.fundDetails.get(code)
      if (!detail) return fund as FundView
      
      return {
        ...fund,
        ...detail,
        dailyGain: calculateDailyGain(fund, detail.changeAmount),
        holdingGain: calculateHoldingGain(fund, detail.currentPrice),
        holdingGainRate: calculateHoldingGainRate(fund, detail.currentPrice),
        estimatedGain: calculateEstimatedGain(fund, detail.currentPrice),
        estimatedChange: calculateEstimatedChange(fund, detail.currentPrice)
      }
    },

    // 获取所有基金视图
    getAllFundViews(): FundView[] {
      return this.funds.map(fund => {
        const detail = this.fundDetails.get(fund.code)
        if (!detail) return fund as FundView
        
        return {
          ...fund,
          ...detail,
          dailyGain: calculateDailyGain(fund, detail.changeAmount),
          holdingGain: calculateHoldingGain(fund, detail.currentPrice),
          holdingGainRate: calculateHoldingGainRate(fund, detail.currentPrice),
          estimatedGain: calculateEstimatedGain(fund, detail.currentPrice),
          estimatedChange: calculateEstimatedChange(fund, detail.currentPrice)
        }
      })
    },

    // 资产总值
    getTotalAsset(): number {
      return calculateTotalAsset(this.funds, this.fundDetails)
    },

    // 持有收益总和
    getTotalHoldingGain(): number {
      return calculateTotalHoldingGain(this.funds, this.fundDetails)
    },

    // 日收益总和
    getTotalDailyGain(): number {
      return calculateTotalDailyGain(this.funds, this.fundDetails)
    },

    // 平均收益率
    getAverageGainRate(): number {
      return calculateAverageGainRate(this.funds, this.fundDetails)
    }
  },

  actions: {
    // 添加基金
    async addFund(code: string, num: number, cost: number, groupKey?: string) {
      const existingFund = this.funds.find(f => f.code === code)
      if (existingFund) {
        throw new Error('基金已存在')
      }
      
      this.funds.push({ code, num, cost, groupKey })
    },

    // 更新基金
    async updateFund(code: string, num: number, cost: number, groupKey?: string) {
      const fund = this.funds.find(f => f.code === code)
      if (!fund) {
        throw new Error('基金不存在')
      }
      
      fund.num = num
      fund.cost = cost
      if (groupKey !== undefined) {
        fund.groupKey = groupKey
      }
    },

    // 删除基金
    async deleteFund(code: string) {
      const index = this.funds.findIndex(f => f.code === code)
      if (index === -1) {
        throw new Error('基金不存在')
      }
      
      this.funds.splice(index, 1)
      this.fundDetails.delete(code)
    },

    // 获取基金
    getFund(code: string): Fund | undefined {
      return this.funds.find(f => f.code === code)
    },

    // 获取基金列表
    getFundList(groupKey?: string): Fund[] {
      if (!groupKey || groupKey === 'all') {
        return this.funds
      }
      return this.funds.filter(f => f.groupKey === groupKey)
    },

    // 搜索基金
    searchFunds(query: string): Fund[] {
      if (!query) return this.funds
      
      const lowerQuery = query.toLowerCase()
      return this.funds.filter(fund => {
        const detail = this.fundDetails.get(fund.code)
        return (
          fund.code.includes(lowerQuery) ||
          detail?.name.toLowerCase().includes(lowerQuery)
        )
      })
    },

    // 更新基金详情
    updateFundDetail(code: string, detail: FundInfo) {
      this.fundDetails.set(code, detail)
    },

    // 批量更新基金价格
    updateFundPrices(prices: Map<string, number>) {
      prices.forEach((price, code) => {
        const detail = this.fundDetails.get(code)
        if (detail) {
          detail.currentPrice = price
        }
      })
    },

    // 批量移动基金到分组
    async moveFundsToGroup(fundCodes: string[], groupKey: string) {
      fundCodes.forEach(code => {
        const fund = this.funds.find(f => f.code === code)
        if (fund) {
          fund.groupKey = groupKey
        }
      })
    },

    // 清空所有基金
    clearFunds() {
      this.funds = []
      this.fundDetails.clear()
    },

    // 设置排序配置
    setSortConfig(field: string, order: 'asc' | 'desc') {
      this.sortConfig = { field, order }
    },

    // 设置选中的分组
    setSelectedGroupKey(groupKey: string) {
      this.selectedGroupKey = groupKey
    },

    // 设置搜索查询
    setSearchQuery(query: string) {
      this.searchQuery = query
    }
  }
})
