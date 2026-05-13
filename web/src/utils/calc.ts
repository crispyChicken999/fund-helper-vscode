// 计算工具函数

import type { Fund, FundInfo } from '@/types'

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
