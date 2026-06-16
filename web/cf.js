/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// ====== 白名单：只允许这些来源调用 ======
const ALLOWED_ORIGINS = [
  "https://fund-helper.netlify.app",
  "https://crispychicken999.github.io",
  "http://localhost",         // 本地开发
  "http://127.0.0.1",         // 本地开发
  "https://fund-helper.ccwu.cc" // 你自己的域名（可选）
]

// 东方财富 API 的基础域名
const TARGET_BASE = "https://fundmobapi.eastmoney.com"

// 监听 fetch 事件
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

// ====== 检查来源是否在白名单 ======
function isAllowed(request) {
  const origin = request.headers.get("Origin")
  if (origin) {
    return ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))
  }
  const referer = request.headers.get("Referer")
  if (referer) {
    return ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))
  }
  return false  // 没有 Origin 或 Referer，直接拒绝
}

// ====== 主处理函数 ======
async function handleRequest(request) {
  const url = new URL(request.url)

  // --- 1. 处理 OPTIONS 预检请求 ---
  if (request.method === "OPTIONS") {
    if (!isAllowed(request)) {
      return new Response("Forbidden", { status: 403 })
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      }
    })
  }

  // --- 2. 检查来源（GET / POST 等） ---
  if (!isAllowed(request)) {
    return new Response(JSON.stringify({
      error: "禁止访问",
      message: "该接口仅供授权的前端应用调用"
    }), {
      status: 403,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"  // 告知浏览器允许（但实际是拒绝）
      }
    })
  }

  // --- 3. 构建目标 URL（保留原始路径和查询参数） ---
  const path = url.pathname
  const query = url.search  // 包含 ? 的查询字符串

  // 为了安全，只允许代理 /FundMNewApi/ 下的路径（东方财富基金接口）
  if (!path.startsWith("/FundMNewApi/")) {
    return new Response(JSON.stringify({
      error: "路径无效",
      message: "仅支持 /FundMNewApi/ 开头的路径"
    }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*"
      }
    })
  }

  const targetUrl = `${TARGET_BASE}${path}${query}`

  // --- 4. 准备转发请求 ---
  // 复制原始请求头，并覆盖关键字段
  const headers = new Headers(request.headers)
  // 删除可能导致问题的头
  headers.delete("Host")
  headers.delete("Origin")
  headers.delete("Referer")
  // 设置伪装头（模拟手机端）
  headers.set("User-Agent", "Mozilla/5.0 (Linux; Android 11; SM-G9910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36")
  headers.set("Accept", "application/json, text/plain, */*")
  headers.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
  headers.set("Referer", "https://fund.eastmoney.com/")
  headers.set("Origin", "https://fund.eastmoney.com")

  // 处理请求体（GET/HEAD 不带 body）
  const body = (request.method === "GET" || request.method === "HEAD") ? null : request.body

  try {
    // --- 5. 发起转发 ---
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      redirect: "follow"
    })

    // --- 6. 获取响应数据（支持流式传输） ---
    const data = await response.text()

    // --- 7. 返回响应，带上 CORS 头 ---
    const origin = request.headers.get("Origin") || "*"
    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=60"  // 可缓存 60 秒
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: "代理请求失败",
      message: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*"
      }
    })
  }
}