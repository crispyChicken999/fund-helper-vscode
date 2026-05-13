/**
 * 基金详情页 API — 概况、经理、关联板块、历史净值
 */

// ==================== 类型定义 ====================

export interface FundOverview {
  ftype: string          // 基金类型
  riskLevel: string      // 风险等级
  estabDate: string      // 成立日期
  endNav: string         // 基金规模（亿元）
  company: string        // 基金公司
  indexName: string      // 跟踪指数
  trkError: string       // 跟踪误差
  bench: string          // 基准指数
  syl1n: string          // 近1年收益
  sylLn: string          // 近3年收益
  sylZ: string           // 成立来收益
  sourceRate: string     // 申购费率
  rate: string           // 管理费率
  sharp1: string         // 夏普比率1年
  maxRetra1: string      // 最大回撤1年
}

export interface FundManager {
  name: string
  startDate: string
  returnRate: string
  years: string
  fundCount: number
  description: string
}

export interface RelateThemeItem {
  secName: string
  corr1y: number
  ol2top: number
}

export interface NetValueRecord {
  date: string
  netValue: number
  accNetValue: number
  changePercent: number
}

// ==================== 基金概况 & 经理 ====================

const DETAIL_URL = '/api-proxy/tiantian/merge/m/api/jjxqy1_2'

export async function fetchFundDetailInfo(code: string): Promise<{
  overview: FundOverview | null
  managers: FundManager[]
}> {
  const params = new URLSearchParams({
    deviceid: '1d747ff7-7201-443e-95bd-2d13e30b96fe',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode: code,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME',
    fields: 'INDEXNAME,INDEXCODE,FCODE,TTYPENAME',
    fundUniqueInfo_fIELDS: 'FCODE,SHORTNAME,FTYPE,RISKLEVEL,ESTABDATE,ENDNAV,JJGS,INDEXNAME,TRKERROR,BENCH,SYL_1N,SYL_LN,SYL_Z,SOURCERATE,RATE,SHARP1,MAXRETRA1',
    fundUniqueInfo_fLFIELDS: 'FCODE',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  })

  try {
    const res = await fetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://h5.1234567.com.cn'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return { overview: null, managers: [] }
    const json = await res.json()

    // 解析概况
    const info = json?.data?.fundUniqueInfo ?? {}
    const overview: FundOverview = {
      ftype: info.FTYPE || info.TTYPENAME || '',
      riskLevel: info.RISKLEVEL || '',
      estabDate: info.ESTABDATE || '',
      endNav: info.ENDNAV || '',
      company: info.JJGS || '',
      indexName: info.INDEXNAME || '',
      trkError: info.TRKERROR || '',
      bench: info.BENCH || '',
      syl1n: info.SYL_1N || '',
      sylLn: info.SYL_LN || '',
      sylZ: info.SYL_Z || '',
      sourceRate: info.SOURCERATE || '',
      rate: info.RATE || '',
      sharp1: info.SHARP1 || '',
      maxRetra1: info.MAXRETRA1 || ''
    }

    // 解析经理
    const managers: FundManager[] = []
    const managerList: any[] = json?.data?.fundManagerList ?? []
    for (const m of managerList) {
      managers.push({
        name: m.MGRNAME || '',
        startDate: m.FEMPDATE || '',
        returnRate: m.PENAVGROWTH || '',
        years: m.TOTALDAYS ? `${Math.floor(parseInt(m.TOTALDAYS) / 365)}年` : '',
        fundCount: parseInt(m.TOTALFUNDCOUNT) || 0,
        description: m.INVESTMENTIDEAR || ''
      })
    }

    return { overview, managers }
  } catch {
    return { overview: null, managers: [] }
  }
}

// ==================== 关联板块 ====================

export async function fetchRelateThemes(code: string): Promise<RelateThemeItem[]> {
  const params = new URLSearchParams({
    deviceid: '1d747ff7-7201-443e-95bd-2d13e30b96fe',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode: code,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME',
    fields: 'INDEXNAME,INDEXCODE,FCODE,TTYPENAME',
    fundUniqueInfo_fIELDS: 'FCODE',
    fundUniqueInfo_fLFIELDS: 'FCODE',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  })

  try {
    const res = await fetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: 'https://h5.1234567.com.cn'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return []
    const json = await res.json()
    const themes: any[] = json?.data?.fundRelateTheme ?? []
    return themes
      .filter((t: any) => t.FCODE === code)
      .map((t: any) => ({
        secName: t.SEC_NAME || '',
        corr1y: parseFloat(t.CORR_1Y) || 0,
        ol2top: parseFloat(t.OL2TOP) || 0
      }))
      .sort((a, b) => b.corr1y - a.corr1y)
  } catch {
    return []
  }
}

// ==================== 历史净值 ====================

const PAGE_SIZE_MAP: Record<string, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
  '3y': 1095,
  '5y': 1825
}

export function getPageSize(range: string): number {
  return PAGE_SIZE_MAP[range] ?? 30
}

export async function fetchNetValueHistory(
  code: string,
  pageSize: number
): Promise<NetValueRecord[]> {
  const url = `/api-proxy/eastfund/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=${pageSize}&startDate=&endDate=&_=${Date.now()}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return []
    const data = await res.json()
    const list: any[] = data?.Data?.LSJZList ?? []
    return list.map(item => ({
      date: item.FSRQ || '',
      netValue: parseFloat(item.DWJZ) || 0,
      accNetValue: parseFloat(item.LJJZ) || 0,
      changePercent: parseFloat(item.JZZZL) || 0
    })).reverse() // API 返回倒序，翻转为正序
  } catch {
    return []
  }
}
