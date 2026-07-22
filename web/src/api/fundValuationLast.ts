/**
 * 天天基金 FundValuationLast 接口 — 批量获取基金实时估值
 * GET https://fundcomapi.tiantianfunds.com/mm/newCore/FundValuationLast?FCODES=...&FIELDS=...
 * 备用域名: fundcomapi.eastmoney.com
 *
 * 替代原 fundgz JSONP，单次请求批量获取所有基金的实时估值
 */

/** FundValuationLast 接口返回的原始条目 */
export interface FundValuationLastRaw {
  FCODE: string
  SHORTNAME: string
  /** 实时估值（number 或 null） */
  GSZ: number | null
  /** 估值涨跌幅（number 或 null） */
  GSZZL: number | null
  /** 估值时间 "YYYY-MM-DD HH:mm" */
  GZTIME: string | null
  /** 单位净值 */
  NAV: number
  /** 净值日期 YYYY-MM-DD */
  PDATE: string
}

/** 规范化日期：YYYYMMDD → YYYY-MM-DD */
function normalizeDate(yyyymmdd: string): string {
  if (!yyyymmdd || yyyymmdd.length !== 8) return yyyymmdd
  return `${yyyymmdd.substring(0, 4)}-${yyyymmdd.substring(4, 6)}-${yyyymmdd.substring(6, 8)}`
}

/** 规范化 FundValuationLast 返回的 GZTIME */
function normalizeGztime(gztime: string | null, pdate: string): string {
  if (!gztime) return ''
  // 仅时间 "HH:mm:ss" 或 "HH:mm" → 拼接 PDATE 日期
  if (gztime.length <= 8) {
    return `${pdate} ${gztime.substring(0, 5)}`
  }
  // 全日期时间 "YYYYMMDD HH:mm:ss" → 转为 YYYY-MM-DD HH:mm
  if (gztime.indexOf('-') === -1 && gztime.length >= 8) {
    const d = gztime.substring(0, 8)
    const t = gztime.length > 9 ? gztime.substring(9, 14) : gztime.substring(8, 13)
    return `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)} ${t}`
  }
  // "YYYY-MM-DD HH:mm:ss" → 截断秒
  return gztime.substring(0, 16)
}

/**
 * 单次 fetch 请求（带超时）
 */
async function fetchOnce(url: string, timeoutMs: number = 10000): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'Accept': 'application/json' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

/**
 * 批量获取基金实时估值
 *
 * 策略（Web 端有 CORS 限制）：
 * 1. 直接请求 fundcomapi.tiantianfunds.com
 * 2. 备用域名 fundcomapi.eastmoney.com
 * 3. 通过 api.fund-helper.ccwu.cc 代理转发
 */
export async function fetchBatchFundValuationLast(
  codes: string[],
): Promise<Map<string, FundValuationLastRaw>> {
  const map = new Map<string, FundValuationLastRaw>()
  if (!codes.length) return map

  const params = new URLSearchParams({
    FCODES: codes.join(','),
    FIELDS: 'FCODE,SHORTNAME,GSZZL,GZTIME,GSZ,NAV,PDATE',
  })

  // 构建多级降级 URL 列表
  const urlCandidates: string[] = [
    `https://fundcomapi.tiantianfunds.com/mm/newCore/FundValuationLast?${params}`,
    `https://fundcomapi.eastmoney.com/mm/newCore/FundValuationLast?${params}`,
    // 代理: 替换主域为 fund-helper 代理
    `https://api.fund-helper.ccwu.cc/mm/newCore/FundValuationLast?${params}`,
  ]

  for (const url of urlCandidates) {
    try {
      const json = await fetchOnce(url)
      if (!json) continue

      // 兼容多种响应格式
      let datas: any[] = []
      if (Array.isArray(json)) {
        datas = json
      } else if (json.data && Array.isArray(json.data)) {
        datas = json.data
      } else if (json.Datas && Array.isArray(json.Datas)) {
        datas = json.Datas
      } else if (json.Data && Array.isArray(json.Data)) {
        datas = json.Data
      }

      for (const item of datas) {
        if (item.FCODE) {
          const pdate = normalizeDate(item.PDATE || '')
          map.set(item.FCODE, {
            FCODE: item.FCODE,
            SHORTNAME: item.SHORTNAME,
            GSZ: item.GSZ,
            GSZZL: item.GSZZL,
            GZTIME: normalizeGztime(item.GZTIME, pdate),
            NAV: item.NAV,
            PDATE: pdate,
          })
        }
      }
      break // 成功则跳出
    } catch {
      continue // 尝试下一个 URL
    }
  }

  return map
}
