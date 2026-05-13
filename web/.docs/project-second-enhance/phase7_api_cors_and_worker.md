# Phase 7 — API CORS 绕过 & Netlify Functions 方案

> **目标**：解决 `fundmobapi.eastmoney.com/FundMNFInfo` 接口在浏览器端被限制的问题，使用 Netlify Functions 实现无 Nginx 反代的生产部署方案。  
> **预计工时**：1 天

---

## 7.1 问题分析

### 现象

- 浏览器直接输入 URL 可以获取数据
- 通过 Web 端 fetch 调用返回 `{Datas: null, ErrCode: 61136403, Success: false, ErrMsg: "网络繁忙，请稍后重试！"}`
- 真实数据结构正常
- **整个 `fundmobapi.eastmoney.com` 域名下的所有 API 都有此限制**

### 受影响的接口清单

| 接口路径 | 用途 | 使用位置 |
|---------|------|---------|
| `/FundMNewApi/FundMNFInfo` | 批量基金净值（核心） | fundEastmoney.ts |
| `/FundMNewApi/FundMNInverstPosition` | 基金持仓明细 | fundEastmoney.ts |
| `/FundMNewApi/FundMNDetail` | 基金详情信息 | fundDetail.ts（Phase 5） |
| `/FundMNewApi/FundMNManager` | 基金经理信息 | fundDetail.ts（Phase 5） |
| `/FundMNewApi/FundMNPeriodIncrease` | 阶段收益率排名 | fundDetail.ts（Phase 5） |
| `/FundMApi/FundBaseTypeInformation.ashx` | 基金基本信息（JSONP） | detail/scripts.ts |
| `/FundMApi/FundNetDiagram.ashx` | 历史净值图表数据（JSONP） | detail/scripts.ts |

### 根因

`fundmobapi.eastmoney.com` 整个域名对请求来源做了统一限制：
1. 检查 `Referer` / `Origin` 头 — 浏览器跨域请求自动带 `Origin`，被识别为非法
2. 检查 `User-Agent` — 需要伪装为移动端 App
3. 检查 `deviceid` 参数 — 需要传入合法格式的设备 ID
4. 可能有频率限制

### 开发环境 vs 生产环境

| 环境 | 解决方案 |
|------|---------|
| 开发环境 | Vite proxy（伪装 headers） |
| 生产环境 | Netlify Functions（同域名，服务端转发） |

---

## 7.2 Netlify Functions 代理方案

### 方案说明

项目部署在 Netlify 上，利用 Netlify Functions 作为同域 API 代理。前端请求 `/.netlify/functions/proxy`（或通过 `_redirects` 映射为 `/api/proxy`），由 Function 转发到东方财富接口，绕过 CORS 和来源检测。

### 项目结构

```
web/
├── netlify/
│   └── functions/
│       └── proxy.ts          ← Netlify Function
├── src/
├── public/
│   └── _redirects            ← URL 重写规则
├── index.html
├── netlify.toml              ← Netlify 配置
├── vite.config.ts
└── package.json
```

### 1. 创建 Netlify Function

```typescript
// web/netlify/functions/proxy.ts
import type { Handler, HandlerEvent, HandlerContext } from '@netlify/functions'

// 白名单域名 — fundmobapi 整个域名都需要代理
const ALLOWED_DOMAINS = [
  'fundmobapi.eastmoney.com',   // 基金核心 API（全部接口有来源检测）
  'data.eastmoney.com',          // 板块资金流向（CORS 限制）
  'fund.eastmoney.com',          // 基金详情页数据
  'fundgz.1234567.com.cn',      // 估算数据（备用，实际允许跨域）
  'push2.eastmoney.com',         // 行情数据（备用，实际允许跨域）
  'api.fund.eastmoney.com',      // 历史净值
  'dgs.tiantianfunds.com'        // 天天基金合并接口
]

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
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

  // 支持 POST 请求（天天基金合并接口需要）
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
```

### 2. 配置 `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

# 将 /api/proxy 映射到 Netlify Function
[[redirects]]
  from = "/api/proxy"
  to = "/.netlify/functions/proxy"
  status = 200

