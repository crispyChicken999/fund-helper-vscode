/**
 * 东方财富 / 天天基金接口 — 对齐 VSCode 插件 fundService.getFundData 流程
 */

import type { Fund, FundInfo } from '@/types'
import { fetchFundgzRawViaJsonp } from '@/api/fundgz'

/**
 * 通用的持仓信息请求函数（带代理降级）
 * 策略：1. 直接请求 → 2. fund-helper.ccwu.cc 转发 → 3. allorigins.win → 4. codetabs.com 双层代理
 */
async function fetchFundInvestmentPositionWithFallback(code: string): Promise<any> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=${Date.now()}`

  // 策略 1: 直接请求
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Direct fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data?.Datas) {
      throw new Error('Invalid data structure')
    }
    console.log('[InvestPosition] 直接请求成功')
    return data
  } catch (directError) {
    console.warn('[InvestPosition] 直接请求失败，尝试第一层代理...', directError)
  }

  // 策略 2: fund-helper.ccwu.cc 路径转发
  try {
    const proxy0Url = url.replace('https://fundmobapi.eastmoney.com', 'https://fund-helper.ccwu.cc')
    const res = await fetch(proxy0Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: fund-helper proxy fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data?.Datas) {
      throw new Error('fund-helper proxy invalid data structure')
    }
    console.log('[InvestPosition] 第一层代理(fund-helper.ccwu.cc)请求成功')
    return data
  } catch (proxy0Error) {
    console.warn('[InvestPosition] 第一层代理(fund-helper)失败，尝试第二层代理...', proxy0Error)
  }

  // 策略 3: allorigins.win 代理
  try {
    const proxy1Url = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const res = await fetch(proxy1Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Proxy1 fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data?.Datas) {
      throw new Error('Proxy1 invalid data structure')
    }
    console.log('[InvestPosition] 第二层代理(allorigins.win)请求成功')
    return data
  } catch (proxy1Error) {
    console.warn('[InvestPosition] 第二层代理失败，尝试第三层代理...', proxy1Error)
  }

  // 策略 4: codetabs.com 双层代理
  try {
    const encodedTarget = encodeURIComponent(url)
    const firstLayerUrl = `https://api.allorigins.win/raw?url=${encodedTarget}`
    const encodedFirstLayer = encodeURIComponent(firstLayerUrl)
    const proxy2Url = `https://api.codetabs.com/v1/proxy/?quest=${encodedFirstLayer}`

    const res = await fetch(proxy2Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Proxy2 fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data?.Datas) {
      throw new Error('Proxy2 invalid data structure')
    }
    console.log('[InvestPosition] 第三层代理(codetabs.com)请求成功')
    return data
  } catch (proxy2Error) {
    console.warn('[InvestPosition] 第三层代理也失败', proxy2Error)
    throw new Error('All proxy strategies failed for investment position')
  }
}

async function fetchFundInvestmentPosition(code: string): Promise<any> {
  try {
    return await fetchFundInvestmentPositionWithFallback(code)
  } catch (error) {
    console.error('[InvestPosition] 所有请求策略都失败:', error)
    return null
  }
}

