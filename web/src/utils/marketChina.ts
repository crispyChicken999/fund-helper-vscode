/** A 股市场时段判断（Asia/Shanghai），含节假日检测 */

import { isMarketClosed } from './holiday'

export interface ChinaMarketStatus {
  isOpen: boolean
  isClosed: boolean
  /** MM-DD */
  todayDate: string
}

export function getChinaMarketStatus(now = new Date()): ChinaMarketStatus {
  const calFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = calFmt.formatToParts(now)
  const month = parts.find(p => p.type === 'month')?.value ?? '01'
  const day = parts.find(p => p.type === 'day')?.value ?? '01'
  const todayDate = `${month}-${day}`

  // 使用节假日服务判断是否休市（含周末 + 法定节假日）
  const closed = isMarketClosed(now)

  if (closed) {
    return { isOpen: false, isClosed: true, todayDate }
  }

  const hm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now)
  const [hh, mm] = hm.split(':').map(Number)
  const minutes = hh * 60 + mm
  const s1 = minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30
  const s2 = minutes >= 13 * 60 && minutes <= 15 * 60
  const isOpen = s1 || s2

  return {
    isOpen,
    isClosed: false,
    todayDate
  }
}