# SPA 路由回退
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 3. 安装依赖

```bash
npm install -D @netlify/functions
```

`package.json` 中确认 build 命令：

```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  }
}
```

---

## 7.3 前端 API 适配层

### 统一代理 fetch

创建 `api/proxy.ts`，自动区分开发环境（Vite proxy）和生产环境（Netlify Function）：

```typescript
// web/src/api/proxy.ts

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
    return fetch(localUrl, {
      ...options,
      // 开发环境下 POST 请求保留 body 和 headers
    })
  } else {
    // 生产环境：使用 Netlify Function
    // GET 请求：直接拼 URL 参数
    // POST 请求：需要特殊处理
    if (options?.method === 'POST' && options?.body) {
      // POST 请求通过 Netlify Function 转发
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
```

---

## 7.4 Vite 开发代理配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 东方财富板块数据（CORS 限制）
      '/api-proxy/bkzj': {
        target: 'https://data.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/bkzj/, '/dataapi/bkzj')
      },
      // fundmobapi 整个域名（来源检测）
      '/api-proxy/fundmob': {
        target: 'https://fundmobapi.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/fundmob/, ''),
        headers: {
          'Referer': 'https://mpservice.com/app',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Origin': ''  // 清除 Origin 头
        }
      },
      // 天天基金合并接口
      '/api-proxy/tiantian': {
        target: 'https://dgs.tiantianfunds.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/tiantian/, ''),
        headers: {
          'Origin': 'https://h5.1234567.com.cn',
          'Referer': 'https://h5.1234567.com.cn/'
        }
      },
      // 历史净值接口
      '/api-proxy/eastfund': {
        target: 'https://api.fund.eastmoney.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/eastfund/, ''),
        headers: {
          'Referer': 'https://fundf10.eastmoney.com/'
        }
      }
    }
  }
})
```

---

## 7.5 接口调用改造示例

将所有 `fundmobapi.eastmoney.com` 下的接口统一改为使用 `proxyFetch`：

```typescript
// api/fundEastmoney.ts
import { proxyFetch } from './proxy'

/**
 * 批量获取基金净值信息
 * 接口：fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo
 * 限制：来源检测，必须走代理
 */
export async function fetchBatchMNFInfo(codes: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!codes.length) return map

  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${codes.join(',')}`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(15000)
  }).catch(() => null)

  if (!res?.ok) return map

  const data = await res.json().catch(() => null)
  if (!data?.Datas) return map

  for (const fund of data.Datas) {
    map.set(fund.FCODE, {
      navchgrt: fund.NAVCHGRT,
      jzrq: fund.PDATE,
      dwjz: fund.NAV,
      name: fund.SHORTNAME,
      gszzl: fund.GSZZL,
      gztime: data.Expansion?.GZTIME ?? ''
    })
  }
  return map
}

/**
 * 获取基金持仓明细
 * 接口：fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition
 * 限制：来源检测，必须走代理
 */
async function fetchFundInvestmentPosition(code: string): Promise<any> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&Uid=&_=${Date.now()}`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null)

  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return data?.Datas ?? null
}

/**
 * 获取板块资金流向
 * 接口：data.eastmoney.com/dataapi/bkzj/getbkzj
 * 限制：CORS 限制
 */
export async function fetchPlateData(code: string, key: string = 'f62'): Promise<any[]> {
  const url = `https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=${key}&code=${encodeURIComponent(code)}`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(12000)
  }).catch(() => null)

  if (!res?.ok) return []
  const json = await res.json().catch(() => null)
  return json?.data?.diff || []
}
```

**基金详情页接口同样需要改造**：

```typescript
// api/fundDetail.ts
import { proxyFetch } from './proxy'

/**
 * 获取基金详情（概况 + 经理）
 * 接口：dgs.tiantianfunds.com（需要特定 Origin）
 * 限制：来源检测
 */
export async function fetchFundDetailInfo(code: string) {
  const url = 'https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2'
  const params = new URLSearchParams({ /* ... */ })

  const res = await proxyFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(12000)
  })

  // ...解析逻辑
}

