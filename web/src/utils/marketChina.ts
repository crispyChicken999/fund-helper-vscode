/** A 股市场时段简化判断（Asia/Shanghai） */

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

  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short'
  }).format(now)
  const isWeekend = wd === 'Sat' || wd === 'Sun'

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
  const isOpen = !isWeekend && (s1 || s2)

  return {
    isOpen,
    isClosed: isWeekend,
    todayDate
  }
}
