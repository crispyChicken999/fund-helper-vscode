// 行情数据管理 Store

import { defineStore } from 'pinia'
import type { MarketInfo } from '@/types'

interface MarketStoreState {
  markets: Map<string, MarketInfo>
  categories: string[]
  selectedCategory: string
  lastUpdateTime: number
  loading: boolean
  error?: string
  searchQuery: string
}

export const useMarketStore = defineStore('market', {
  state: (): MarketStoreState => ({
    markets: new Map(),
    categories: ['A股', 'H股', '美股', '其他'],
    selectedCategory: 'A股',
    lastUpdateTime: 0,
    loading: false,
    error: undefined,
    searchQuery: ''
  }),

  getters: {
    // 按分类获取行情
    marketsByCategory: (state) => (category: string): MarketInfo[] => {
      return Array.from(state.markets.values()).filter(
        market => market.category === category
      )
    },

    // 获取单个行情
    getMarket: (state) => (code: string): MarketInfo | undefined => {
      return state.markets.get(code)
    },

    // 过滤后的行情列表
    filteredMarkets(): MarketInfo[] {
      let markets = this.marketsByCategory(this.selectedCategory)
      
      // 搜索过滤
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase()
        markets = markets.filter(m => 
          m.code.toLowerCase().includes(query) ||
          m.name.toLowerCase().includes(query)
        )
      }
      
      return markets
    },

    // 是否正在加载
    isMarketLoading(): boolean {
      return this.loading
    },

    // 行情数量
    marketCount(): number {
      return this.markets.size
    }
  },

  actions: {
    // 更新单个行情
    updateMarket(code: string, info: Partial<MarketInfo>) {
      const market = this.markets.get(code)
      if (market) {
        Object.assign(market, info)
      } else {
        this.markets.set(code, info as MarketInfo)
      }
    },

    // 批量更新行情
    updateMarkets(markets: MarketInfo[]) {
      markets.forEach(market => {
        this.markets.set(market.code, market)
      })
      this.lastUpdateTime = Date.now()
    },

    // 选择分类
    selectCategory(category: string) {
      this.selectedCategory = category
    },

    // 设置搜索查询
    setSearchQuery(query: string) {
      this.searchQuery = query
    },

    // 设置加载状态
    setLoading(loading: boolean) {
      this.loading = loading
    },

    // 设置错误
    setError(error?: string) {
      this.error = error
    },

    // 清空行情
    clearMarkets() {
      this.markets.clear()
      this.lastUpdateTime = 0
    },

    // 获取分类列表
    getCategories(): string[] {
      return this.categories
    }
  }
})
