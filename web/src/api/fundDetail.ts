/**
 * 基金详情页 API — 概况、经理、关联板块、历史净值
 */

import { proxyFetch } from '@/api/proxy'

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

const DETAIL_URL = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2'

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
    const res = await proxyFetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
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
    const res = await proxyFetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
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
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=${pageSize}&startDate=&endDate=&_=${Date.now()}`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(15000) })
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

// ==================== 基金详情（FundMNDetail）====================

export interface FundMNDetailData {
  fundType: string
  estabDate: string
  company: string
  managerName: string
  nav: string
  navDate: string
  accNav: string
  fundScale: string
  buyStatus: string
  sellStatus: string
}

export async function fetchFundMNDetail(code: string): Promise<FundMNDetailData | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNDetail?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return null
    const data = await res.json().catch(() => null)
    const d = data?.Datas ?? null
    if (!d) return null
    return {
      fundType: d.FTYPE || '',
      estabDate: d.ESTABDATE || '',
      company: d.JJGS || '',
      managerName: d.JJJL || '',
      nav: d.DWJZ || '',
      navDate: d.FSRQ || '',
      accNav: d.LJJZ || '',
      fundScale: d.ENDNAV || '',
      buyStatus: d.SGZT || '',
      sellStatus: d.SHZT || ''
    }
  } catch {
    return null
  }
}

// ==================== 阶段收益率（FundMNPeriodIncrease）====================

export interface PeriodIncreaseData {
  weekRate: string
  monthRate: string
  monthRank: string
  threeMonthRate: string
  threeMonthRank: string
  sixMonthRate: string
  sixMonthRank: string
  yearRate: string
  yearRank: string
  threeYearRate: string
  threeYearRank: string
  fiveYearRate: string
  fiveYearRank: string
  sinceEstablishRate: string
}

export async function fetchPeriodIncrease(code: string): Promise<PeriodIncreaseData | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNPeriodIncrease?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return null
    const data = await res.json().catch(() => null)
    const d = data?.Datas ?? null
    if (!d) return null
    return {
      weekRate: d.SYL_Z || '',
      monthRate: d.SYL_Y || '',
      monthRank: d.RANK_Y || '',
      threeMonthRate: d.SYL_3Y || '',
      threeMonthRank: d.RANK_3Y || '',
      sixMonthRate: d.SYL_6Y || '',
      sixMonthRank: d.RANK_6Y || '',
      yearRate: d.SYL_1N || '',
      yearRank: d.RANK_1N || '',
      threeYearRate: d.SYL_3N || '',
      threeYearRank: d.RANK_3N || '',
      fiveYearRate: d.SYL_5N || '',
      fiveYearRank: d.RANK_5N || '',
      sinceEstablishRate: d.SYL_LN || ''
    }
  } catch {
    return null
  }
}

// ==================== 基金经理（FundMNManager）====================

export interface FundManagerDetail {
  name: string
  startDate: string
  totalDays: number
  totalReturn: string
  years: string
  fundCount: number
}

export async function fetchFundMNManager(code: string): Promise<FundManagerDetail[]> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNManager?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
    if (!res?.ok) return []
    const data = await res.json().catch(() => null)
    return (data?.Datas ?? []).map((m: any) => ({
      name: m.MGRNAME || '',
      startDate: m.FEMPDATE || '',
      totalDays: parseInt(m.DAYS) || 0,
      totalReturn: m.PENAVGROWTH || '',
      years: m.TOTALDAYS ? `${Math.floor(parseInt(m.TOTALDAYS) / 365)}年` : '',
      fundCount: parseInt(m.TOTALFUNDCOUNT) || 0
    }))
  } catch {
    return []
  }
}
