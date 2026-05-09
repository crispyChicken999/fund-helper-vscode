// 格式化工具函数

/**
 * 格式化金额
 * @param value 数值
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的金额字符串，如 "¥1,234.56"
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '¥0.00'
  return `¥${value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`
}

/**
 * 格式化百分比
 * @param value 数值
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的百分比字符串，如 "+12.34%"
 */
export function formatPercent(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0.00%'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

/**
 * 格式化数字
 * @param value 数值
 * @param decimals 小数位数，默认2位
 * @returns 格式化后的数字字符串
 */
export function formatNumber(value: number, decimals: number = 2): string {
  if (isNaN(value)) return '0.00'
  return value.toFixed(decimals)
}

/**
 * 格式化日期时间
 * @param timestamp 时间戳
 * @param format 格式，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export function formatDateTime(timestamp: number, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化相对时间
 * @param timestamp 时间戳
 * @returns 相对时间字符串，如 "刚刚"、"5分钟前"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 2592000000) return `${Math.floor(diff / 86400000)}天前`
  
  return formatDateTime(timestamp, 'YYYY-MM-DD')
}

/**
 * 隐私模式格式化
 * @param value 原始值
 * @param privacyMode 是否开启隐私模式
 * @returns 隐私模式下返回 "****"，否则返回原值
 */
export function formatPrivacy(value: string, privacyMode: boolean): string {
  return privacyMode ? '****' : value
}

/**
 * 格式化基金代码
 * @param code 基金代码
 * @returns 格式化后的代码，如 "001234"
 */
export function formatFundCode(code: string): string {
  return code.padStart(6, '0')
}
