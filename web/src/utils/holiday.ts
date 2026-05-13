/**
 * 节假日数据服务 — 从远程加载中国 A 股节假日数据
 * 使用 JSONP 方式获取（绕过 CORS）
 * 数据格式: { data: { "2026": { "01-01": { "holiday": true, "name": "元旦" } } } }
 */

import { loadJSONP } from './jsonp'

const HOLIDAY_CACHE_KEY = 'fund_helper_holiday_data'
const HOLIDAY_URL = 'https://funds.rabt.top/funds/holiday.json'

interface HolidayEntry {
  holiday: boolean
  name?: string
}

interface HolidayData {
  [year: string]: {
    [date: string]: HolidayEntry
  }
}

let holidayMap: HolidayData | null = null
let initPromise: Promise<void> | null = null

/**
 * 初始化节假日数据（应用启动时调用一次，不阻塞主流程）
 */
export function initHolidayData(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = doInit()
  return initPromise
}

async function doInit(): Promise<void> {
  // 先从 localStorage 读取缓存
  try {
    const cached = localStorage.getItem(HOLIDAY_CACHE_KEY)
    if (cached) {
      holidayMap = JSON.parse(cached)
    }
  } catch { /* ignore */ }

  // 异步通过 JSONP 更新
  try {
    const json: any = await loadJSONP(HOLIDAY_URL, 10000)
    if (json && json.data) {
      holidayMap = json.data
      localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(holidayMap))
    }
  } catch {
    // 网络失败时使用缓存，静默处理
  }
}

/**
 * 判断指定日期是否为休市日（周末 + 法定节假日）
 */
export function isMarketClosed(date: Date = new Date()): boolean {
  const day = date.getDay()
  // 周末一定休市
  if (day === 0 || day === 6) return true

  // 检查节假日数据
  if (!holidayMap) return false

  const year = date.getFullYear().toString()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  const dateStr = `${month}-${dayOfMonth}`

  const yearData = holidayMap[year]
  if (yearData && yearData[dateStr]) {
    return yearData[dateStr].holiday === true
  }

  return false
}
