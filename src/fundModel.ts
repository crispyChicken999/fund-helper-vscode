/**
 * 基金数据模型
 */

/** 基金持仓配置（存储在 settings 中，与导入导出格式一致） */
export interface FundConfig {
  code: string;
  num: string; // 持有份额（字符串）
  cost: string; // 持仓成本价（字符串）
  group?: string; // 基金所属分组
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
  /** 净值日期（上一个交易日的日期，格式：YYYY-MM-DD） */
  netValueDate: string;
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

/** 计算当日收益（基于上一个交易日的真实涨跌幅） */
export function calcDailyGain(fund: FundInfo): number {
  if (fund.shares <= 0) {
    return 0;
  }

  // 使用简单的公式：持有金额 × 涨跌幅百分比
  // 这与 webview 的计算方式一致
  const holdingAmount = fund.netValue * fund.shares;
  return (holdingAmount * fund.navChgRt) / 100;
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
