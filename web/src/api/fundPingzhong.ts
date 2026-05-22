/**
 * 东方财富 pingzhongdata 接口封装
 * URL: https://fund.eastmoney.com/pingzhongdata/{code}.js
 * Content-Type: application/javascript — 可直接用 <script> 标签加载，不受 ORB 限制
 *
 * 用途：作为 fundgz 接口的 fallback（当 fundgz 返回空对象时）
 * 主要利用 Data_ACWorthTrend 计算昨日净值和涨跌幅
 */

const PINGZHONG_BASE = 'https://fund.eastmoney.com/pingzhongdata'

/** pingzhongdata 脚本注入到 window 上的变量 */
interface PingzhongScope {
  fS_name?: string
  fS_code?: string
  ishb?: boolean
  fund_sourceRate?: string
  fund_Rate?: string
  fund_minsg?: string
  stockCodes?: string[]
  zqCodes?: string
  stockCodesNew?: string[]
  zqCodesNew?: string
  Data_ACWorthTrend?: [number, number][]
  Data_netWorthTrend?: { x: number; y: number; equityReturn: number; unitMoney: string }[]
  Data_fundSharesPositions?: [number, number][]
  Data_grandTotal?: { name: string; data: [number, number][] }[]
  Data_rateInSimilarType?: { x: number; y: number; sc: string }[]
  Data_rateInSimilarPersent?: [number, number][]
  Data_fluctuationScale?: {
    categories: string[]
    series: { y: number; mom: string }[]
  }
  Data_holderStructure?: {
    series: { name: string; data: number[] }[]
    categories: string[]
  }
  Data_assetAllocation?: {
    series: { name: string; type: string | null; data: number[]; yAxis: number }[]
    categories: string[]
  }
  Data_performanceEvaluation?: {
    avr: string
    categories: string[]
    dsc: string[]
    data: number[]
  }
  Data_currentFundManager?: Array<{
    id: string
    pic: string
    name: string
    star: number
    workTime: string
    fundSize: string
    power: {
      avr: string
      categories: string[]
      dsc: string[]
      data: number[]
      jzrq: string
    }
    profit: {
      categories: string[]
      series: { data: { name: string | null; color: string; y: number }[] }[]
      jzrq: string
    }
  }>
  Data_buySedemption?: {
    series: { name: string; data: number[] }[]
    categories: string[]
  }
  swithSameType?: string[][]
  syl_1n?: string
  syl_6y?: string
  syl_3y?: string
  syl_1y?: string
}

/** pingzhongdata 解析后的基金数据（对齐 fundgz 格式） */
export interface PingzhongFundData {
  fundcode: string
  name: string
  /** 最新已结算交易日净值 */
  dwjz: string
  /** 估算净值（pingzhongdata 无盘中估算，直接用 dwjz） */
  gsz: string | null
  /** 估算涨跌幅（由 Data_ACWorthTrend 最后两条计算） */
  gszzl: string
  /** 净值日期 YYYY-MM-DD */
  jzrq: string
  /** 更新时间（净值日期，无盘中时间） */
  gztime: string
  /** 昨日实际涨跌幅 % */
  navchgrt: string
  /** 标记来源，供 toFundInfo 判断处理逻辑 */
  _fromPingzhong: true
}

export interface PingzhongDetailData {
  fundcode: string
  name: string
  sourceRate: string
  currentRate: string
  minPurchase: string
  stockCodes: string[]
  bondCodes: string[]
  stockCodesNew: string[]
  bondCodesNew: string[]
  returnRates: {
    year1: string
    sixMonth: string
    threeMonth: string
    oneMonth: string
  }
  sharePositionTrend: Array<{ date: number; value: number }>
  netWorthTrend: Array<{ date: number; value: number; equityReturn: number; unitMoney: string }>
  acWorthTrend: Array<{ date: number; value: number }>
  grandTotal: { name: string; data: [number, number][] }[]
  rateInSimilarType: { x: number; y: number; sc: string }[]
  rateInSimilarPersent: [number, number][]
  fluctuationScale: {
    categories: string[]
    series: { y: number; mom: string }[]
  }
  holderStructure: {
    series: { name: string; data: number[] }[]
    categories: string[]
  }
  assetAllocation: {
    series: { name: string; type: string | null; data: number[]; yAxis: number }[]
    categories: string[]
  }
  performanceEvaluation: {
    avr: string
    categories: string[]
    dsc: string[]
    data: number[]
  }
  currentFundManagers: PingzhongScope['Data_currentFundManager']
  buySedemption: {
    series: { name: string; data: number[] }[]
    categories: string[]
  }
  sameType: string[][]
}

