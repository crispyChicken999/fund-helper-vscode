/**
 * 基金详情页 API — 全面使用 JSONP（无代理）
 *
 * 接口策略：
 * - 基金概况：JSONP → FundBaseTypeInformation.ashx
 * - 基金经理 + 关联板块：JSONP → jjxqy1_2（POST 不支持 JSONP，改用 fundmobapi）
 *   实际使用 dgs.tiantianfunds.com 的 jjxqy1_2 接口通过 fetch POST
 *   但由于 CORS 限制，改为使用 JSONP 方式的 FundMApi 接口
 * - 历史净值：JSONP → FundNetDiagram.ashx
 * - 累计收益：fetch → dataapi.1234567.com.cn（无 CORS）
 * - 持仓明细：proxyFetch → FundMNInverstPosition（需代理）
 */

import { loadJSONP, fetchJSON } from '@/utils/jsonp'
import { proxyFetch } from '@/api/proxy'

// ==================== 类型定义 ====================

export interface FundOverview {
  ftype: string
  riskLevel: string
  estabDate: string
  endNav: string
  company: string
  managerName: string
  nav: string
  navDate: string
  accNav: string
  buyStatus: string
  sellStatus: string
  indexName: string
  bench: string
}

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

export interface FundManager {
  name: string
  avatar: string
  startDate: string
  returnRate: string
  totalDays: number
  years: string
  yieldSe: string
  fundCount: number
  investmentIdea: string
  resume: string
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

export interface YieldRecord {
  date: string
  yield: number
  indexYield: number
  fundTypeYield: number
}

// ==================== 基金概况（JSONP） ====================

export async function fetchFundOverview(code: string): Promise<{
  overview: FundOverview | null
  periodIncrease: PeriodIncreaseData | null
}> {
  const url = `https://fundmobapi.eastmoney.com/FundMApi/FundBaseTypeInformation.ashx?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&_=${Date.now()}`

  try {
    const res = await loadJSONP<any>(url)
    if (!res || !res.Datas) return { overview: null, periodIncrease: null }

    const d = res.Datas

    const overview: FundOverview = {
      ftype: d.FTYPE || '',
      riskLevel: d.RISKLEVEL || '',
      estabDate: d.ESTABDATE || '',
      endNav: d.ENDNAV ? formatScale(d.ENDNAV) : '',
      company: d.JJGS || '',
      managerName: d.JJJL || '',
      nav: d.DWJZ || '',
      navDate: d.FSRQ || '',
      accNav: d.LJJZ || '',
      buyStatus: d.SGZT || '',
      sellStatus: d.SHZT || '',
      indexName: '',
      bench: ''
    }

    const periodIncrease: PeriodIncreaseData = {
      weekRate: d.SYL_Z || '',
      monthRate: d.SYL_Y || '',
      monthRank: d.RANKM || '',
      threeMonthRate: d.SYL_3Y || '',
      threeMonthRank: d.RANKQ || '',
      sixMonthRate: d.SYL_6Y || '',
      sixMonthRank: d.RANKHY || '',
      yearRate: d.SYL_1N || '',
      yearRank: d.RANKY || '',
      threeYearRate: d.SYL_3N || '',
      threeYearRank: d.RANK3N || '',
      fiveYearRate: d.SYL_5N || '',
      fiveYearRank: d.RANK5N || '',
      sinceEstablishRate: d.SYL_LN || ''
    }

    return { overview, periodIncrease }
  } catch {
    return { overview: null, periodIncrease: null }
  }
}

function formatScale(val: any): string {
  const num = parseFloat(val)
  if (isNaN(num)) return val?.toString() || ''
  if (num >= 100000000) return (num / 100000000).toFixed(2)
  if (num >= 10000) return (num / 10000).toFixed(2) + ' 万'
  return num.toFixed(2)
}

// ==================== 基金经理 + 关联板块（jjxqy1_2 via fetch POST） ====================

const DETAIL_URL = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2'

export async function fetchManagerAndThemes(code: string): Promise<{
  managers: FundManager[]
  themes: RelateThemeItem[]
}> {
  const params = new URLSearchParams({
    deviceid: 'fd7dac76-c5e9-4723-8fe6-7b436b2b1443',
    version: '9.9.9',
    appVersion: '6.5.5',
    product: 'EFund',
    plat: 'Web',
    uid: '',
    fcode: code,
    ISRG: '0',
    indexfields: '_id,INDEXCODE,BKID,INDEXNAME,INDEXVALUA,NEWINDEXTEXCH,PEP100',
    fields: 'BENCH,ESTDIFF,INDEXNAME,LINKZSB,INDEXCODE,NEWTEXCH,FTYPE,FCODE,BAGTYPE,RISKLEVEL,TTYPENAME,ESTABDATE,JJGS,JJGSID,ENDNAV,SHORTNAME,TTYPE,FSRQ,DWJZ,LJJZ,SYL_1N,SYL_LN,SYL_Z,SOURCERATE,RATE',
    fundUniqueInfo_fIELDS: 'FCODE,SHARP1,SHARP_1NRANK,MAXRETRA1,MAXRETRA_1NRANK',
    fundUniqueInfo_fLFIELDS: 'FCODE,BUSINESSTYPE,BUSINESSTEXT,BUSINESSCODE,BUSINESSSUBTYPE,MARK',
    cfhFundFInfo_fields: 'INVESTMENTIDEAR,INVESTMENTIDEARIMG',
    relateThemeFields: 'FCODE,SEC_CODE,SEC_NAME,CORR_1Y,OL2TOP'
  })

  try {
    const res = await fetch(DETAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://h5.1234567.com.cn',
        'Referer': 'https://servicewechat.com/'
      },
      body: params.toString(),
      signal: AbortSignal.timeout(12000)
    })
    if (!res.ok) return { managers: [], themes: [] }
    const json = await res.json()