/**
 * 获取基金经理信息
 * 接口：fundmobapi.eastmoney.com/FundMNewApi/FundMNManager
 * 限制：来源检测，必须走代理
 */
export async function fetchFundManager(code: string): Promise<FundManager[]> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNManager?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null)

  if (!res?.ok) return []
  const data = await res.json().catch(() => null)
  return (data?.Datas ?? []).map((m: any) => ({
    name: m.MGRNAME || '',
    startDate: m.FEMPDATE || '',
    returnRate: m.PENAVGROWTH || '',
    years: m.TOTALDAYS ? `${Math.floor(parseInt(m.TOTALDAYS) / 365)}年` : '',
    fundCount: parseInt(m.TOTALFUNDCOUNT) || 0
  }))
}

/**
 * 获取阶段收益率
 * 接口：fundmobapi.eastmoney.com/FundMNewApi/FundMNPeriodIncrease
 * 限制：来源检测，必须走代理
 */
export async function fetchPeriodIncrease(code: string): Promise<any> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNPeriodIncrease?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null)

  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return data?.Datas ?? null
}

/**
 * 获取历史净值图表数据
 * 接口：fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx
 * 限制：来源检测，必须走代理
 */
export async function fetchNetDiagram(code: string, range: string): Promise<any> {
  const url = `https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx?FCODE=${code}&RANGE=${range}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0&_=${Date.now()}`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(10000)
  }).catch(() => null)

  if (!res?.ok) return null
  const data = await res.json().catch(() => null)
  return data?.Datas ?? null
}

/**
 * 获取历史净值列表
 * 接口：api.fund.eastmoney.com/f10/lsjz
 * 限制：需要 Referer
 */
export async function fetchNetValueHistory(code: string, pageSize: number): Promise<any[]> {
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=${pageSize}&startDate=&endDate=&_=${Date.now()}`

  const res = await proxyFetch(url, {
    signal: AbortSignal.timeout(15000)
  }).catch(() => null)

  if (!res?.ok) return []
  const data = await res.json().catch(() => null)
  return data?.Data?.LSJZList ?? []
}
```

不需要代理的接口（允许跨域）继续直接 fetch：

```typescript
// 这些接口允许跨域，直接请求即可
export async function fetchFundGz(code: string): Promise<any> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return null
  const text = await res.text()
  return parseJsonp(text)
}

// push2.eastmoney.com 允许跨域
export async function fetchIndexCards(): Promise<any[]> {
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?...`
  const res = await fetch(url).catch(() => null)
  // ...
}
```

---

## 7.6 Netlify 部署流程

### 首次部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 初始化项目（关联 Git 仓库或手动）
netlify init

# 本地测试 Function
netlify dev

# 部署到生产
netlify deploy --prod
```

### 本地测试

`netlify dev` 会同时启动 Vite 开发服务器和 Netlify Functions，可以在本地完整测试代理逻辑：

```bash
# 启动本地开发（含 Functions）
netlify dev

# 访问 http://localhost:8888
# Function 可通过 http://localhost:8888/api/proxy?url=xxx 测试
```

### 绑定自定义域名

在 Netlify 控制台 → Domain settings → 添加自定义域名，配置 DNS 解析即可。绑定自定义域名后国内访问稳定。

---

## 7.7 接口分类总结

| 接口域名 | CORS | 来源检测 | 涉及 API | 处理方式 |
|---------|------|---------|---------|---------|
| `fundgz.1234567.com.cn` | ✅ 允许 | ❌ 无 | 估算数据 JSONP | 直接 fetch |
| `push2.eastmoney.com` | ✅ 允许 | ❌ 无 | 行情指数、资金流向 | 直接 fetch |
| `fundsuggest.eastmoney.com` | ✅ 允许 | ❌ 无 | 基金搜索建议 | 直接 fetch（JSONP） |
| `webquotepic.eastmoney.com` | ✅ 允许 | ❌ 无 | 指数图片 | 直接 `<img>` |
| `fundmobapi.eastmoney.com` | ❌ 限制 | ✅ **全部接口** | FundMNFInfo、FundMNInverstPosition、FundMNManager、FundMNPeriodIncrease、FundBaseTypeInformation、FundNetDiagram | proxyFetch → Netlify Function |
| `data.eastmoney.com` | ❌ 限制 | ❌ 无 | 板块资金流向 | proxyFetch → Netlify Function |
| `api.fund.eastmoney.com` | ❌ 限制 | ✅ Referer | 历史净值列表 | proxyFetch → Netlify Function |
| `dgs.tiantianfunds.com` | ❌ 限制 | ✅ Origin | 基金详情合并接口 | proxyFetch → Netlify Function |

