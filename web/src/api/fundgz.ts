// fundgz行情接口封装（JSONP）

// fundgz API基础URL
const FUNDGZ_API_BASE = 'https://fundgz.1234567.com.cn/js'

interface FundgzGlobalScope extends Window {
  jsonpgz?: (data: FundgzRawData) => void
}

interface PendingFundgzRequest {
  resolve: (data: FundgzRawData) => void
  script: HTMLScriptElement
  timeoutId: ReturnType<typeof window.setTimeout>
}

const pendingFundgzRequests = new Map<string, PendingFundgzRequest[]>()

function getFundgzGlobalScope(): FundgzGlobalScope {
  return window as FundgzGlobalScope
}

function ensureFundgzCallback(): void {
  const globalScope = getFundgzGlobalScope()

  if (globalScope.jsonpgz) {
    return
  }

  globalScope.jsonpgz = (data: FundgzRawData) => {
    const code = data?.fundcode
    if (!code) {
      return
    }

    const pendingQueue = pendingFundgzRequests.get(code)
    const pendingRequest = pendingQueue?.shift()

    if (!pendingRequest) {
      return
    }

    window.clearTimeout(pendingRequest.timeoutId)
    pendingRequest.script.remove()
    pendingRequest.resolve(data)

    if (pendingQueue && pendingQueue.length === 0) {
      pendingFundgzRequests.delete(code)
    }
  }
}

function removePendingFundgzRequest(code: string, targetRequest: PendingFundgzRequest): void {
  const pendingQueue = pendingFundgzRequests.get(code)
  if (!pendingQueue) {
    return
  }

  const nextQueue = pendingQueue.filter(request => request !== targetRequest)
  if (nextQueue.length === 0) {
    pendingFundgzRequests.delete(code)
    return
  }

  pendingFundgzRequests.set(code, nextQueue)
}

function loadFundgzJsonp(code: string): Promise<FundgzRawData> {
  ensureFundgzCallback()

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const url = `${FUNDGZ_API_BASE}/${code}.js?rt=${Date.now()}`

    const pendingRequest: PendingFundgzRequest = {
      resolve: (data) => {
        resolve(data)
      },
      script,
      timeoutId: window.setTimeout(() => {
        removePendingFundgzRequest(code, pendingRequest)
        script.remove()
        reject(new Error('Timeout'))
      }, 5000)
    }

    const pendingQueue = pendingFundgzRequests.get(code) ?? []
    pendingQueue.push(pendingRequest)
    pendingFundgzRequests.set(code, pendingQueue)

    script.async = true
    script.src = url
    script.onerror = () => {
      window.clearTimeout(pendingRequest.timeoutId)
      removePendingFundgzRequest(code, pendingRequest)
      script.remove()
      reject(new Error('JSONP failed'))
    }

    document.head.appendChild(script)
  })
}

/**
 * fundgz接口返回的原始数据格式
 */
interface FundgzRawData {
  fundcode: string      // 基金代码
  name: string          // 基金名称
  jzrq: string          // 净值日期
  dwjz: string          // 当日净值
  gsz: string           // 估算净值
  gszzl: string         // 估算涨跌百分比
  gztime: string        // 估值时间
}

/**
 * 格式化后的基金数据
 */
export interface FundgzData {
  code: string
  name: string
  currentPrice: number      // 当前净值（估算净值）
  changePercent: number     // 涨跌幅
  changeAmount: number      // 涨跌额
  updateTime: string        // 更新时间
}

/**
 * 获取单个基金的实时数据
 * @param code 基金代码
 * @returns Promise<FundgzData>
 */
export function fetchFundData(code: string): Promise<FundgzData> {
  return loadFundgzJsonp(code)
    .then((data) => {
      try {
        const currentPrice = parseFloat(data.gsz || data.dwjz)
        const lastPrice = parseFloat(data.dwjz)
        const changePercent = parseFloat(data.gszzl)
        const changeAmount = currentPrice - lastPrice

        return {
          code: data.fundcode,
          name: data.name,
          currentPrice,
          changePercent,
          changeAmount,
          updateTime: data.gztime
        }
      } catch (error: any) {
        throw new Error(`解析基金${code}数据失败: ${error.message}`)
      }
    })
    .catch((error: Error) => {
      throw new Error(`获取基金${code}数据失败: ${error.message}`)
    })
}

/**
 * 批量获取多个基金的实时数据
 * @param codes 基金代码数组
 * @returns Promise<Map<string, FundgzData>>
 */
export async function fetchMultipleFundData(codes: string[]): Promise<Map<string, FundgzData>> {
  const results = new Map<string, FundgzData>()

  // 并发请求，但限制并发数为5
  const batchSize = 5
  for (let i = 0; i < codes.length; i += batchSize) {
    const batch = codes.slice(i, i + batchSize)
    const promises = batch.map(code =>
      fetchFundData(code)
        .then(data => ({ success: true, data }))
        .catch(error => ({ success: false, error, code }))
    )

    const batchResults = await Promise.all(promises)

    batchResults.forEach(result => {
      if (result.success && 'data' in result) {
        results.set(result.data.code, result.data)
      } else if ('code' in result) {
        console.error(`获取基金${result.code}数据失败:`, result.error)
      }
    })
  }

  return results
}

/**
 * 获取基金详细信息（从天天基金网）
 * @param code 基金代码
 * @returns Promise<any>
 */
export function fetchFundDetail(code: string): Promise<any> {
  return loadFundgzJsonp(code).catch((error: Error) => {
    throw new Error(`获取基金${code}详情失败: ${error.message}`)
  })
}

/**
 * 检查基金代码是否有效
 * @param code 基金代码
 * @returns Promise<boolean>
 */
export async function validateFundCode(code: string): Promise<boolean> {
  try {
    await fetchFundData(code)
    return true
  } catch {
    return false
  }
}
