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
  Data_ACWorthTrend?: [number, number][]
  Data_netWorthTrend?: { x: number; y: number; equityReturn: number; unitMoney: string }[]
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
  delete scope.fS_name
  delete scope.fS_code
  delete scope.Data_ACWorthTrend
  delete scope.Data_netWorthTrend
  delete scope.syl_1n
  delete scope.syl_6y
  delete scope.syl_3y
  delete scope.syl_1y
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
        resolve({
          fS_name: scope.fS_name,
          fS_code: scope.fS_code,
          Data_ACWorthTrend: scope.Data_ACWorthTrend,
          Data_netWorthTrend: scope.Data_netWorthTrend,
          syl_1n: scope.syl_1n,
          syl_6y: scope.syl_6y,
          syl_3y: scope.syl_3y,
          syl_1y: scope.syl_1y,
        })
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