---

## 7.8 现有代码改造清单

以下文件需要引入 `proxyFetch` 替换直接 `fetch`：

| 文件 | 需改造的函数 | 涉及域名 |
|------|------------|---------|
| `web/src/api/fundEastmoney.ts` | `fetchFundInvestmentPosition` | fundmobapi |
| `web/src/api/fundEastmoney.ts` | `fetchBatchMNFInfo` | fundmobapi |
| `web/src/api/fundEastmoney.ts` | `fetchFundFromMNFInfo` | fundmobapi |
| `web/src/api/fundDetail.ts` | `fetchFundDetailInfo` | dgs.tiantianfunds |
| `web/src/api/fundDetail.ts` | `fetchRelateThemes` | dgs.tiantianfunds |
| `web/src/api/fundDetail.ts` | `fetchNetValueHistory` | api.fund.eastmoney |
| `web/src/api/market.ts` | `fetchPlateData`（待创建） | data.eastmoney |

**不需要改造的**（已允许跨域）：
- `web/src/api/fundgz.ts` — `fundgz.1234567.com.cn`
- `web/src/api/market.ts` — `fetchIndexCards`、`fetchMarketStat`、`fetchFlowLine`（push2.eastmoney.com）
- `web/src/api/fundEastmoney.ts` — `fetchStockRealTimeData`（push2.eastmoney.com）
- `web/src/api/fundEastmoney.ts` — `searchFund`（fundsuggest.eastmoney.com，JSONP）

---

## 7.9 注意事项

1. **Netlify Functions 免费额度**：125,000 次/月，对个人使用完全够用
2. **超时限制**：Netlify Functions 默认 10 秒超时，足够 API 代理使用
3. **冷启动**：首次调用可能有 1-2 秒冷启动延迟，后续请求很快
4. **并发**：免费版支持同时运行的 Function 实例有限，但对基金数据刷新场景足够
5. **自定义域名**：强烈建议绑定自定义域名，Netlify 默认的 `.netlify.app` 域名在国内部分地区可能不稳定
6. **POST 请求**：天天基金合并接口是 POST 请求，Netlify Function 需要正确转发 body
7. **URL 长度**：批量查询时 `Fcodes` 参数可能很长，注意 URL 编码后不要超过浏览器限制（约 2000 字符），超过时分批请求

---

## 验收标准

- [ ] `netlify/functions/proxy.ts` 正确创建并可本地测试
- [ ] `netlify.toml` 配置正确（build、functions、redirects）
- [ ] 开发环境通过 Vite proxy 正常获取 `fundmobapi` 全部接口数据
- [ ] `netlify dev` 本地测试 Function 代理正常
- [ ] 生产部署后 `FundMNFInfo` 接口通过代理正常返回数据
- [ ] 生产部署后 `FundMNInverstPosition` 接口正常
- [ ] 生产部署后 `FundMNManager` / `FundMNPeriodIncrease` 接口正常
- [ ] 生产部署后 `FundNetDiagram` 接口正常
- [ ] 生产部署后 `dgs.tiantianfunds.com` POST 接口正常
- [ ] 生产部署后 `api.fund.eastmoney.com` 历史净值接口正常
- [ ] 白名单限制生效，非允许域名返回 403
- [ ] 所有受限接口统一使用 `proxyFetch`
- [ ] 不受限接口保持直接 fetch（不走代理，节省 Function 调用次数）
- [ ] 绑定自定义域名后国内访问正常
