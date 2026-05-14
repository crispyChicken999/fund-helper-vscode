// 基金数据管理 Store

import { defineStore } from 'pinia'
import type { Fund, FundInfo, FundView, SortConfig } from '@/types'
import {
  calculateTotalAsset,
  calculateTotalHoldingGain,
  calculateAverageGainRate
} from '@/utils/calc'
import { normalizeFundInfo } from '@/utils/fundInfoNormalize'
import {
  buildFundRowDisplay,
  calculateSmartDailyGain
} from '@/utils/fundDisplay'
import { getChinaMarketStatus } from '@/utils/marketChina'

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

      const raw = state.fundDetails.get(code)
      const info = normalizeFundInfo(raw, code)
      if (!info) return { ...fund, name: fund.code } as FundView

      const market = getChinaMarketStatus()
      const row = buildFundRowDisplay(fund, info, market)

      return {
        ...fund,
        ...info,
        name: row.name,
        sector: row.relateTheme,
        relateTheme: row.relateTheme,
        currentPrice: row.dwjz,
        changePercent: row.navChgRt,
        changeAmount: fund.num ? row.dailyGain / fund.num : 0,
        dailyGain: row.dailyGain,
        holdingGain: row.holdingGain,
        holdingGainRate: row.holdingGainRate,
        estimatedGain: row.estimatedGain,
        estimatedChange: row.gszzl
      }
    },

    getAllFundViews(): FundView[] {
      return this.funds.map(fund => {
        const raw = this.fundDetails.get(fund.code)
        const info = normalizeFundInfo(raw, fund.code)
        if (!info) return { ...fund, name: fund.code } as FundView
        const market = getChinaMarketStatus()
        const row = buildFundRowDisplay(fund, info, market)
        return {
          ...fund,
          ...info,
          name: row.name,
          sector: row.relateTheme,
          relateTheme: row.relateTheme,
          currentPrice: row.dwjz,
          changePercent: row.navChgRt,
          changeAmount: fund.num ? row.dailyGain / fund.num : 0,
          dailyGain: row.dailyGain,
          holdingGain: row.holdingGain,
          holdingGainRate: row.holdingGainRate,
          estimatedGain: row.estimatedGain,
          estimatedChange: row.gszzl
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

    getTotalDailyGain(): number {
      const market = getChinaMarketStatus()
      return this.funds.reduce((sum, fund) => {
        const raw = this.fundDetails.get(fund.code)
        const info = normalizeFundInfo(raw, fund.code)
        if (!info) return sum
        return sum + calculateSmartDailyGain(fund, info, market)
      }, 0)
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
        const name = detail?.name?.toLowerCase() ?? ''
        return fund.code.includes(lowerQuery) || name.includes(lowerQuery)
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

    /** 按代码顺序重排持仓（用于「全部」下拖拽排序） */
    reorderFunds(orderedCodes: string[]) {
      const map = new Map(this.funds.map(f => [f.code, f]))
      const next: Fund[] = []
      const seen = new Set<string>()
      for (const c of orderedCodes) {
        const f = map.get(c)
        if (f) {
          next.push(f)
          seen.add(c)
        }
      }
      for (const f of this.funds) {
        if (!seen.has(f.code)) next.push(f)
      }
      this.funds = next
    },

    // 设置排序配置
    setSortConfig(field: string, order: 'asc' | 'desc') {
      this.sortConfig = { field, order }
      // 持久化到 settings（直接操作 localStorage 避免循环依赖）
      try {
        const raw = localStorage.getItem('fund_helper_settings')
        const settings = raw ? JSON.parse(raw) : {}
        settings.sortMethod = `${field}_${order}`
        localStorage.setItem('fund_helper_settings', JSON.stringify(settings))
      } catch { /* ignore */ }
    },

    // 重置为默认排序（持久化为 'default'）
    resetSortConfig() {
      this.sortConfig = { field: 'holdingGainRate', order: 'desc' }
      try {
        const raw = localStorage.getItem('fund_helper_settings')
        const settings = raw ? JSON.parse(raw) : {}
        settings.sortMethod = 'default'
        localStorage.setItem('fund_helper_settings', JSON.stringify(settings))
      } catch { /* ignore */ }
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
