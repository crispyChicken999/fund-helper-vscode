// 行情接口封装

// import jsonp from 'jsonp'

/**
 * 行情数据接口
 */
export interface MarketData {
  code: string
  name: string
  price: number
  changePercent: number
  changeAmount: number
  category: string
}

/**
 * 预定义的行情代码
 */
export const MARKET_CODES = {
  // A股指数
  A_STOCK: {
    'sh000001': '上证指数',
    'sz399001': '深证成指',
    'sz399006': '创业板指',
    'sz399300': '沪深300',
    'sh000016': '上证50',
    'sz399905': '中证500',
    'bj899050': '北证50'
  },
  
  // H股指数
  H_STOCK: {
    'hk_HSI': '恒生指数',
    'hk_HSCEI': '国企指数',
    'hk_HSTECH': '恒生科技'
  },
  
  // 美股指数
  US_STOCK: {
    'us_DJI': '道琼斯',
    'us_SPX': '标普500',
    'us_IXIC': '纳斯达克'
  },
  
  // 其他指数
  OTHER: {
    'gb_FTSE': '富时100',
    'de_DAX': '德国DAX',
    'jp_N225': '日经225'
  }
}

/**
 * 获取行情数据（使用fundgz接口）
 * 注意：fundgz主要提供基金数据，这里模拟行情数据
 */
export function fetchMarketData(code: string, name: string, category: string): Promise<MarketData> {
  return new Promise((resolve, _reject) => {
    // 由于fundgz接口主要用于基金，这里使用模拟数据
    // 实际项目中应该使用专门的行情接口
    
    // 模拟延迟
    setTimeout(() => {
      // 生成模拟数据
      const basePrice = 3000 + Math.random() * 1000
      const changePercent = (Math.random() - 0.5) * 4 // -2% 到 +2%
      const changeAmount = basePrice * (changePercent / 100)
      
      resolve({
        code,
        name,
        price: parseFloat(basePrice.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        changeAmount: parseFloat(changeAmount.toFixed(2)),
        category
      })
    }, 100 + Math.random() * 200)
  })
}

/**
 * 批量获取行情数据
 */
export async function fetchMultipleMarketData(
  codes: Record<string, string>,
  category: string
): Promise<MarketData[]> {
  const promises = Object.entries(codes).map(([code, name]) =>
    fetchMarketData(code, name, category)
      .catch(error => {
        console.error(`获取行情${code}失败:`, error)
        return null
      })
  )
  
  const results = await Promise.all(promises)
  return results.filter(Boolean) as MarketData[]
}

/**
 * 获取A股行情
 */
export function fetchAStockMarkets(): Promise<MarketData[]> {
  return fetchMultipleMarketData(MARKET_CODES.A_STOCK, 'A股')
}

/**
 * 获取H股行情
 */
export function fetchHStockMarkets(): Promise<MarketData[]> {
  return fetchMultipleMarketData(MARKET_CODES.H_STOCK, 'H股')
}

/**
 * 获取美股行情
 */
export function fetchUSStockMarkets(): Promise<MarketData[]> {
  return fetchMultipleMarketData(MARKET_CODES.US_STOCK, '美股')
}

/**
 * 获取其他行情
 */
export function fetchOtherMarkets(): Promise<MarketData[]> {
  return fetchMultipleMarketData(MARKET_CODES.OTHER, '其他')
}

/**
 * 获取所有行情
 */
export async function fetchAllMarkets(): Promise<MarketData[]> {
  const [aStock, hStock, usStock, other] = await Promise.all([
    fetchAStockMarkets(),
    fetchHStockMarkets(),
    fetchUSStockMarkets(),
    fetchOtherMarkets()
  ])
  
  return [...aStock, ...hStock, ...usStock, ...other]
}

/**
 * 根据分类获取行情
 */
export function fetchMarketsByCategory(category: string): Promise<MarketData[]> {
  switch (category) {
    case 'A股':
      return fetchAStockMarkets()
    case 'H股':
      return fetchHStockMarkets()
    case '美股':
      return fetchUSStockMarkets()
    case '其他':
      return fetchOtherMarkets()
    default:
      return Promise.resolve([])
  }
}
