/**
 * 新浪财经基金估值接口 — JSONP 方式（绕过 CORS）
 * GET https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/FdFundService.getEstimateNetworthPic?symbol={code}&callback=xxx
 *
 * 替代 fundgz.1234567.com.cn JSONP 接口，获取基金实时估值数据
 */

import { loadJSONP } from '@/utils/jsonp'

// ==================== 请求类型 ====================

/** 新浪API 单条估值记录 */
export interface SinaNetworthItem {
  symbol: string
  /** 时间 HH:mm:ss */
  min_time: string
  /** 估算净值 */
  pre_nav: string
  /** 涨跌幅(%) */
  nav_pct: string
  pre_nav2: string
  nav2_pct: string
  /** 日期 YYYY-MM-DD */
  pre_date: string
  /** 涨跌幅(小数) */
  growthrate: number
  growthrate2: string
}

/** 新浪API 对比指数项 */
export interface SinaIndexRateItem {
  growthrate: number
  min_time: string
}

/** 新浪API 对比指数 */
export interface SinaIndexItem {
  name: string
  symbol: string
  rate: SinaIndexRateItem[]
}

/** 新浪API 返回的 data 部分 */
export interface SinaFundData {
  /** 昨日收盘净值 */
  worth: string
  /** 净值日期 YYYYMMDD */
  worth_date: string
  /** 长期回报率(小数) — 非当日涨跌幅 */
  worth_rate: number
  /** 详情页类型 */
  detail_page_type: number
  /** 自选页类型 */
  zx_page_type: number
  /** 交易时段 */
  time_range: string[][]
  /** 风险提示 */
  desc: {
    text_base: string
    text_link: string
    link_url: string
  }
  /** 上一期收益 */
  pre_income: string
  /** 分时估值数据 */
  networth: SinaNetworthItem[]
  /** 对比指数数据 */
  index: SinaIndexItem[]
}

/** 新浪API 完整响应（JSONP 回调参数） */
export interface SinaApiResponse {
  result: {
    status: { code: number }
    data: SinaFundData
  }
}

// ==================== 适配 fundgz 格式 ====================

/**
 * 新浪API 返回的、对齐 fundgz 格式的数据
 * 用于替换 fetchFundgzRawViaJsonp 的返回值
 */
export interface SinaFundgzCompat {
  fundcode: string
  /** 净值日期 YYYY-MM-DD（昨日收盘日期） */
  jzrq: string
  /** 估算净值（最新分时值） */
  gsz: string
  /** 估算涨跌幅(%) */
  gszzl: string
  /** 估值时间 YYYY-MM-DD HH:mm:ss */
  gztime: string
  /** 新浪返回的上一交易日净值，仅在天天基金基础数据暂不可用时使用 */
  dwjz: string
  /** 标记来源 */
  _fromSina: true
  /** 原始新浪数据（供图表等高级功能使用） */
  _sinaData: SinaFundData
}

// ==================== 工具函数 ====================

/** 将 YYYYMMDD 转为 YYYY-MM-DD */
function formatDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.substring(0, 4)}-${yyyymmdd.substring(4, 6)}-${yyyymmdd.substring(6, 8)}`
}

/** 新浪API 基础 URL */
const SINA_API_BASE = 'https://stock.finance.sina.com.cn/fundInfo/api/openapi.php/FdFundService.getEstimateNetworthPic'

/** 估算涨跌幅数据源字段 */
export type SinaPctSource = 'nav2' | 'nav'

// ==================== 主接口 ====================

/**
 * 通过新浪财经 API（JSONP）获取基金估值数据
 *
 * 策略：
 * 1. JSONP 请求新浪 API
 * 2. 成功 → 提取 networth 最后一条作为 gsz/gszzl
 * 3. networth 为空（未开盘/非交易日/不支持）→ 返回 null，由上层降级
 *
 * @param pctField 估算涨跌幅数据源：'nav'（nav_pct，默认，更贴近最终净值） | 'nav2'（nav2_pct，偏大）
 * @returns 对齐 fundgz 格式的对象，失败返回 null
 */
export async function fetchSinaFundValuation(code: string, pctField: SinaPctSource = 'nav'): Promise<SinaFundgzCompat | null> {
  const url = `${SINA_API_BASE}?symbol=${code}`

  try {
    // 使用 JSONP 绕过 CORS 限制（新浪不支持跨域 fetch）
    const json = await loadJSONP<SinaApiResponse>(url, 10000, 'callback')

    if (!json?.result?.data || json.result.status?.code !== 0) {
      console.warn(`[SinaAPI] Invalid response for ${code}:`, json?.result?.status)
      return null
    }

    const data = json.result.data
    const networthArr = data.networth

    // networth 为空 → 未开盘/非交易日/不支持的基金类型 → 返回 null
    if (!networthArr || !Array.isArray(networthArr) || networthArr.length === 0) {
      console.log(`[SinaAPI] No networth data for ${code} (market closed or unsupported)`)
      return null
    }

    // 去掉收盘后的填充数据点（接口在15:00后持续返回相同估值的平直数据）
    let latestIdx = networthArr.length - 1
    const afternoonClose = data.time_range?.[1]?.[1] || '15:00'
    const closeTime = afternoonClose + ':00'
    const trimmed = latestIdx
    while (latestIdx > 0 && networthArr[latestIdx].min_time > closeTime) {
      latestIdx--
    }
    const didTrim = latestIdx < trimmed

    const latest = networthArr[latestIdx]!
    const jzrq = formatDate(data.worth_date)
    // 收盘后已裁剪 → gztime 固定为收盘时间，避免 14:59 这种非整点时间
    const timeStr = didTrim ? afternoonClose : (latest.min_time?.substring(0, 5) || '')
    const gztime = `${latest.pre_date || jzrq} ${timeStr || ''}`

    return {
      fundcode: code,
      jzrq,
      gsz: latest.pre_nav || data.worth || '',
      gszzl: pctField === 'nav' ? (latest.nav_pct || '0') : (latest.nav2_pct || '0'),
      gztime,
      dwjz: data.worth || '',
      _fromSina: true,
      _sinaData: data,
    }
  } catch (err) {
    console.warn(`[SinaAPI] JSONP error for ${code}:`, err)
    return null
  }
}

/**
 * 批量获取多个基金的估值数据
 * 并发请求，自动处理失败
 */
export async function fetchMultipleSinaValuations(
  codes: string[],
  pctField: SinaPctSource = 'nav',
): Promise<Map<string, SinaFundgzCompat>> {
  const results = new Map<string, SinaFundgzCompat>()

  // 限制并发数
  const batchSize = 5
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    const batchResults = await Promise.allSettled(
      batch.map(code => fetchSinaFundValuation(code, pctField)),
    )

    batchResults.forEach((result, j) => {
      if (result.status === 'fulfilled' && result.value) {
        const code = batch[j]!
        results.set(code, result.value)
      }
    })
  }

  return results
}
