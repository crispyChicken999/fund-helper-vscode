import type { FundInfo } from '@/types'

/** 将旧版缓存字段规范化 */
export function normalizeFundInfo(raw: Partial<FundInfo> | undefined, code: string): FundInfo | undefined {
  if (!raw || typeof raw !== 'object') return undefined

  if (
    typeof raw.netValue === 'number' &&
    typeof raw.navChgRt === 'number' &&
    raw.code
  ) {
    return raw as FundInfo
  }

  const legacyPrice = raw.currentPrice ?? raw.netValue ?? 0
  const legacyChg = raw.changePercent ?? raw.navChgRt ?? 0

  return {
    code: raw.code || code,
    name: raw.name || code,
    netValue: legacyPrice,
    estimatedValue: raw.estimatedValue ?? legacyPrice,
    changePercent: legacyChg,
    updateTime: raw.updateTime ?? '',
    netValueDate: raw.netValueDate ?? '',
    isRealValue: raw.isRealValue ?? false,
    navChgRt: raw.navChgRt ?? legacyChg,
    shares: raw.shares ?? 0,
    cost: raw.cost ?? 0,
    relateTheme: raw.relateTheme ?? raw.sector,
    sector: raw.sector
  }
}