    // 解析经理 — 使用 FundManagerInformation.currentManagerInfos
    const managers: FundManager[] = []
    const managerInfos: any[] = json?.data?.FundManagerInformation?.currentManagerInfos ?? []
    for (const manager of managerInfos) {
      const sInfo = manager.SINFO || {}
      const pInfo = (manager.PINFO && manager.PINFO.length > 0) ? manager.PINFO[0] : {}

      const name = sInfo.MGRNAME || pInfo.MGRNAME || ''
      const totalDays = parseInt(sInfo.TOTALDAYS) || 0
      const penavGrowth = parseFloat(sInfo.PENAVGROWTH) || 0
      const yieldSe = parseFloat(pInfo.YIELDSE) || 0

      const years = Math.floor(totalDays / 365)
      const months = Math.floor((totalDays % 365) / 30)
      const tenureText = years > 0 ? `${years}年${months}个月` : `${months}个月`

      managers.push({
        name,
        avatar: pInfo.NEWPHOTOURL || '',
        startDate: sInfo.FEMPDATE || '',
        returnRate: penavGrowth.toFixed(2),
        totalDays,
        years: tenureText,
        yieldSe: yieldSe.toFixed(2),
        fundCount: parseInt(sInfo.TOTALFUNDCOUNT) || 0,
        investmentIdea: pInfo.INVESTMENTIDEAR || '',
        resume: pInfo.RESUME.replace(/。/g, '。<br/>&nbsp;&nbsp;&nbsp;&nbsp;').replace(/、/g, '、<br/>&nbsp;&nbsp;•&nbsp;') || ''
      })
    }

    // 解析关联板块
    const themeList: any[] = json?.data?.fundRelateTheme ?? []
    const themes: RelateThemeItem[] = themeList
      .filter((t: any) => t.FCODE === code)
      .map((t: any) => ({
        secName: t.SEC_NAME || '',
        corr1y: parseFloat(t.CORR_1Y) || 0,
        ol2top: parseFloat(t.OL2TOP) || 0
      }))
      .sort((a, b) => b.corr1y - a.corr1y)

    return { managers, themes }
  } catch {
    return { managers: [], themes: [] }
  }
}

// ==================== 历史净值（JSONP） ====================

const RANGE_MAP: Record<string, string> = {
  '1w': 'y',
  '1m': 'y',
  '3m': 'jn',
  '6m': 'jn',
  '1y': 'y',
  '3y': '3y',
  '5y': 'ln'
}

const RANGE_DAYS: Record<string, number> = {
  '1w': 5,
  '1m': 22,
  '3m': 66,
  '6m': 132,
  '1y': 9999,
  '3y': 9999,
  '5y': 9999
}

export async function fetchNetValueHistory(
  code: string,
  range: string = '1m'
): Promise<NetValueRecord[]> {
  const actualRange = RANGE_MAP[range] || 'y'
  const url = `https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx?FCODE=${code}&RANGE=${actualRange}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&_=${Date.now()}`

  try {
    const data = await loadJSONP<any>(url)
    if (!data || !data.Datas || data.Datas.length === 0) return []

    let dataList = data.Datas
    const maxDays = RANGE_DAYS[range] || 9999
    if (maxDays < dataList.length) {
      dataList = dataList.slice(-maxDays)
    }

    return dataList.map((item: any) => ({
      date: item.FSRQ || '',
      netValue: parseFloat(item.DWJZ) || 0,
      accNetValue: parseFloat(item.LJJZ) || 0,
      changePercent: parseFloat(item.JZZZL) || 0
    }))
  } catch {
    return []
  }
}

// ==================== 累计收益（直接 fetch，无 CORS） ====================

