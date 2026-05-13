/**
 * 行情中心 API — 全面使用 JSONP / 直接 fetch（无代理）
 */

import { fetchJSON } from '@/utils/jsonp'

// ==================== 类型定义 ====================

export interface IndexCardData {
  code: string
  name: string
  price: number
  changePercent: number
  changeAmount: number
}

export interface MarketStatData {
  totalVolume: number   // 两市合计成交额（亿元）
  rising: number        // 上涨家数
  falling: number       // 下跌家数
  flat: number          // 平盘家数
}

export interface FlowLinePoint {
  time: string
  main: number       // 主力净流入（亿元）
  superLarge: number // 超大单
  large: number      // 大单
  medium: number     // 中单
  small: number      // 小单
}

export interface PlateItem {
  name: string
  value: number  // 净流入（亿元）
}

// ==================== 大盘指数（push2 允许跨域） ====================

const INDEX_SECIDS = '1.000001,1.000300,0.399001,0.399006'

export async function fetchIndexCards(): Promise<IndexCardData[]> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=${INDEX_SECIDS}&_=${Date.now()}`
  try {
    const data = await fetchJSON<any>(url)
    if (!data) return []
    const items: IndexCardData[] = (data?.data?.diff ?? []).map((d: any) => ({
      code: `${d.f13}.${d.f12}`,
      name: d.f14,
      price: d.f2,
      changePercent: d.f3,
      changeAmount: d.f4
    }))
    return items
  } catch {
    return []
  }
}

// ==================== 两市统计（push2 允许跨域） ====================

export async function fetchMarketStat(): Promise<MarketStatData | null> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001&fields=f1,f2,f3,f4,f6,f12,f13,f104,f105,f106&_=${Date.now()}`
  try {
    const data = await fetchJSON<any>(url)
    if (!data) return null
    const diff = data?.data?.diff ?? []
    if (diff.length < 2) return null
    const sh = diff[0]
    const sz = diff[1]
    return {
      totalVolume: ((sh.f6 || 0) + (sz.f6 || 0)) / 1e8,
      rising: (sh.f104 || 0) + (sz.f104 || 0),
      falling: (sh.f105 || 0) + (sz.f105 || 0),
      flat: (sh.f106 || 0) + (sz.f106 || 0)
    }
  } catch {
    return null
  }
}

// ==================== 资金流向折线图（push2 允许跨域） ====================

export async function fetchFlowLine(): Promise<FlowLinePoint[]> {
  const url = `https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=1&secid=1.000001&secid2=0.399001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&_=${Date.now()}`
  try {
    const data = await fetchJSON<any>(url)
    if (!data) return []
    const klines: string[] = data?.data?.klines ?? []
    return klines.map(line => {
      const parts = line.split(',')
      return {
        time: parts[0] ?? '',
        main: parseFloat(parts[1] ?? '0') / 1e8,
        superLarge: parseFloat(parts[2] ?? '0') / 1e8,
        large: parseFloat(parts[3] ?? '0') / 1e8,
        medium: parseFloat(parts[4] ?? '0') / 1e8,
        small: parseFloat(parts[5] ?? '0') / 1e8
      }
    })
  } catch {
    return []
  }
}

// ==================== 板块资金流向（直接 fetch，如失败则走 Vite proxy） ====================

export type PlateRankField = 'f62' | 'f164' | 'f174'

const PLATE_CODES: Record<string, string> = {
  industry: 'm:90+s:4',
  style: 'm:90+e:4',
  concept: 'm:90+t:3',
  region: 'm:90+t:1'
}

export function getPlateCode(tab: string): string {
  return PLATE_CODES[tab] ?? PLATE_CODES.industry!
}

export async function fetchPlateData(
  plateTab: string,
  rankField: PlateRankField = 'f62'
): Promise<PlateItem[]> {
  const code = getPlateCode(plateTab)
  const targetUrl = `https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=${rankField}&code=${encodeURIComponent(code)}`

  try {
    // 先尝试直接请求（可能无 CORS 限制）
    const res = await fetch(targetUrl, { signal: AbortSignal.timeout(8000) })
    if (res.ok) {
      const data = await res.json()
      return parsePlateResponse(data, rankField)
    }
  } catch {
    // 直接请求失败，尝试 Vite proxy（仅开发环境）
  }

  // Fallback: 开发环境走 Vite proxy
  if (import.meta.env.DEV) {
    try {
      const proxyUrl = `/api-proxy/bkzj/getbkzj?key=${rankField}&code=${encodeURIComponent(code)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) })
      if (res.ok) {
        const data = await res.json()
        return parsePlateResponse(data, rankField)
      }
    } catch { /* ignore */ }
  }

  return []
}

function parsePlateResponse(data: any, rankField: string): PlateItem[] {
  // API 返回结构: { data: { total, diff: [{f12,f13,f14,f62/f164/f174}] } }
  const list: any[] = data?.data?.diff ?? data?.data ?? []
  return list
    .map(item => ({
      name: item.f14 ?? item.name ?? '',
      value: (item[rankField] ?? 0) / 1e8
    }))
    .sort((a, b) => b.value - a.value)
}

// ==================== 全球指数图片 ====================

export interface IndexImageItem {
  name: string
  nid: string
}

export const GLOBAL_INDEX_GROUPS: Record<string, IndexImageItem[]> = {
  A股: [
    { name: '上证指数', nid: '1.000001' },
    { name: '沪深300', nid: '1.000300' },
    { name: '深证成指', nid: '0.399001' },
    { name: '科创50', nid: '1.000688' },
    { name: '创业板指', nid: '0.399006' },
    { name: '中小100', nid: '0.399005' },
    { name: '黄金9999', nid: '1.518880' }
  ],
  港股: [
    { name: '恒生指数', nid: '116.HSI' },
    { name: '恒生科技', nid: '116.HSTECH' }
  ],
  美股: [
    { name: '道琼斯', nid: '105.DJIA' },
    { name: '纳斯达克', nid: '105.NDX' },
    { name: '纳斯达克100', nid: '105.NDAQ' },
    { name: '标普500', nid: '105.SPX' },
    { name: 'COMEX黄金', nid: '101.GC00Y' }
  ],
  亚太: [
    { name: '日经225', nid: '119.N225' },
    { name: '越南胡志明', nid: '128.VNINDEX' },
    { name: '印度孟买', nid: '134.BSE' }
  ]
}

export function getIndexImageUrl(nid: string): string {
  return `https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid=${nid}&rnd=${Date.now()}`
}

// ==================== 兼容旧接口 ====================

export interface MarketData {
  code: string
  name: string
  price: number
  changePercent: number
  changeAmount: number
  category: string
}

export async function fetchAllMarkets(): Promise<MarketData[]> {
  const cards = await fetchIndexCards()
  return cards.map(c => ({
    code: c.code,
    name: c.name,
    price: c.price,
    changePercent: c.changePercent,
    changeAmount: c.changeAmount,
    category: 'A股'
  }))
}

export async function fetchMarketsByCategory(_category: string): Promise<MarketData[]> {
  return fetchAllMarkets()
}
