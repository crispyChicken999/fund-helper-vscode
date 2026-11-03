// 计算工具函数

import type { AddPositionMetrics, AddPositionPreview, Fund, FundInfo } from '@/types'
import { buildFundRowDisplay, type FundRowDisplay } from '@/utils/fundDisplay'
import type { ChinaMarketStatus } from '@/utils/marketChina'

function navOf(info: FundInfo): number {
  return info.netValue ?? info.currentPrice ?? 0
}

/**
 * 计算持有收益
 */
export function calculateHoldingGain(fund: Fund, infoOrPrice: FundInfo | number): number {
  const currentPrice = typeof infoOrPrice === 'number' ? infoOrPrice : navOf(infoOrPrice)
  return (currentPrice - fund.cost) * fund.num
}

/**
 * 计算持有收益率
 */
export function calculateHoldingGainRate(fund: Fund, infoOrPrice: FundInfo | number): number {
  const holdingGain = calculateHoldingGain(fund, infoOrPrice)
  const costTotal = fund.cost * fund.num
  return costTotal === 0 ? 0 : (holdingGain / costTotal) * 100
}

/**
 * 日收益（按净值涨跌幅）
 */
export function calculateDailyGainFromNav(fund: Fund, info: FundInfo): number {
  const dwjz = navOf(info)
  const holdingAmount = dwjz * fund.num
  return (holdingAmount * (info.navChgRt ?? 0)) / 100
}

/** @deprecated 使用 calculateDailyGainFromNav */
export function calculateDailyGain(fund: Fund, changeAmount: number): number {
  return changeAmount * fund.num
}

export function calculateEstimatedGain(fund: Fund, currentPrice: number): number {
  return calculateHoldingGain(fund, currentPrice)
}

export function calculateEstimatedChange(fund: Fund, currentPrice: number): number {
  return fund.cost === 0 ? 0 : (currentPrice / fund.cost - 1) * 100
}

export function calculateTotalAsset(funds: Fund[], fundDetails: Map<string, FundInfo>): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + navOf(detail) * fund.num
  }, 0)
}

export function calculateTotalHoldingGain(funds: Fund[], fundDetails: Map<string, FundInfo>): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateHoldingGain(fund, detail)
  }, 0)
}

export function calculateTotalDailyGain(funds: Fund[], fundDetails: Map<string, FundInfo>): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateDailyGainFromNav(fund, detail)
  }, 0)
}

export function calculateAverageGainRate(funds: Fund[], fundDetails: Map<string, FundInfo>): number {
  if (funds.length === 0) return 0
  const totalRate = funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateHoldingGainRate(fund, detail)
  }, 0)
  return totalRate / funds.length
}

// ==================== 加仓预览 ====================

function toFinite(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toMetrics(row: FundRowDisplay, positionPct: number): AddPositionMetrics {
  return {
    num: toFinite(row.fund.num),
    cost: toFinite(row.fund.cost),
    costAmount: toFinite(row.costAmount),
    marketValue: toFinite(row.holdingAmount),
    gain: toFinite(row.holdingGain),
    gainRate: toFinite(row.holdingGainRate),
    estimatedGain: toFinite(row.estimatedGain),
    dailyGain: toFinite(row.dailyGain),
    positionPct,
    // 回本所需涨幅：成本价相对最新单位净值还要涨多少
    breakEvenRisePct: row.dwjz > 0 ? ((toFinite(row.fund.cost) / row.dwjz) - 1) * 100 : 0
  }
}

/**
 * 计算加仓预览（纯函数，不依赖 store）
 *
 * 口径与首页列表完全一致：加仓前后都交给 buildFundRowDisplay 计算，
 * 只替换 fund 的 num / cost，避免出现「预览页数字和列表对不上」。
 *
 * 公式：
 *   新增份额 = 加仓金额 / 买入净值
 *   新份额   = 原份额 + 新增份额
 *   新成本价 = (原成本价 × 原份额 + 加仓金额) / 新份额
 *
 * @param totalAsset 加仓前的组合总资产（用于计算持有仓位），传 0 时仓位为 0
 */
export function calculateAddPositionPreview(
  fund: Fund,
  info: FundInfo,
  market: ChinaMarketStatus,
  amount: number,
  buyNav: number,
  totalAsset = 0
): AddPositionPreview {
  const safeAmount = Math.max(0, toFinite(amount))
  const safeNav = Math.max(0, toFinite(buyNav))
  const oldNum = Math.max(0, toFinite(fund.num))
  const oldCost = Math.max(0, toFinite(fund.cost))

  const addShares = safeNav > 0 ? safeAmount / safeNav : 0
  const newNum = oldNum + addShares
  const newCostTotal = oldCost * oldNum + safeAmount
  const newCost = newNum > 0 ? newCostTotal / newNum : oldCost

  const beforeRow = buildFundRowDisplay(fund, info, market)
  const afterRow = buildFundRowDisplay(
    { ...fund, num: newNum, cost: newCost },
    info,
    market
  )

  const safeTotalAsset = Math.max(0, toFinite(totalAsset))
  // 加仓是新增资金：组合总资产同步增加加仓金额
  const afterTotalAsset = safeTotalAsset + safeAmount

  const before = toMetrics(
    beforeRow,
    safeTotalAsset > 0 ? (beforeRow.holdingAmount / safeTotalAsset) * 100 : 0
  )
  const after = toMetrics(
    afterRow,
    afterTotalAsset > 0 ? (afterRow.holdingAmount / afterTotalAsset) * 100 : 0
  )

  return {
    buyNav: safeNav,
    amount: safeAmount,
    addShares,
    before,
    after,
    amountToHoldingPct:
      before.marketValue > 0 ? (safeAmount / before.marketValue) * 100 : 0,
    gainRateDelta: after.gainRate - before.gainRate,
    gainDelta: after.gain - before.gain,
    numDelta: after.num - before.num
  }
}
