import type { Handler, HandlerEvent } from '@netlify/functions'

// 白名单域名 — fundmobapi 整个域名都需要代理
const ALLOWED_DOMAINS = [
  'fundmobapi.eastmoney.com',
  'data.eastmoney.com',
  'fund.eastmoney.com',
  'fundgz.1234567.com.cn',
  'push2.eastmoney.com',
  'api.fund.eastmoney.com',
  'dgs.tiantianfunds.com'
]

const handler: Handler = async (event: HandlerEvent) => {
  // CORS 预检
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    }
  }

  // 获取目标 URL
  const targetUrl = event.queryStringParameters?.url
  if (!targetUrl) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing url parameter' })
    }
  }

  // 白名单校验
  let hostname: string
  try {
    hostname = new URL(targetUrl).hostname
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid url' })
    }
  }

  if (!ALLOWED_DOMAINS.some(d => hostname.endsWith(d))) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Domain not allowed' })
    }
  }

  // 根据目标域名选择合适的伪装 headers
  const proxyHeaders: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
  }

  // fundmobapi 需要特定的 Referer
  if (hostname === 'fundmobapi.eastmoney.com') {
    proxyHeaders['Referer'] = 'https://mpservice.com/app'
  } else if (hostname === 'api.fund.eastmoney.com') {
    proxyHeaders['Referer'] = 'https://fundf10.eastmoney.com/'
  } else if (hostname === 'dgs.tiantianfunds.com') {
    proxyHeaders['Origin'] = 'https://h5.1234567.com.cn'
    proxyHeaders['Referer'] = 'https://h5.1234567.com.cn/'
  }

  // 支持 POST 请求
  const fetchOptions: RequestInit = {
    method: event.httpMethod || 'GET',
    headers: proxyHeaders
  }

  // 如果是 POST 请求，转发 body
  if (event.httpMethod === 'POST' && event.body) {
    fetchOptions.body = event.body
    proxyHeaders['Content-Type'] = event.headers?.['content-type'] || 'application/x-www-form-urlencoded'
  }

  try {
    const proxyRes = await fetch(targetUrl, fetchOptions)
    const body = await proxyRes.text()

    return {
      statusCode: proxyRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store'
      },
      body
    }
  } catch (e: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message || 'Proxy request failed' })
    }
  }
}

export { handler }
