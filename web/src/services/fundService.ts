// 基金业务逻辑服务

import { useFundStore } from '@/stores'
import {
  getFundData,
  fetchFundRelateTheme
} from '@/api/fundEastmoney'
import { storageService } from './storageService'
import { groupService } from './groupService'
import type { Fund, FundInfo } from '@/types'
import { normalizeFundInfo } from '@/utils/fundInfoNormalize'
import {
  sortFieldValue,
  buildFundRowDisplay,
  type FundRowDisplay
} from '@/utils/fundDisplay'
import { getChinaMarketStatus } from '@/utils/marketChina'

async function attachRelateThemes(funds: FundInfo[]): Promise<void> {
  const codes = funds.map(f => f.code)
  for (let i = 0; i < codes.length; i += 10) {
    const batch = codes.slice(i, i + 10)
    const themes = await fetchFundRelateTheme(batch)
    batch.forEach(code => {
      const t = themes[code]
      if (!t) return
      const fund = funds.find(f => f.code === code)
      if (fund) {
        fund.relateTheme = t
        fund.sector = t
      }
    })
  }
}

class FundService {
  async initialize(): Promise<void> {
    const fundStore = useFundStore()

    const funds = storageService.loadFunds()
    funds.forEach(fund => {
      fundStore.funds.push(fund)
    })

    const cache = storageService.loadFundDetailsCache()
    Object.entries(cache).forEach(([code, detail]) => {
      const normalized = normalizeFundInfo(detail as Partial<FundInfo>, code)
      if (normalized) {
        fundStore.fundDetails.set(code, normalized)
      }
    })

    console.log(`已加载 ${funds.length} 个基金`)
  }

  async addFund(code: string, num: number, cost: number, groupKey?: string): Promise<void> {
    const fundStore = useFundStore()
    await fundStore.addFund(code, num, cost, groupKey)
    if (groupKey) {
      await groupService.syncFundGroupMembership(code, undefined, groupKey)
    }
    this.saveFunds()
    await this.fetchFundDetail(code)
  }

  async updateFund(code: string, num: number, cost: number, groupKey?: string): Promise<void> {
    const fundStore = useFundStore()
    const prevKey = fundStore.getFund(code)?.groupKey
    await fundStore.updateFund(code, num, cost, groupKey)
    const nextKey = fundStore.getFund(code)?.groupKey
    await groupService.syncFundGroupMembership(code, prevKey, nextKey)
    this.saveFunds()
  }

  async deleteFund(code: string): Promise<void> {
    const fundStore = useFundStore()
    const prevKey = fundStore.getFund(code)?.groupKey
    await fundStore.deleteFund(code)
    if (prevKey) {
      await groupService.syncFundGroupMembership(code, prevKey, undefined)
    }
    this.saveFunds()
  }

  async fetchFundDetail(code: string): Promise<FundInfo> {
    const fundStore = useFundStore()
    const fund = fundStore.getFund(code)
    if (!fund) throw new Error('基金不存在')

    const prevRaw = fundStore.fundDetails.get(code)
    const previous = normalizeFundInfo(prevRaw, code)
      ? [normalizeFundInfo(prevRaw, code)!]
      : []

    const list = await getFundData([fund], previous)
    let info = list[0]!
    const themes = await fetchFundRelateTheme([code])
    if (themes[code]) {
      info = { ...info, relateTheme: themes[code], sector: themes[code] }
    }
    fundStore.updateFundDetail(code, info)
    this.saveFundDetailsCache()
    return info
  }

  async refreshAllFunds(): Promise<void> {
    const fundStore = useFundStore()
    const funds = [...fundStore.funds]
    if (funds.length === 0) return

    const previous: FundInfo[] = funds.map(f => {
      const raw = fundStore.fundDetails.get(f.code)
      return normalizeFundInfo(raw, f.code)
    }).filter((x): x is FundInfo => !!x)

    const list = await getFundData(funds, previous)
    await attachRelateThemes(list)

    list.forEach(info => {
      fundStore.updateFundDetail(info.code, info)
    })

    this.saveFundDetailsCache()
    console.log(`已刷新 ${list.length} 个基金数据`)
  }

  private saveFunds(): void {
    const fundStore = useFundStore()
    storageService.saveFunds(fundStore.funds)
  }

  private saveFundDetailsCache(): void {
    const fundStore = useFundStore()
    const cache: Record<string, unknown> = {}
    fundStore.fundDetails.forEach((detail, code) => {
      cache[code] = detail
    })
    storageService.saveFundDetailsCache(cache)
  }

  searchFunds(query: string): Fund[] {
    const fundStore = useFundStore()
    return fundStore.searchFunds(query)
  }

  filterByGroup(groupKey: string): Fund[] {
    const fundStore = useFundStore()
    return fundStore.getFundList(groupKey)
  }

  sortFundRows(rows: FundRowDisplay[], field: string, order: 'asc' | 'desc'): FundRowDisplay[] {
    return [...rows].sort((a, b) => {
      const va = sortFieldValue(a, field)
      const vb = sortFieldValue(b, field)
      if (va < vb) return order === 'asc' ? -1 : 1
      if (va > vb) return order === 'asc' ? 1 : -1
      return 0
    })
  }

  buildRowsForHome(): FundRowDisplay[] {
    const fundStore = useFundStore()
    const market = getChinaMarketStatus()
    return fundStore.funds.map(fund => {
      const raw = fundStore.fundDetails.get(fund.code)
      const info = normalizeFundInfo(raw, fund.code) ?? {
        code: fund.code,
        name: fund.code,
        netValue: 0,
        estimatedValue: null,
        changePercent: 0,
        updateTime: '',
        netValueDate: '',
        isRealValue: false,
        navChgRt: 0,
        shares: fund.num,
        cost: fund.cost
      }
      return buildFundRowDisplay(fund, info, market)
    })
  }

  async moveFundToGroup(fundCode: string, targetGroupKey: string | undefined): Promise<void> {
    const fundStore = useFundStore()
    const fund = fundStore.getFund(fundCode)
    if (!fund) return
    const prev = fund.groupKey
    if (targetGroupKey === undefined) {
      delete fund.groupKey
    } else {
      fund.groupKey = targetGroupKey
    }
    await groupService.syncFundGroupMembership(fundCode, prev, targetGroupKey)
    this.saveFunds()
  }

  reorderFundsGlobally(orderedCodes: string[]): void {
    const fundStore = useFundStore()
    fundStore.reorderFunds(orderedCodes)
    this.saveFunds()
  }
}

export const fundService = new FundService()
