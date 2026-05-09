// 计算工具函数

import type { Fund, FundInfo } from '@/types'

/**
 * 计算持有收益
 * @param fund 基金信息
 * @param currentPrice 当前净值
 * @returns 持有收益 = (当前净值 - 成本价) × 持有份额
 */
export function calculateHoldingGain(fund: Fund, currentPrice: number): number {
  return (currentPrice - fund.cost) * fund.num
}

/**
 * 计算持有收益率
 * @param fund 基金信息
 * @param currentPrice 当前净值
 * @returns 持有收益率 = 持有收益 / (成本价 × 持有份额) × 100%
 */
export function calculateHoldingGainRate(fund: Fund, currentPrice: number): number {
  const holdingGain = calculateHoldingGain(fund, currentPrice)
  const costTotal = fund.cost * fund.num
  return costTotal === 0 ? 0 : (holdingGain / costTotal) * 100
}

/**
 * 计算日收益
 * @param fund 基金信息
 * @param changeAmount 日涨跌额
 * @returns 日收益 = 日涨跌额 × 持有份额
 */
export function calculateDailyGain(fund: Fund, changeAmount: number): number {
  return changeAmount * fund.num
}

/**
 * 计算预计收益
 * @param fund 基金信息
 * @param currentPrice 当前净值
 * @returns 预计收益 = 持有收益 (与持有收益相同)
 */
export function calculateEstimatedGain(fund: Fund, currentPrice: number): number {
  return calculateHoldingGain(fund, currentPrice)
}

/**
 * 计算预计涨幅
 * @param fund 基金信息
 * @param currentPrice 当前净值
 * @returns 预计涨幅 = (当前净值 / 成本价 - 1) × 100%
 */
export function calculateEstimatedChange(fund: Fund, currentPrice: number): number {
  return fund.cost === 0 ? 0 : ((currentPrice / fund.cost) - 1) * 100
}

/**
 * 计算资产总值
 * @param funds 基金列表
 * @param fundDetails 基金详情Map
 * @returns 资产总值 = ∑(当前净值 × 持有份额)
 */
export function calculateTotalAsset(
  funds: Fund[],
  fundDetails: Map<string, FundInfo>
): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + detail.currentPrice * fund.num
  }, 0)
}

/**
 * 计算持有收益总和
 * @param funds 基金列表
 * @param fundDetails 基金详情Map
 * @returns 持有收益总和 = ∑holdingGain
 */
export function calculateTotalHoldingGain(
  funds: Fund[],
  fundDetails: Map<string, FundInfo>
): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateHoldingGain(fund, detail.currentPrice)
  }, 0)
}

/**
 * 计算日收益总和
 * @param funds 基金列表
 * @param fundDetails 基金详情Map
 * @returns 日收益总和 = ∑dailyGain
 */
export function calculateTotalDailyGain(
  funds: Fund[],
  fundDetails: Map<string, FundInfo>
): number {
  return funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateDailyGain(fund, detail.changeAmount)
  }, 0)
}

/**
 * 计算平均收益率
 * @param funds 基金列表
 * @param fundDetails 基金详情Map
 * @returns 平均收益率
 */
export function calculateAverageGainRate(
  funds: Fund[],
  fundDetails: Map<string, FundInfo>
): number {
  if (funds.length === 0) return 0
  
  const totalRate = funds.reduce((total, fund) => {
    const detail = fundDetails.get(fund.code)
    if (!detail) return total
    return total + calculateHoldingGainRate(fund, detail.currentPrice)
  }, 0)
  
  return totalRate / funds.length
}
