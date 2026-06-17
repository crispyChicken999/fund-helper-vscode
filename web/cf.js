/**
 * 基金助手
 * Cloudflare Worker - 通用API代理（不剥离路径）
 */

const ALLOWED_ORIGINS = [
  "https://fund-helper.netlify.app",
  "https://crispychicken999.github.io",
  "http://localhost",
  "http://127.0.0.1",
  "https://fund-helper.ccwu.cc",
  "https://api.fund-helper.ccwu.cc",
];

// ====== 目标 API 基础域名映射（直接拼接路径，不剥离前缀） ======
const TARGET_MAP = {
  "/FundMNewApi/": "https://fundmobapi.eastmoney.com",
  "/FundMApi/": "https://fundmobapi.eastmoney.com",
  "/dataapi/": "https://data.eastmoney.com",
  // "/push2/" 已移除，不再代理
};

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

function isAllowed(request) {
  const origin = request.headers.get("Origin");
  if (origin) {
    return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
  }
  const referer = request.headers.get("Referer");
  if (referer) {
    return ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed));
  }
  return false;
}

function getTargetBase(path) {
  for (const [prefix, base] of Object.entries(TARGET_MAP)) {
    if (path.startsWith(prefix)) {
      return base;
    }
  }
  return null;
}

async function handleRequest(request) {
  const url = new URL(request.url);

  // OPTIONS 预检
  if (request.method === "OPTIONS") {
    if (!isAllowed(request)) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 来源检查
  if (!isAllowed(request)) {
    return new Response(
      JSON.stringify({ error: "禁止访问", message: "该接口仅供授权的前端应用调用" }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  const path = url.pathname;
  const baseUrl = getTargetBase(path);
  if (!baseUrl) {
    return new Response(
      JSON.stringify({
        error: "路径无效",
        message: "仅支持 /FundMNewApi/、/FundMApi/、/dataapi/ 开头的路径",
      }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        },
      }
    );
  }

  // 直接拼接完整路径 + 查询参数（不剥离任何前缀）
  const query = url.search;
  const targetUrl = `${baseUrl}${path}${query}`;

  // 构建转发请求头
  const headers = new Headers(request.headers);
  headers.delete("Origin");
  headers.delete("Referer");
  // 注意：不删除 Host，让 fetch 自动设置

  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Linux; Android 11; SM-G9910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
  );
  headers.set("Accept", "application/json, text/plain, */*");
  headers.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");

  // 根据路径设置 Referer 和 Origin（用于伪装）
  if (path.startsWith("/dataapi/")) {
    headers.set("Referer", "https://data.eastmoney.com/");
    headers.set("Origin", "https://data.eastmoney.com");
  } else {
    headers.set("Referer", "https://fund.eastmoney.com/");
    headers.set("Origin", "https://fund.eastmoney.com");
  }

  const body = (request.method === "GET" || request.method === "HEAD") ? null : request.body;

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: body,
      redirect: "follow",
    });

    const data = await response.text();
    const origin = request.headers.get("Origin") || "*";

    return new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "代理请求失败", message: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
        },
      }
    );
  }
}