async function fetchStockRealTimeData(secids: string): Promise<any[]> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14&fltt=2&secids=${secids}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=${Date.now()}`
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      if (!res.ok) return []
      const data = await res.json().catch(() => null)
      return data?.data?.diff ?? []
    } catch (err) {
      clearTimeout(timeoutId)
      // Ignore abort and fetch errors
      return []
    }
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
    if (!positionData?.Datas?.fundStocks) return null
    const fundStocks = positionData.Datas.fundStocks
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

/** localStorage 缓存键 */
const MNF_INFO_CACHE_KEY = 'fund_mnf_info_cache'
const MNF_INFO_CACHE_TIME_KEY = 'fund_mnf_info_cache_time'

/** 从 localStorage 加载缓存的 MNFInfo */
function loadMNFInfoCache(): Map<string, any> {
  try {
    const cached = localStorage.getItem(MNF_INFO_CACHE_KEY)
    if (!cached) return new Map()
    const obj = JSON.parse(cached)
    return new Map(Object.entries(obj))
  } catch {
    return new Map()
  }
}

/** 保存 MNFInfo 到 localStorage */
function saveMNFInfoCache(map: Map<string, any>): void {
  try {
    const obj = Object.fromEntries(map)
    localStorage.setItem(MNF_INFO_CACHE_KEY, JSON.stringify(obj))
    localStorage.setItem(MNF_INFO_CACHE_TIME_KEY, String(new Date().getTime()))
  } catch (err) {
    console.warn('[MNFInfo] 缓存保存失败:', err)
  }
}

/**
 * 通用的多层代理请求函数
 * 策略：1. 直接请求 → 2. fund-helper.ccwu.cc 路径转发 → 3. allorigins.win → 4. codetabs.com 双层代理 → 5. 返回失败
 */
async function fetchWithProxyFallback(url: string, timeout: number = 12000): Promise<any> {

  // 策略 1: 直接请求
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeout),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://fund.eastmoney.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Connection': 'keep-alive'
      }
    })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Direct fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data || !data.Success || data.ErrCode !== 0 || !data.Datas) {
      throw new Error(`API error: Success=${data?.Success}, ErrCode=${data?.ErrCode}`)
    }
    console.log('[Proxy] 直接请求成功')
    return data
  } catch (directError) {
    console.warn('[Proxy] 直接请求失败，尝试第一层代理...', directError)
  }

  // 策略 2: fund-helper.ccwu.cc 路径转发
  try {
    const proxy0Url = url.replace('https://fundmobapi.eastmoney.com', 'https://fund-helper.ccwu.cc')
    const res = await fetch(proxy0Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: fund-helper proxy fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data || !data.Success || data.ErrCode !== 0 || !data.Datas) {
      throw new Error(`fund-helper proxy API error: Success=${data?.Success}, ErrCode=${data?.ErrCode}`)
    }
    console.log('[Proxy] 第一层代理(fund-helper.ccwu.cc)请求成功')
    return data
  } catch (proxy0Error) {
    console.warn('[Proxy] 第一层代理(fund-helper)失败，尝试第二层代理...', proxy0Error)
  }

  // 策略 3: allorigins.win 代理
  try {
    // const proxy1Url = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url.replace('fundmobapi.eastmoney.com', atob('ZnVuZC5yYWJ0LnRvcA==')))}`
    // const proxy1Url = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const proxy1Url = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    const res = await fetch(proxy1Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Proxy1 fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data || !data.Success || data.ErrCode !== 0 || !data.Datas) {
      throw new Error(`Proxy1 API error: Success=${data?.Success}, ErrCode=${data?.ErrCode}`)
    }
    console.log('[Proxy] 第二层代理(allorigins.win)请求成功')
    return data
  } catch (proxy1Error) {
    console.warn('[Proxy] 第二层代理失败，尝试第三层代理...', proxy1Error)
  }

  // 策略 4: codetabs.com 双层代理
  try {
    // 第一步：编码目标API（用于第一层代理）
    const encodedTarget = encodeURIComponent(url)
    const firstLayerUrl = `https://api.allorigins.win/raw?url=${encodedTarget}`

    // 第二步：编码第一层URL（用于第二层代理）
    const encodedFirstLayer = encodeURIComponent(firstLayerUrl)
    const proxy2Url = `https://api.codetabs.com/v1/proxy/?quest=${encodedFirstLayer}`

    const res = await fetch(proxy2Url, { signal: AbortSignal.timeout(60000) })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: Proxy2 fetch failed`)
    }
    const data = await res.json().catch(() => null)
    if (!data || !data.Success || data.ErrCode !== 0 || !data.Datas) {
      throw new Error(`Proxy2 API error: Success=${data?.Success}, ErrCode=${data?.ErrCode}`)
    }
    console.log('[Proxy] 第三层代理(codetabs.com)请求成功')
    return data
  } catch (proxy2Error) {
    console.warn('[Proxy] 第三层代理也失败', proxy2Error)
    throw new Error('All proxy strategies failed')
  }
}

/**
 * 解析 MNFInfo 数据为 Map
 */
function parseMNFInfoData(data: any): Map<string, any> {
  const map = new Map<string, any>()
  const gztime = data?.Expansion?.GZTIME ?? ''

  if (data.Datas && Array.isArray(data.Datas)) {
    for (const fund of data.Datas) {
      map.set(fund.FCODE, {
        navchgrt: fund.NAVCHGRT,
        jzrq: fund.PDATE,
        dwjz: fund.NAV,
        name: fund.SHORTNAME,
        gszzl: fund.GSZZL,
        gztime
      })
    }
  }

  return map
}

/** 批量 MNFInfo - 支持缓存和后台刷新 */
export async function fetchBatchMNFInfo(codes: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!codes.length) return map

  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${codes.join(',')}`

  try {
    // 使用通用的多层代理请求函数
    const data = await fetchWithProxyFallback(url)
    const resultMap = parseMNFInfoData(data)

    // 请求成功，保存到缓存
    saveMNFInfoCache(resultMap)
    console.log('[MNFInfo] 请求成功，已保存缓存')
    return resultMap
  } catch (error) {
    // 所有请求策略都失败，尝试从缓存加载
    console.warn('[MNFInfo] 所有请求策略都失败，使用缓存数据', error)
    const cached = loadMNFInfoCache()

    // 过滤出当前需要的基金代码
    const filteredCache = new Map<string, any>()
    codes.forEach(code => {
      if (cached.has(code)) {
        filteredCache.set(code, cached.get(code))
      }
    })

    if (filteredCache.size > 0) {
      console.warn(`[MNFInfo] 从缓存加载了 ${filteredCache.size}/${codes.length} 个基金数据，这是旧数据！`)
    } else {
      console.error(`[MNFInfo] 缓存也为空，无法获取任何数据`)
    }

    return filteredCache
  }
}

