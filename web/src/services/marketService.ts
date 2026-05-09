// 行情业务逻辑服务

import { useMarketStore } from '@/stores'
import { 
  fetchAllMarkets, 
  fetchMarketsByCategory,
  type MarketData 
} from '@/api/market'
import type { MarketInfo } from '@/types'

/**
 * 行情服务
 */
class MarketService {
  private refreshTimer?: number

  /**
   * 初始化 - 加载行情数据
   */
  async initialize(): Promise<void> {
    const marketStore = useMarketStore()
    
    try {
      marketStore.setLoading(true)
      
      // 加载所有行情数据
      const markets = await fetchAllMarkets()
      
      // 转换为MarketInfo格式
      const marketInfos: MarketInfo[] = markets.map(m => ({
        code: m.code,
        name: m.name,
        price: m.price,
        changePercent: m.changePercent,
        changeAmount: m.changeAmount,
        category: m.category,
        timestamp: Date.now()
      }))
      
      // 更新到store
      marketStore.updateMarkets(marketInfos)
      
      console.log(`已加载 ${markets.length} 个行情数据`)
    } catch (error: any) {
      console.error('加载行情数据失败:', error)
      marketStore.setError(error.message)
    } finally {
      marketStore.setLoading(false)
    }
  }

  /**
   * 刷新行情数据
   */
  async refreshMarkets(category?: string): Promise<void> {
    const marketStore = useMarketStore()
    
    try {
      marketStore.setLoading(true)
      marketStore.setError(undefined)
      
      let markets: MarketData[]
      
      if (category) {
        // 刷新指定分类
        markets = await fetchMarketsByCategory(category)
      } else {
        // 刷新所有分类
        markets = await fetchAllMarkets()
      }
      
      // 转换为MarketInfo格式
      const marketInfos: MarketInfo[] = markets.map(m => ({
        code: m.code,
        name: m.name,
        price: m.price,
        changePercent: m.changePercent,
        changeAmount: m.changeAmount,
        category: m.category,
        timestamp: Date.now()
      }))
      
      // 更新到store
      marketStore.updateMarkets(marketInfos)
      
      console.log(`已刷新 ${markets.length} 个行情数据`)
    } catch (error: any) {
      console.error('刷新行情数据失败:', error)
      marketStore.setError(error.message)
      throw error
    } finally {
      marketStore.setLoading(false)
    }
  }

  /**
   * 按分类刷新行情
   */
  async refreshByCategory(category: string): Promise<void> {
    await this.refreshMarkets(category)
  }

  /**
   * 搜索行情
   */
  searchMarkets(query: string): MarketInfo[] {
    const marketStore = useMarketStore()
    
    if (!query) {
      return marketStore.filteredMarkets
    }
    
    const lowerQuery = query.toLowerCase()
    return marketStore.filteredMarkets.filter(market =>
      market.code.toLowerCase().includes(lowerQuery) ||
      market.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 启动自动刷新
   */
  startAutoRefresh(intervalSeconds: number = 60): void {
    this.stopAutoRefresh()
    
    this.refreshTimer = window.setInterval(() => {
      const marketStore = useMarketStore()
      this.refreshByCategory(marketStore.selectedCategory).catch(console.error)
    }, intervalSeconds * 1000)
    
    console.log(`行情自动刷新已启动，间隔 ${intervalSeconds} 秒`)
  }

  /**
   * 停止自动刷新
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
      console.log('行情自动刷新已停止')
    }
  }

  /**
   * 获取行情统计
   */
  getMarketStats(): {
    total: number
    rising: number
    falling: number
    unchanged: number
  } {
    const marketStore = useMarketStore()
    const markets = Array.from(marketStore.markets.values())
    
    return {
      total: markets.length,
      rising: markets.filter(m => m.changePercent > 0).length,
      falling: markets.filter(m => m.changePercent < 0).length,
      unchanged: markets.filter(m => m.changePercent === 0).length
    }
  }

  /**
   * 获取最后更新时间
   */
  getLastUpdateTime(): number {
    const marketStore = useMarketStore()
    return marketStore.lastUpdateTime
  }
}

// 导出单例
export const marketService = new MarketService()
