import type { Fund, FundInfo } from '@/types'
import type { ChinaMarketStatus } from '@/utils/marketChina'

export function getTodayDateStr(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

export function extractDate(gztime: string | undefined, market: ChinaMarketStatus): string {
  if (!gztime || typeof gztime !== 'string') return market.todayDate
  const parts = gztime.split(' ')
  if (parts.length >= 1 && parts[0]!.length >= 10) {
    return parts[0]!.substring(5).replace('/', '-')
  }
  return market.todayDate
}

export function extractTime(gztime: string | undefined): string {
  if (!gztime || typeof gztime !== 'string') return ''
  const parts = gztime.split(' ')
  return parts.length >= 2 ? parts[1]! : ''
}

export function formatNetValueDate(netValueDate: string): string {
  if (!netValueDate) return ''
  if (netValueDate.length >= 10) return netValueDate.substring(5, 10)
  return netValueDate
}

export function isGzTimeUpdatedToday(gztime: string | undefined, market: ChinaMarketStatus): boolean {
  if (!gztime) return false
  return extractDate(gztime, market) === market.todayDate
}

export function shouldShowRealValueIcon(info: FundInfo, market: ChinaMarketStatus): boolean {
  if (market.isOpen || market.isClosed) return false
  if (!info.netValueDate) return false
  return formatNetValueDate(info.netValueDate) === market.todayDate
}

export function calculateSmartDailyGain(
  fund: Fund,
  info: FundInfo,
  market: ChinaMarketStatus
): number {
  const num = fund.num || 0
  if (num <= 0) return 0
  const dwjz = info.netValue || 0
  const navChgRt = info.navChgRt || 0
  const gsz = info.estimatedValue ?? 0
  const gszzl = info.changePercent || 0

  const netValueUpdatedToday = shouldShowRealValueIcon(info, market)

  if (market.isClosed) {
    const holdingAmount = num * dwjz
    return (holdingAmount * navChgRt) / 100
  }

  if (market.isOpen) {
    if (gsz > 0 && isGzTimeUpdatedToday(info.updateTime, market)) {
      return (gsz - dwjz) * num
    }
    if (gsz === 0 && gszzl !== 0) {
      const holdingAmount = num * dwjz
      return (holdingAmount * gszzl) / 100
    }
    return 0
  }

  if (netValueUpdatedToday) {
    const holdingAmount = num * dwjz
    return (holdingAmount * navChgRt) / 100
  }

  if (gsz > 0 && isGzTimeUpdatedToday(info.updateTime, market)) {
    return (gsz - dwjz) * num
  }
  if (gsz === 0 && gszzl !== 0) {
    const holdingAmount = num * dwjz
    return (holdingAmount * gszzl) / 100
  }
  return 0
}

/** 列表行展示模型（对齐 webview generateFundRow） */
export interface FundRowDisplay {
  fund: Fund
  info: FundInfo
  groupName?: string
  code: string
  name: string
  dwjz: number
  gsz: number
  gszzl: number
  navChgRt: number
  isRealValue: boolean
  relateTheme: string
  holdingAmount: number
  costAmount: number
  holdingGain: number
  holdingGainRate: number
  estimatedGain: number
  dailyGain: number
  displayGsz: number
  updateTime: string
  fullUpdateTime: string
  estimatedDateLabel: string
  navDateLabel: string
  shouldShowEstimated: boolean
  showRealValueIcon: boolean
}

export function inferRelateThemePlaceholder(info: FundInfo): string {
  const raw = info.relateTheme?.trim()
  if (raw) return raw
  const gszzl = info.changePercent || 0
  if (info.estimatedValue !== null && info.estimatedValue !== undefined) return '--'
  if (!gszzl) return '--'
  const fundName = (info.name || '').toLowerCase()
  if (fundName.includes('港股') || fundName.includes('香港') || fundName.includes('恒生')) {
    return fundName.includes('科技') ? '港股科技' : '港股'
  }
  if (fundName.includes('纳斯达克') || fundName.includes('标普') || fundName.includes('美股')) {
    return '美股'
  }
  return 'QDII'
}

export function buildFundRowDisplay(
  fund: Fund,
  info: FundInfo,
  market: ChinaMarketStatus,
  groupName?: string
): FundRowDisplay {
  const num = fund.num || 0
  const cost = fund.cost || 0
  const dwjz = info.netValue || 0
  let gsz = info.estimatedValue ?? 0
  const gszzl = info.changePercent || 0
  const navChgRt = info.navChgRt || 0

  let displayGsz = gsz
  if (gsz === 0 && gszzl !== 0 && dwjz > 0) {
    displayGsz = dwjz * (1 + gszzl / 100)
    gsz = 0
  }

  const holdingAmount = num * dwjz
  const costAmount = num * cost
  const holdingGain = holdingAmount - costAmount
  const holdingGainRate = costAmount > 0 ? (holdingGain / costAmount) * 100 : 0

  const isMarketClosedNow = market.isClosed
  const hasUpdatedData = isGzTimeUpdatedToday(info.updateTime, market)

  let estimatedGain = 0
  if (!isMarketClosedNow) {
    if (gsz > 0 && hasUpdatedData) {
      estimatedGain = (gsz - dwjz) * num
    } else if (gsz === 0 && gszzl !== 0) {
      estimatedGain = (holdingAmount * gszzl) / 100
    }
  }

  const dailyGain = (holdingAmount * navChgRt) / 100

  let updateTime = extractTime(info.updateTime)
  if (gsz === 0 && (!updateTime || updateTime === '')) {
    const now = new Date()
    updateTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  }

  let estimatedDateLabel: string
  if (isMarketClosedNow) {
    estimatedDateLabel = '休市'
  } else if (gsz === 0) {
    estimatedDateLabel = market.todayDate
  } else if (!hasUpdatedData) {
    estimatedDateLabel = market.todayDate
  } else {
    estimatedDateLabel = extractDate(info.updateTime, market)
  }

  const navDateLabel = info.netValueDate
    ? formatNetValueDate(info.netValueDate)
    : extractDate(info.updateTime, market)

  let fullUpdateTime = info.updateTime
    ? `${extractTime(info.updateTime)}`.trim()
    : ''
  if (gsz === 0 && gszzl !== 0 && fullUpdateTime && !fullUpdateTime.includes(':')) {
    const now = new Date()
    fullUpdateTime = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${updateTime}`
  }

  const relateTheme = inferRelateThemePlaceholder(info)

  const shouldShowEstimated =
    !isMarketClosedNow && (hasUpdatedData || (gsz === 0 && gszzl !== 0))

  const showRealValueIcon = shouldShowRealValueIcon(info, market)

  return {
    fund,
    info,
    groupName,
    code: fund.code,
    name: info.name || fund.code,
    dwjz,
    gsz,
    gszzl,
    navChgRt,
    isRealValue: info.isRealValue,
    relateTheme,
    holdingAmount,
    costAmount,
    holdingGain,
    holdingGainRate,
    estimatedGain,
    dailyGain,
    displayGsz,
    updateTime,
    fullUpdateTime,
    estimatedDateLabel,
    navDateLabel,
    shouldShowEstimated,
    showRealValueIcon
  }
}

export function sortFieldValue(row: FundRowDisplay, field: string): number {
  switch (field) {
    case 'estimatedGain':
      return row.estimatedGain
    case 'estimatedChange':
      return row.gszzl
    case 'dailyChange':
      return row.navChgRt
    case 'dailyGain':
      return row.dailyGain
    case 'holdingGain':
      return row.holdingGain
    case 'holdingGainRate':
      return row.holdingGainRate
    case 'amountShares':
      return row.holdingAmount
    case 'cost':
      return row.fund.cost
    default:
      return 0
  }
}
