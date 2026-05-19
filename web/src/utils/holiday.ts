/**
 * 节假日数据服务 — 从远程加载中国 A 股节假日数据
 * 使用 fetch 直接获取（新接口支持 CORS）
 * 数据格式: { year: 2026, days: [{ name: "元旦", date: "2026-01-01", isOffDay: true }] }
 */

import { fetchJSON } from './jsonp'

const HOLIDAY_CACHE_KEY = 'fund_helper_holiday_data'
const HOLIDAY_URL = 'https://cdn.jsdelivr.net/gh/NateScarlet/holiday-cn@master/'+ new Date().getFullYear() + '.json'

interface HolidayDay {
  name: string
  date: string
  isOffDay: boolean
}

interface HolidayResponse {
  year: number
  days: HolidayDay[]
}

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

  // 异步通过 fetch 更新
  try {
    const json = await fetchJSON<HolidayResponse>(HOLIDAY_URL, 10000)
    if (json && json.days) {
      // 转换新格式到旧格式
      holidayMap = convertToHolidayMap(json)
      localStorage.setItem(HOLIDAY_CACHE_KEY, JSON.stringify(holidayMap))
    }
  } catch {
    // 网络失败时使用缓存，静默处理
  }
}

/**
 * 将新接口格式转换为内部使用的格式
 * 新格式: { year: 2026, days: [{ name: "元旦", date: "2026-01-01", isOffDay: true }] }
 * 旧格式: { "2026": { "01-01": { "holiday": true, "name": "元旦" } } }
 */
function convertToHolidayMap(response: HolidayResponse): HolidayData {
  const result: HolidayData = {}
  const year = response.year.toString()
  result[year] = {}

  for (const day of response.days) {
    // date 格式: "2026-01-01"
    const dateParts = day.date.split('-')
    if (dateParts.length === 3) {
      const monthDay = `${dateParts[1]}-${dateParts[2]}` // "01-01"
      result[year][monthDay] = {
        holiday: day.isOffDay,
        name: day.name
      }
    }
  }

  return result
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
