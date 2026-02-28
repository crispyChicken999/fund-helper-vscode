/**
 * 基金数据模型
 */

/** 基金持仓配置（存储在 settings 中，与导入导出格式一致） */
export interface FundConfig {
  code: string;
  num: string; // 持有份额（字符串）
  cost: string; // 持仓成本价（字符串）
}

/** 基金实时数据 */
export interface FundInfo {
  code: string;
  name: string;
  /** 单位净值（上一交易日） */
  netValue: number;
  /** 估算净值 */
  estimatedValue: number | null;
  /** 估算涨跌幅(%) */
  changePercent: number;
  /** 估值更新时间 */
  updateTime: string;
  /** 是否已更新为真实净值 */
  isRealValue: boolean;
  /** 实际日涨跌幅(%) */
  navChgRt: number;
  /** 持有份额 */
  shares: number;
  /** 持仓成本价 */
  cost: number;
}

/** 历史净值记录 */
export interface NetValueRecord {
  date: string;
  netValue: number;
  /** 日增长率(%) */
  changePercent: number;
}

import { isMarketClosed } from "./holidayService";

/** 计算持有额 */
export function calcHoldingAmount(fund: FundInfo): number {
  return fund.netValue * fund.shares;
}

/** 计算估算日收益 */
export function calcDailyGain(fund: FundInfo): number {
  if (fund.shares <= 0) {
    return 0;
  }

  // 如果当天是休市，估算收益应返回 0
  if (isMarketClosed()) {
    return 0;
  }

  if (fund.isRealValue) {
    // 采用真实的实际净值计算收益
    return (
      (fund.netValue - fund.netValue / (1 + fund.navChgRt * 0.01)) *
      fund.shares
    );
  }
  if (fund.estimatedValue !== null) {
    return (fund.estimatedValue - fund.netValue) * fund.shares;
  }
  return 0;
}

/** 计算持有收益 */
export function calcHoldingGain(fund: FundInfo): number {
  if (fund.cost > 0 && fund.shares > 0) {
    return (fund.netValue - fund.cost) * fund.shares;
  }
  return 0;
}

/** 计算持有收益率(%) */
export function calcHoldingGainRate(fund: FundInfo): number {
  if (fund.cost > 0) {
    return ((fund.netValue - fund.cost) / fund.cost) * 100;
  }
  return 0;
}
