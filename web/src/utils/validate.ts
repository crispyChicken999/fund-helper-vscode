// 验证工具函数

/**
 * 验证基金代码
 * @param code 基金代码
 * @returns 是否有效（6位数字）
 */
export function validateFundCode(code: string): boolean {
  return /^\d{6}$/.test(code)
}

/**
 * 验证持有份额
 * @param num 持有份额
 * @returns 是否有效（正数，最多2位小数）
 */
export function validateFundNum(num: number | string): boolean {
  const numValue = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(numValue) || numValue <= 0) return false
  return /^\d+(\.\d{1,2})?$/.test(String(numValue))
}

/**
 * 验证成本价
 * @param cost 成本价
 * @returns 是否有效（正数，最多4位小数）
 */
export function validateFundCost(cost: number | string): boolean {
  const costValue = typeof cost === 'string' ? parseFloat(cost) : cost
  if (isNaN(costValue) || costValue <= 0) return false
  return /^\d+(\.\d{1,4})?$/.test(String(costValue))
}

/**
 * 验证分组名称
 * @param name 分组名称
 * @returns 是否有效（1-50字符，不能为空）
 */
export function validateGroupName(name: string): boolean {
  return /^[\w\u4e00-\u9fa5]{1,50}$/.test(name)
}

/**
 * 验证JSONBox名称
 * @param name JSONBox名称
 * @returns 是否有效（20-64字符，只允许字母、数字、下划线、连字符）
 */
export function validateJsonboxName(name: string): boolean {
  return /^[a-zA-Z0-9_-]{20,64}$/.test(name)
}

/**
 * 验证刷新间隔
 * @param interval 刷新间隔（秒）
 * @returns 是否有效（10-3600秒）
 */
export function validateRefreshInterval(interval: number): boolean {
  const validIntervals = [10, 20, 30, 60, 300, 600, 3600]
  return validIntervals.includes(interval)
}

/**
 * 验证主题
 * @param theme 主题
 * @returns 是否有效
 */
export function validateTheme(theme: string): boolean {
  return ['light', 'dark'].includes(theme)
}

/**
 * 验证语言
 * @param language 语言
 * @returns 是否有效
 */
export function validateLanguage(language: string): boolean {
  return ['zh-CN', 'en-US'].includes(language)
}

/**
 * 生成随机JSONBox名称
 * Per jsonbox docs: BOX_ID should contain only alphanumeric characters & underscore, at least 20 characters long.
 * @returns 随机生成的Box名称
 */
export function generateJsonboxName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'fundhelper_'
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
