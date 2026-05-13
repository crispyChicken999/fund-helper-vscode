/**
 * 统一代理 fetch — 自动处理 CORS 限制和来源检测的接口
 *
 * - 开发环境：通过 Vite proxy 转发
 * - 生产环境：通过 Netlify Function 转发
 * - 不需要代理的接口：直接 fetch
 */

const isDev = import.meta.env.DEV

/**
 * 需要代理的域名列表
 * - fundmobapi.eastmoney.com: 整个域名所有接口都有来源检测
 * - data.eastmoney.com: CORS 限制
 * - api.fund.eastmoney.com: 需要 Referer
 * - dgs.tiantianfunds.com: 需要特定 Origin
 */
const PROXY_DOMAINS = [
  'fundmobapi.eastmoney.com',
  'data.eastmoney.com',
  'api.fund.eastmoney.com',
  'dgs.tiantianfunds.com'
]

/**
 * 判断 URL 是否需要走代理
 */
function needsProxy(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return PROXY_DOMAINS.some(d => hostname.endsWith(d))
  } catch {
    return false
  }
}

/**
 * 开发环境：将目标 URL 转换为 Vite proxy 路径
 */
function toDevProxyUrl(targetUrl: string): string {
  const url = new URL(targetUrl)

  if (url.hostname === 'fundmobapi.eastmoney.com') {
    return `/api-proxy/fundmob${url.pathname}${url.search}`
  }

  if (url.hostname === 'data.eastmoney.com') {
    return `/api-proxy/bkzj${url.pathname.replace('/dataapi/bkzj', '')}${url.search}`
  }

  if (url.hostname === 'api.fund.eastmoney.com') {
    return `/api-proxy/eastfund${url.pathname}${url.search}`
  }

  if (url.hostname === 'dgs.tiantianfunds.com') {
    return `/api-proxy/tiantian${url.pathname}${url.search}`
  }

  return targetUrl
}

/**
 * 代理 fetch - 自动处理 CORS 限制和来源检测的接口
 *
 * - 开发环境：通过 Vite proxy 转发
 * - 生产环境：通过 Netlify Function 转发
 * - 不需要代理的接口：直接 fetch
 */
export async function proxyFetch(targetUrl: string, options?: RequestInit): Promise<Response> {
  if (!needsProxy(targetUrl)) {
    return fetch(targetUrl, options)
  }

  if (isDev) {
    const localUrl = toDevProxyUrl(targetUrl)
    return fetch(localUrl, options)
  } else {
    // 生产环境：使用 Netlify Function
    if (options?.method === 'POST' && options?.body) {
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
      return fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': (options.headers as Record<string, string>)?.['Content-Type']
            || 'application/x-www-form-urlencoded'
        },
        body: options.body,
        signal: options.signal
      })
    }

    const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`
    return fetch(proxyUrl, { signal: options?.signal })
  }
}
