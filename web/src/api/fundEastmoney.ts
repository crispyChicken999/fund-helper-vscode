/**
 * 东方财富 / 天天基金接口 — 对齐 VSCode 插件 fundService.getFundData 流程
 */

import type { Fund, FundInfo } from '@/types'
import { fetchFundgzRawViaJsonp } from '@/api/fundgz'
import { proxyFetch } from '@/api/proxy'

async function fetchFundInvestmentPosition(code: string): Promise<any> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=${Date.now()}`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return null
    const data = await res.json().catch(() => null)
    return data?.Datas ?? null
  } catch {
    return null
  }
}

async function fetchStockRealTimeData(secids: string): Promise<any[]> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14&fltt=2&secids=${secids}&_=${Date.now()}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return []
    const data = await res.json().catch(() => null)
    return data?.data?.diff ?? []
  } catch {
    return []
  }
}

function calcEstimateChange(positions: any[], stockData: any[]): number {
  if (!positions?.length || !stockData?.length) return 0
  let totalWeight = 0
  positions.forEach((position: any) => {
    const weight = parseFloat(position.JZBL) || 0
    if (weight > 0) totalWeight += weight
  })
  if (totalWeight <= 0) return 0
  let totalWeightedChange = 0
  positions.forEach((position: any, index: number) => {
    const weight = parseFloat(position.JZBL) || 0
    const stockItem = stockData[index]
    const changePercent = (stockItem && parseFloat(stockItem.f3)) || 0
    if (weight > 0 && !isNaN(changePercent)) {
      totalWeightedChange += (weight / totalWeight) * changePercent
    }
  })
  return parseFloat(totalWeightedChange.toFixed(2))
}

async function fetchFundEstimateChange(code: string): Promise<number | null> {
  try {
    const positionData = await fetchFundInvestmentPosition(code)
    if (!positionData?.fundStocks) return null
    const fundStocks = positionData.fundStocks
    if (!Array.isArray(fundStocks) || fundStocks.length === 0) return null
    const secids = fundStocks
      .map((stock: any) => {
        if (stock.NEWTEXCH && stock.GPDM) return `${stock.NEWTEXCH}.${stock.GPDM}`
        return null
      })
      .filter(Boolean)
      .join(',')
    if (!secids) return null
    const stockData = await fetchStockRealTimeData(secids)
    if (!stockData.length) return null
    return calcEstimateChange(fundStocks, stockData)
  } catch {
    return null
  }
}

/** 批量 MNFInfo */
export async function fetchBatchMNFInfo(codes: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!codes.length) return map
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${codes.join(',')}`
  const res = await proxyFetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null)
  if (!res?.ok) return map
  const data = await res.json().catch(() => null)
  const gztime = data?.Expansion?.GZTIME ?? ''
  for (const fund of data?.Datas ?? []) {
    map.set(fund.FCODE, {
      navchgrt: fund.NAVCHGRT,
      jzrq: fund.PDATE,
      dwjz: fund.NAV,
      name: fund.SHORTNAME,
      gszzl: fund.GSZZL,
      gztime
    })
  }
  return map
}