async function fetchFundFromMNFInfo(code: string): Promise<any | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${code}`

  try {
    // 使用通用的多层代理请求函数
    const data = await fetchWithProxyFallback(url)

    if (!data.Datas?.length) {
      return null
    }

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
  } catch (error) {
    console.warn('[MNFInfo] fetchFundFromMNFInfo 失败:', error)
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

/** 后台刷新 MNFInfo 的 Promise，避免重复请求 */
let backgroundMNFRefreshPromise: Promise<Map<string, any>> | null = null
let lastMNFRefreshTime: number = localStorage.getItem(MNF_INFO_CACHE_TIME_KEY) ? parseInt(localStorage.getItem(MNF_INFO_CACHE_TIME_KEY)!, 10) : 0
const MNF_REFRESH_INTERVAL = 15 * 60 * 1000  // 15分钟强制刷新一次

export function clearLastMNFRefreshTime() {
  lastMNFRefreshTime = 0
}

/** 缓存更新回调函数列表 */
const cacheUpdateCallbacks: Array<() => void> = []

/** 注册缓存更新回调 */
export function onMNFInfoCacheUpdate(callback: () => void): () => void {
  cacheUpdateCallbacks.push(callback)
  // 返回取消注册的函数
  return () => {
    const index = cacheUpdateCallbacks.indexOf(callback)
    if (index > -1) {
      cacheUpdateCallbacks.splice(index, 1)
    }
  }
}

/** 触发所有缓存更新回调 */
function triggerCacheUpdateCallbacks(): void {
  cacheUpdateCallbacks.forEach(callback => {
    try {
      callback()
    } catch (err) {
      console.error('[MNFInfo] 缓存更新回调执行失败:', err)
    }
  })
}

/** 后台异步刷新 MNFInfo，不阻塞主流程 */
function refreshMNFInfoInBackground(codes: string[]): void {
  if (!codes.length) return

  const now = Date.now()
  const needsForceRefresh = now - lastMNFRefreshTime > MNF_REFRESH_INTERVAL

  if (backgroundMNFRefreshPromise) {
    // 如果已有后台刷新任务在进行中，跳过
    console.log('[MNFInfo] 已有后台刷新任务在进行中，本次请求已跳过')
    return
  }

  if (!needsForceRefresh) {
    // 如果距离上次刷新时间不足 15 分钟，跳过本次刷新
    console.log('[MNFInfo] 距离上次刷新时间不足 15 分钟，本次请求已跳过')
    return
  }

  backgroundMNFRefreshPromise = fetchBatchMNFInfo(codes)
    .then(map => {
      lastMNFRefreshTime = Date.now()
      if (map.size > 0) {
        console.log(`[MNFInfo] 后台刷新完成，成功获取了 ${map.size} 个基金的最新数据`)
        // 触发缓存更新回调
        triggerCacheUpdateCallbacks()
      } else {
        console.warn(`[MNFInfo] 后台刷新完成，但没有获取到任何新数据（可能是缓存或网络问题）`)
      }
      return map
    })
    .catch(err => {
      console.warn('[MNFInfo] 后台刷新异常:', err)
      return new Map<string, any>()
    })
    .finally(() => {
      backgroundMNFRefreshPromise = null
    })
}

/** 等待后台 MNFInfo 刷新完成（如果有的话）（可选，if需要） */
export async function waitForMNFInfoRefresh(): Promise<void> {
  if (backgroundMNFRefreshPromise) {
    await backgroundMNFRefreshPromise
  }
}

export async function getFundData(
  configs: Fund[],
  previousData: FundInfo[] = []
): Promise<FundInfo[]> {
  if (configs.length === 0) return []

  const codes = configs.map(c => c.code)

  // 先从缓存加载 MNFInfo，不等待网络请求
  let mnfInfoMap = loadMNFInfoCache()

  // 过滤出当前需要的基金代码
  const filteredMNFInfo = new Map<string, any>()
  codes.forEach(code => {
    if (mnfInfoMap.has(code)) {
      filteredMNFInfo.set(code, mnfInfoMap.get(code))
    }
  })
  // 启动后台刷新任务（不等待）
  refreshMNFInfoInBackground(codes)

  // 只等待 fundgz 接口
  const gzResults = await Promise.allSettled(
    configs.map(c => fetchSingleFundValuation(c.code))
  )

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

    fundList.push(toFundInfoFromMerge(cfg, val, filteredMNFInfo))
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

/** localStorage 缓存键 - 板块信息 */
const RELATE_THEME_CACHE_KEY = 'fund_relate_theme_cache'
const RELATE_THEME_CACHE_TIME_KEY = 'fund_relate_theme_cache_time'

/** 板块信息缓存有效期：24小时 */
const RELATE_THEME_CACHE_DURATION = 24 * 60 * 60 * 1000

/** 占位符：表示该基金没有板块信息 */
const RELATE_THEME_PLACEHOLDER = '--'

/** 内存缓存（一级缓存） */
let memoryRelateThemeCache: Record<string, string> | null = null
let memoryCacheTime: number | null = null

/** 从 localStorage 加载板块信息缓存 */
function loadRelateThemeCache(): Record<string, string> {
  // 先检查内存缓存
  if (memoryRelateThemeCache !== null && memoryCacheTime !== null) {
    const now = Date.now()
    if (now - memoryCacheTime <= RELATE_THEME_CACHE_DURATION) {
      return memoryRelateThemeCache
    }
    // 内存缓存过期，清除
    memoryRelateThemeCache = null
    memoryCacheTime = null
  }

  // 从 localStorage 加载
  try {
    const cached = localStorage.getItem(RELATE_THEME_CACHE_KEY)
    const cacheTime = localStorage.getItem(RELATE_THEME_CACHE_TIME_KEY)

    if (!cached || !cacheTime) return {}

    // 检查缓存是否过期
    const now = Date.now()
    const cachedAt = parseInt(cacheTime, 10)
    if (now - cachedAt > RELATE_THEME_CACHE_DURATION) {
      console.log('[RelateTheme] 缓存已过期，清除缓存')
      localStorage.removeItem(RELATE_THEME_CACHE_KEY)
      localStorage.removeItem(RELATE_THEME_CACHE_TIME_KEY)
      return {}
    }

    const data = JSON.parse(cached)
    // 更新内存缓存
    memoryRelateThemeCache = data
    memoryCacheTime = cachedAt
    return data
  } catch {
    return {}
  }
}

/** 保存板块信息到 localStorage */
function saveRelateThemeCache(data: Record<string, string>): void {
  try {
    const existing = loadRelateThemeCache()
    const merged = { ...existing, ...data }

    // 保存到 localStorage
    localStorage.setItem(RELATE_THEME_CACHE_KEY, JSON.stringify(merged))
    const now = Date.now()
    localStorage.setItem(RELATE_THEME_CACHE_TIME_KEY, now.toString())

    // 更新内存缓存
    memoryRelateThemeCache = merged
    memoryCacheTime = now

    console.log(`[RelateTheme] 已缓存 ${Object.keys(data).length} 个基金的板块信息`)
  } catch (err) {
    console.warn('[RelateTheme] 缓存保存失败:', err)
  }
}

/** 获取需要请求的基金代码（过滤掉已缓存的） */
function getUncachedFundCodes(fundCodes: string[]): string[] {
  const cache = loadRelateThemeCache()
  return fundCodes.filter(code => {
    const cached = cache[code]
    // 如果没有缓存，或者缓存的是占位符，都需要重新请求
    // 占位符表示之前没找到，但是呢有没有可能他就是没有板块信息，所以我们也可以选择不请求，因为没信息没必要重复请求
    return !cached
  })
}

// 简单的 UUID 生成器
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export async function fetchFundRelateTheme(fundCodes: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {}
  if (fundCodes.length === 0 || fundCodes.length > 10) return result

  // 先从缓存加载
  const cache = loadRelateThemeCache()
  fundCodes.forEach(code => {
    if (cache[code]) {
      result[code] = cache[code]
    }
  })

  // 获取未缓存的基金代码
  const uncachedCodes = getUncachedFundCodes(fundCodes)

  if (uncachedCodes.length === 0) {
    // console.log(`[RelateTheme] 全部命中缓存，跳过请求`)
    return result
  }

  console.log(`[RelateTheme] 缓存命中 ${fundCodes.length - uncachedCodes.length}/${fundCodes.length}，请求 ${uncachedCodes.length} 个`)

  const fcode = uncachedCodes.join(',')
  const params = new URLSearchParams({
    deviceid: generateUUID(),
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
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    try {
      const res = await fetch(RELATE_THEME_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (!res.ok) return result
      const json = await res.json().catch(() => null)

      // 处理 fundRelateTheme 字段（优先级最高）
      const themes: any[] = json?.data?.fundRelateTheme ?? []
      const themeByFund: Record<string, any[]> = {}
      themes.forEach((theme: any) => {
        const fc = theme.FCODE
        if (!themeByFund[fc]) themeByFund[fc] = []
        themeByFund[fc].push(theme)
      })

      const newData: Record<string, string> = {}

      // 从 fundRelateTheme 获取板块信息
      Object.keys(themeByFund).forEach(fcode => {
        const arr = themeByFund[fcode]!
        arr.sort((a, b) => (b.CORR_1Y || 0) - (a.CORR_1Y || 0))
        const themeName = String(arr[0]?.SEC_NAME ?? '')
        if (themeName) {
          result[fcode] = themeName
          newData[fcode] = themeName
        }
      })

      // 处理 baseInfo 字段（作为补充）
      const baseInfo: any[] = json?.data?.baseInfo ?? []
      baseInfo.forEach((info: any) => {
        const fcode = info.FCODE
        // 如果已经从 fundRelateTheme 获取到了，就跳过
        if (result[fcode]) return

        // 优先使用 INDEXNAME（指数名称），其次使用 TTYPENAME（类型名称）
        const themeName = info.INDEXNAME || info.TTYPENAME || ''
        if (themeName) {
          result[fcode] = themeName
          newData[fcode] = themeName
        }
      })

      // 为没有获取到板块信息的基金添加占位符
      uncachedCodes.forEach(code => {
        if (!result[code]) {
          result[code] = RELATE_THEME_PLACEHOLDER
          newData[code] = RELATE_THEME_PLACEHOLDER
        }
      })

      // 保存新获取的数据到缓存
      if (Object.keys(newData).length > 0) {
        saveRelateThemeCache(newData)
      }
    } catch (err) {
      clearTimeout(timeoutId)
      /* ignore fetch/abort errors */
    }
  } catch {
    /* ignore */
  }

  return result
}
