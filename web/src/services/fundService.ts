// 基金业务逻辑服务

import { useFundStore } from '@/stores'
import { fetchFundData, fetchMultipleFundData } from '@/api/fundgz'
import { storageService } from './storageService'
import type { Fund, FundInfo } from '@/types'

/**
 * 基金服务
 */
class FundService {
  /**
   * 初始化 - 从本地存储加载数据
   */
  async initialize(): Promise<void> {
    const fundStore = useFundStore()
    
    // 加载基金列表
    const funds = storageService.loadFunds()
    funds.forEach(fund => {
      fundStore.funds.push(fund)
    })
    
    // 加载基金详情缓存
    const cache = storageService.loadFundDetailsCache()
    Object.entries(cache).forEach(([code, detail]) => {
      fundStore.fundDetails.set(code, detail as FundInfo)
    })
    
    console.log(`已加载 ${funds.length} 个基金`)
  }

  /**
   * 添加基金
   */
  async addFund(code: string, num: number, cost: number, groupKey?: string): Promise<void> {
    const fundStore = useFundStore()
    
    // 添加到store
    await fundStore.addFund(code, num, cost, groupKey)
    
    // 保存到本地存储
    this.saveFunds()
    
    // 获取基金详情
    await this.fetchFundDetail(code)
  }

  /**
   * 更新基金
   */
  async updateFund(code: string, num: number, cost: number, groupKey?: string): Promise<void> {
    const fundStore = useFundStore()
    
    // 更新store
    await fundStore.updateFund(code, num, cost, groupKey)
    
    // 保存到本地存储
    this.saveFunds()
  }

  /**
   * 删除基金
   */
  async deleteFund(code: string): Promise<void> {
    const fundStore = useFundStore()
    
    // 从store删除
    await fundStore.deleteFund(code)
    
    // 保存到本地存储
    this.saveFunds()
  }

  /**
   * 获取基金详情
   */
  async fetchFundDetail(code: string): Promise<FundInfo> {
    const fundStore = useFundStore()
    
    try {
      const data = await fetchFundData(code)
      
      const fundInfo: FundInfo = {
        code: data.code,
        name: data.name,
        currentPrice: data.currentPrice,
        changePercent: data.changePercent,
        changeAmount: data.changeAmount
      }
      
      // 更新store
      fundStore.updateFundDetail(code, fundInfo)
      
      // 保存缓存
      this.saveFundDetailsCache()
      
      return fundInfo
    } catch (error: any) {
      console.error(`获取基金${code}详情失败:`, error)
      throw error
    }
  }

  /**
   * 批量刷新基金数据
   */
  async refreshAllFunds(): Promise<void> {
    const fundStore = useFundStore()
    const codes = fundStore.funds.map(f => f.code)
    
    if (codes.length === 0) return
    
    try {
      const dataMap = await fetchMultipleFundData(codes)
      
      dataMap.forEach((data, code) => {
        const fundInfo: FundInfo = {
          code: data.code,
          name: data.name,
          currentPrice: data.currentPrice,
          changePercent: data.changePercent,
          changeAmount: data.changeAmount
        }
        
        fundStore.updateFundDetail(code, fundInfo)
      })
      
      // 保存缓存
      this.saveFundDetailsCache()
      
      console.log(`已刷新 ${dataMap.size} 个基金数据`)
    } catch (error) {
      console.error('刷新基金数据失败:', error)
      throw error
    }
  }

  /**
   * 保存基金列表到本地存储
   */
  private saveFunds(): void {
    const fundStore = useFundStore()
    storageService.saveFunds(fundStore.funds)
  }

  /**
   * 保存基金详情缓存到本地存储
   */
  private saveFundDetailsCache(): void {
    const fundStore = useFundStore()
    const cache: Record<string, any> = {}
    
    fundStore.fundDetails.forEach((detail, code) => {
      cache[code] = detail
    })
    
    storageService.saveFundDetailsCache(cache)
  }

  /**
   * 搜索基金
   */
  searchFunds(query: string): Fund[] {
    const fundStore = useFundStore()
    return fundStore.searchFunds(query)
  }

  /**
   * 按分组筛选基金
   */
  filterByGroup(groupKey: string): Fund[] {
    const fundStore = useFundStore()
    return fundStore.getFundList(groupKey)
  }

  /**
   * 排序基金列表
   */
  sortFunds(funds: Fund[], field: string, order: 'asc' | 'desc'): Fund[] {
    const fundStore = useFundStore()
    
    return [...funds].sort((a, b) => {
      const viewA = fundStore.getFundView(a.code)
      const viewB = fundStore.getFundView(b.code)
      
      if (!viewA || !viewB) return 0
      
      let valueA: any = (viewA as any)[field]
      let valueB: any = (viewB as any)[field]
      
      // 处理undefined和null
      if (valueA === undefined || valueA === null) valueA = 0
      if (valueB === undefined || valueB === null) valueB = 0
      
      // 比较
      if (valueA < valueB) return order === 'asc' ? -1 : 1
      if (valueA > valueB) return order === 'asc' ? 1 : -1
      return 0
    })
  }
}

// 导出单例
export const fundService = new FundService()