/** 将时间戳转为 YYYY-MM-DD */
function tsToDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 从 Data_ACWorthTrend 计算最新净值和涨跌幅
 * 最后一条 = 最新已结算交易日净值
 * 倒数第二条 = 前一交易日净值
 * 涨跌幅 = (last - prev) / prev * 100
 */
function calcFromACWorthTrend(trend: [number, number][]): {
  dwjz: string
  jzrq: string
  navchgrt: string
} | null {
  if (!trend || trend.length < 2) return null

  const last = trend[trend.length - 1]!
  const prev = trend[trend.length - 2]!

  const lastNav = last[1]
  const prevNav = prev[1]
  const jzrq = tsToDate(last[0])

  if (prevNav === 0) return null

  const navchgrt = (((lastNav - prevNav) / prevNav) * 100).toFixed(4)

  return {
    dwjz: String(lastNav),
    jzrq,
    navchgrt
  }
}

/** 清理 window 上注入的 pingzhongdata 变量 */
function cleanupPingzhongVars(scope: Window & PingzhongScope) {
  const keys: Array<keyof PingzhongScope> = [
    'fS_name',
    'fS_code',
    'ishb',
    'fund_sourceRate',
    'fund_Rate',
    'fund_minsg',
    'stockCodes',
    'zqCodes',
    'stockCodesNew',
    'zqCodesNew',
    'Data_ACWorthTrend',
    'Data_netWorthTrend',
    'Data_fundSharesPositions',
    'Data_grandTotal',
    'Data_rateInSimilarType',
    'Data_rateInSimilarPersent',
    'Data_fluctuationScale',
    'Data_holderStructure',
    'Data_assetAllocation',
    'Data_performanceEvaluation',
    'Data_currentFundManager',
    'Data_buySedemption',
    'swithSameType',
    'syl_1n',
    'syl_6y',
    'syl_3y',
    'syl_1y',
  ]

  for (const key of keys) {
    try {
      scope[key] = undefined
    } catch {
      // ignore non-writable globals
    }
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(item => String(item)) : []
}

function parseTrend<T>(value: T[] | undefined, mapper: (item: T) => any) {
  return Array.isArray(value) ? value.map(mapper) : []
}

/**
 * 通过 <script> 标签加载 pingzhongdata JS，执行后从 window 读取变量
 *
 * 注意：pingzhongdata 脚本用 var 直接写全局变量（fS_name / Data_ACWorthTrend 等），
 * 多个脚本并发加载会互相覆盖。用串行队列保证同一时刻只有一个脚本在执行。
 */

type QueueTask = () => Promise<void>
const loadQueue: QueueTask[] = []
let isProcessing = false

function enqueue(task: QueueTask): Promise<void> {
  return new Promise((resolve, reject) => {
    loadQueue.push(async () => {
      try {
        await task()
        resolve()
      } catch (e) {
        reject(e)
      }
    })
    if (!isProcessing) processQueue()
  })
}

async function processQueue() {
  isProcessing = true
  while (loadQueue.length > 0) {
    const task = loadQueue.shift()!
    await task()
  }
  isProcessing = false
}

function loadPingzhongScript(code: string): Promise<PingzhongScope> {
  return new Promise((resolve, reject) => {
    enqueue(() => new Promise<void>((done, fail) => {
      const script = document.createElement('script')
      script.src = `${PINGZHONG_BASE}/${code}.js?_=${Date.now()}`
      script.async = true
      script.referrerPolicy = 'no-referrer'

      const timer = setTimeout(() => {
        script.remove()
        fail(new Error('pingzhongdata timeout'))
      }, 10000)

      script.onload = () => {
        clearTimeout(timer)
        script.remove()
        const scope = window as Window & PingzhongScope
        const snapshot: PingzhongScope = {
          fS_name: scope.fS_name,
          fS_code: scope.fS_code,
          ishb: scope.ishb,
          fund_sourceRate: scope.fund_sourceRate,
          fund_Rate: scope.fund_Rate,
          fund_minsg: scope.fund_minsg,
          stockCodes: scope.stockCodes,
          zqCodes: scope.zqCodes,
          stockCodesNew: scope.stockCodesNew,
          zqCodesNew: scope.zqCodesNew,
          Data_ACWorthTrend: scope.Data_ACWorthTrend,
          Data_netWorthTrend: scope.Data_netWorthTrend,
          Data_fundSharesPositions: scope.Data_fundSharesPositions,
          Data_grandTotal: scope.Data_grandTotal,
          Data_rateInSimilarType: scope.Data_rateInSimilarType,
          Data_rateInSimilarPersent: scope.Data_rateInSimilarPersent,
          Data_fluctuationScale: scope.Data_fluctuationScale,
          Data_holderStructure: scope.Data_holderStructure,
          Data_assetAllocation: scope.Data_assetAllocation,
          Data_performanceEvaluation: scope.Data_performanceEvaluation,
          Data_currentFundManager: scope.Data_currentFundManager,
          Data_buySedemption: scope.Data_buySedemption,
          swithSameType: scope.swithSameType,
          syl_1n: scope.syl_1n,
          syl_6y: scope.syl_6y,
          syl_3y: scope.syl_3y,
          syl_1y: scope.syl_1y,
        }
        resolve(snapshot)
        cleanupPingzhongVars(scope)
        done()
      }

      script.onerror = () => {
        clearTimeout(timer)
        script.remove()
        reject(new Error('pingzhongdata load failed'))
        fail(new Error('pingzhongdata load failed'))
      }

      document.head.appendChild(script)
    }))
  })
}

/**
 * 获取单只基金的 pingzhongdata 数据
 * 返回对齐 fundgz 格式的对象，失败返回 null
 */
export async function fetchPingzhongData(code: string): Promise<PingzhongFundData | null> {
  try {
    const scope = await loadPingzhongScript(code)

    const trend = scope.Data_ACWorthTrend
    const calc = calcFromACWorthTrend(trend ?? [])
    if (!calc) return null

    const name = scope.fS_name ?? code

    return {
      fundcode: scope.fS_code ?? code,
      name,
      dwjz: calc.dwjz,
      gsz: null,          // pingzhongdata 无盘中估算
      gszzl: calc.navchgrt,
      jzrq: calc.jzrq,
      gztime: calc.jzrq,  // 无盘中时间，用净值日期
      navchgrt: calc.navchgrt,
      _fromPingzhong: true,
    }
  } catch {
    return null
  }
}

export async function fetchPingzhongDetailData(code: string): Promise<PingzhongDetailData | null> {
  try {
    const scope = await loadPingzhongScript(code)

    return {
      fundcode: scope.fS_code ?? code,
      name: scope.fS_name ?? code,
      sourceRate: scope.fund_sourceRate ?? '',
      currentRate: scope.fund_Rate ?? '',
      minPurchase: scope.fund_minsg ?? '',
      stockCodes: toStringArray(scope.stockCodes),
      bondCodes: typeof scope.zqCodes === 'string' ? scope.zqCodes.split(',').filter(Boolean) : [],
      stockCodesNew: toStringArray(scope.stockCodesNew),
      bondCodesNew: typeof scope.zqCodesNew === 'string' ? scope.zqCodesNew.split(',').filter(Boolean) : [],
      returnRates: {
        year1: scope.syl_1n ?? '',
        sixMonth: scope.syl_6y ?? '',
        threeMonth: scope.syl_3y ?? '',
        oneMonth: scope.syl_1y ?? '',
      },
      sharePositionTrend: parseTrend(scope.Data_fundSharesPositions, ([date, value]) => ({ date, value })),
      netWorthTrend: parseTrend(scope.Data_netWorthTrend, (item) => ({
        date: item.x,
        value: item.y,
        equityReturn: item.equityReturn,
        unitMoney: item.unitMoney,
      })),
      acWorthTrend: parseTrend(scope.Data_ACWorthTrend, ([date, value]) => ({ date, value })),
      grandTotal: Array.isArray(scope.Data_grandTotal) ? scope.Data_grandTotal : [],
      rateInSimilarType: Array.isArray(scope.Data_rateInSimilarType) ? scope.Data_rateInSimilarType : [],
      rateInSimilarPersent: Array.isArray(scope.Data_rateInSimilarPersent) ? scope.Data_rateInSimilarPersent : [],
      fluctuationScale: scope.Data_fluctuationScale ?? { categories: [], series: [] },
      holderStructure: scope.Data_holderStructure ?? { categories: [], series: [] },
      assetAllocation: scope.Data_assetAllocation ?? { categories: [], series: [] },
      performanceEvaluation: scope.Data_performanceEvaluation ?? { avr: '', categories: [], dsc: [], data: [] },
      currentFundManagers: scope.Data_currentFundManager ?? [],
      buySedemption: scope.Data_buySedemption ?? { categories: [], series: [] },
      sameType: scope.swithSameType ?? [],
    }
  } catch {
    return null
  }
}