export async function fetchHistoryYield(
  code: string,
  range: string = '1m'
): Promise<YieldRecord[]> {
  const actualRange = RANGE_MAP[range] || 'y'
  const url = `https://dataapi.1234567.com.cn/dataapi/fund/FundVPageAcc?INDEXCODE=000300&CODE=${code}&FCODE=${code}&RANGE=${actualRange}&deviceid=Wap&product=EFund`

  try {
    const json = await fetchJSON<any>(url)
    if (!json || json.errorCode !== 0 || !json.data || json.data.length === 0) return []

    let dataList = json.data
    const maxDays = RANGE_DAYS[range] || 9999
    if (maxDays < dataList.length) {
      dataList = dataList.slice(-maxDays)
    }

    return dataList.map((item: any) => ({
      date: item.pdate || '',
      yield: parseFloat(item.yield) || 0,
      indexYield: parseFloat(item.indexYield) || 0,
      fundTypeYield: parseFloat(item.fundTypeYield) || 0
    }))
  } catch {
    return []
  }
}

// ==================== 持仓明细 ====================

export interface PositionStock {
  /** 股票代码 */
  code: string
  /** 股票简称 */
  name: string
  /** 持仓占比（%） */
  ratio: number
  /** 较上期变动类型：新增 / 增持 / 减持 / 不变 */
  changeType: string
  /** 较上期变动幅度（%），新增时等于 ratio */
  changeRatio: number
  /** 实时价格 */
  price: number | null
  /** 实时涨跌幅（%） */
  changePercent: number | null
  /** 新市场号，用于拼接实时行情 secid */
  newTexch: string
  /** 所属行业 */
  indexName: string
}

export interface PositionBond {
  /** 债券代码 */
  code: string
  /** 债券名称 */
  name: string
  /** 占净值比（%） */
  ratio: number
}

export interface PositionData {
  /** 截止日期 */
  expansion: string
  stocks: PositionStock[]
  bonds: PositionBond[]
}

export async function fetchInvestmentPosition(code: string): Promise<PositionData | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=${Date.now()}`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data?.Datas) return null

    const datas = data.Datas
    const expansion: string = data.Expansion || ''

    // 解析股票持仓（先不含实时行情，行情单独请求）
    const rawStocks: any[] = datas.fundStocks ?? []
    const stocks: PositionStock[] = rawStocks.map((s: any) => ({
      code: s.GPDM || '',
      name: s.GPJC || '',
      ratio: parseFloat(s.JZBL) || 0,
      changeType: s.PCTNVCHGTYPE || '',
      changeRatio: parseFloat(s.PCTNVCHG) || 0,
      price: null,
      changePercent: null,
      newTexch: s.NEWTEXCH || '0',
      indexName: s.INDEXNAME || ''
    }))

    // 解析债券持仓
    const rawBonds: any[] = datas.fundboods ?? []
    const bonds: PositionBond[] = rawBonds.map((b: any) => ({
      code: b.ZQDM || '',
      name: b.ZQMC || '',
      ratio: parseFloat(b.ZJZBL) || 0
    }))

    // 批量拉取股票实时行情
    if (stocks.length > 0) {
      const secids = stocks.map(s => `${s.newTexch}.${s.code}`).join(',')
      const quoteUrl = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f2,f3&fltt=2&secids=${secids}&_=${Date.now()}`
      try {
        const quoteRes = await fetch(quoteUrl, { signal: AbortSignal.timeout(8000) }).catch(() => null)
        if (quoteRes?.ok) {
          const quoteData = await quoteRes.json().catch(() => null)
          const diff: any[] = quoteData?.data?.diff ?? []
          diff.forEach((q: any, i: number) => {
            if (stocks[i]) {
              stocks[i]!.price = typeof q.f2 === 'number' ? q.f2 : null
              stocks[i]!.changePercent = typeof q.f3 === 'number' ? q.f3 : null
            }
          })
        }
      } catch { /* 行情失败不影响持仓展示 */ }
    }

    return { expansion, stocks, bonds }
  } catch {
    return null
  }
}

// ==================== 兼容旧接口 ====================

export async function fetchFundDetailInfo(code: string) {
  const [{ overview }, { managers }] = await Promise.all([
    fetchFundOverview(code),
    fetchManagerAndThemes(code)
  ])
  return { overview, managers }
}

export async function fetchRelateThemes(code: string): Promise<RelateThemeItem[]> {
  const { themes } = await fetchManagerAndThemes(code)
  return themes
}

export async function fetchPeriodIncrease(code: string): Promise<PeriodIncreaseData | null> {
  const { periodIncrease } = await fetchFundOverview(code)
  return periodIncrease
}

export function getPageSize(range: string): number {
  return RANGE_DAYS[range] ?? 30
}