async function fetchFundFromMNFInfo(code: string): Promise<any | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${code}`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return null
    const data = await res.json().catch(() => null)
    if (!data?.Datas?.length) return null
    const fund = data.Datas[0]
    const estimateChange = await fetchFundEstimateChange(code)
    return {
      fundcode: fund.FCODE,
      name: fund.SHORTNAME,
      dwjz: fund.NAV,
      gsz: null,
      gszzl: estimateChange !== null ? String(estimateChange) : null,
      navchgrt: fund.NAVCHGRT,
      jzrq: fund.PDATE,
      gztime: data?.Expansion?.GZTIME ?? '',
      _fromMNFInfo: true,
      _estimateChange: estimateChange
    }
  } catch {
    return null
  }
}

/** fundgz 必须用 JSONP（浏览器直连常有跨域限制） */
export async function fetchSingleFundValuation(code: string): Promise<any | null> {
  const raw = await fetchFundgzRawViaJsonp(code)
  if (!raw) return await fetchFundFromMNFInfo(code)
  return raw
}

function toFundInfoFromMerge(
  cfg: Fund,
  val: any,
  mnfInfo: Map<string, any>
): FundInfo {
  const num = cfg.num || 0
  const cost = cfg.cost || 0

  if (mnfInfo.has(cfg.code)) {
    const m = mnfInfo.get(cfg.code)!
    if (m.navchgrt !== undefined) val.navchgrt = m.navchgrt
    if (m.jzrq) val.jzrq = m.jzrq
    if (m.dwjz !== undefined) val.dwjz = m.dwjz
    if (m.name && !val.name) val.name = m.name
  }

  const jzrq = val.jzrq
  const gztime = val.gztime

  let isRealValue = false
  let netValue = isNaN(parseFloat(val.dwjz)) ? 0 : parseFloat(val.dwjz)
  let estimatedValue: number | null = isNaN(parseFloat(val.gsz)) ? null : parseFloat(val.gsz)
  let changePercent = isNaN(parseFloat(val.gszzl)) ? 0 : parseFloat(val.gszzl)
  let navChgRt = 0

  if (val._fromMNFInfo) {
    if (val._estimateChange !== null && val._estimateChange !== undefined) {
      changePercent = val._estimateChange
    } else {
      changePercent = isNaN(parseFloat(val.navchgrt)) ? 0 : parseFloat(val.navchgrt)
    }
    navChgRt = isNaN(parseFloat(val.navchgrt)) ? 0 : parseFloat(val.navchgrt)
    estimatedValue = null
    isRealValue = true
  } else {
    if (val.navchgrt !== undefined && !isNaN(parseFloat(val.navchgrt))) {
      navChgRt = parseFloat(val.navchgrt)
    }
    if (jzrq && gztime && typeof gztime === 'string' && jzrq === gztime.substring(0, 10)) {
      isRealValue = true
      estimatedValue = netValue
    }
  }

  return {
    code: val.fundcode || cfg.code,
    name: val.name || cfg.code,
    netValue,
    estimatedValue,
    changePercent,
    updateTime: val.gztime || '',
    netValueDate: jzrq || '',
    isRealValue,
    navChgRt,
    shares: num,
    cost
  }
}

export async function getFundData(
  configs: Fund[],
  previousData: FundInfo[] = []
): Promise<FundInfo[]> {
  if (configs.length === 0) return []

  const codes = configs.map(c => c.code)
  const [gzResults, mnfInfoMap] = await Promise.all([
    Promise.allSettled(configs.map(c => fetchSingleFundValuation(c.code))),
    fetchBatchMNFInfo(codes)
  ])

  const fundList: FundInfo[] = []

  for (let i = 0; i < configs.length; i++) {
    const cfg = configs[i]!
    const result = gzResults[i]!
    const val = result.status === 'fulfilled' ? result.value : null

    const shares = cfg.num || 0
    const cost = cfg.cost || 0

    if (!val) {
      const oldData = previousData.find(f => f.code === cfg.code)
      if (oldData) {
        fundList.push({
          ...oldData,
          shares,
          cost
        })
      } else {
        fundList.push({
          code: cfg.code,
          name: cfg.code,
          netValue: 0,
          estimatedValue: null,
          changePercent: 0,
          updateTime: '获取失败',
          netValueDate: '',
          isRealValue: false,
          navChgRt: 0,
          shares,
          cost
        })
      }
      continue
    }

    fundList.push(toFundInfoFromMerge(cfg, val, mnfInfoMap))
  }

  return fundList
}

/**
 * 通过 JSONP 搜索基金 (避免 CORS 问题)
 */
function loadFundSearchJsonp(keyword: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackName = `fundSearchCallback_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const globalScope = window as any
    
    // 设置全局回调函数
    globalScope[callbackName] = (data: any) => {
      window.clearTimeout(timeoutId)
      script.remove()
      delete globalScope[callbackName]
      resolve(data || {})
    }
    
    // 创建脚本标签
    const script = document.createElement('script')
    const url =
      `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx` +
      `?m=9&key=${encodeURIComponent(keyword)}&callback=${callbackName}&_=${Date.now()}`
    
    script.async = true
    script.src = url
    
    // 错误处理
    script.onerror = () => {
      window.clearTimeout(timeoutId)
      script.remove()
      delete globalScope[callbackName]
      reject(new Error('Fund search JSONP failed'))
    }
    
    // 超时处理
    const timeoutId = window.setTimeout(() => {
      script.remove()
      delete globalScope[callbackName]
      reject(new Error('Fund search timeout'))
    }, 10000)
    
    document.head.appendChild(script)
  })
}

export async function searchFund(keyword: string): Promise<{ code: string; name: string }[]> {
  if (!keyword.trim()) return []
  try {
    const data = await loadFundSearchJsonp(keyword)
    return (data.Datas ?? []).map((v: any) => ({
      code: String(v.CODE),
      name: String(v.NAME)
    }))
  } catch {
    return []
  }
}

const RELATE_THEME_URL = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2'

export async function fetchFundRelateTheme(fundCodes: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  if (fundCodes.length === 0 || fundCodes.length > 10) return result

  const fcode = fundCodes.join(',')
  const params = new URLSearchParams({
    deviceid: '1d747ff7-7201-443e-95bd-2d13e30b96fe',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME',
    fields: 'INDEXNAME,INDEXCODE,FCODE,TTYPENAME',
    fundUniqueInfo_fIELDS: 'FCODE',
    fundUniqueInfo_fLFIELDS: 'FCODE',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  })

  try {
    const res = await proxyFetch(RELATE_THEME_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000)
    }).catch(() => null)
    if (!res?.ok) return result
    const json = await res.json().catch(() => null)
    const themes: any[] = json?.data?.fundRelateTheme ?? []
    const themeByFund: Record<string, any[]> = {}
    themes.forEach((theme: any) => {
      const fc = theme.FCODE
      if (!themeByFund[fc]) themeByFund[fc] = []
      themeByFund[fc].push(theme)
    })
    Object.keys(themeByFund).forEach(fcode => {
      const arr = themeByFund[fcode]!
      arr.sort((a, b) => (b.CORR_1Y || 0) - (a.CORR_1Y || 0))
      result[fcode] = String(arr[0]?.SEC_NAME ?? '')
    })
  } catch {
    /* ignore */
  }

  return result
}
