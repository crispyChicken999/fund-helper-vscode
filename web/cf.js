/**
 * 基金助手
 * My CloudFlare Worker
 */

// ====== 白名单：只允许这些来源调用 ======
const ALLOWED_ORIGINS = [
  "https://fund-helper.netlify.app",
  "https://crispychicken999.github.io",
  "http://localhost",
  "http://127.0.0.1",
  "https://fund-helper.ccwu.cc",
];

// ====== 目标 API 基础域名映射 ======
const TARGET_MAP = {
  "/FundMNewApi/": "https://fundmobapi.eastmoney.com",
  "/FundMApi/": "https://fundmobapi.eastmoney.com",
  "/dataapi/": "https://data.eastmoney.com",
};

// 监听 fetch 事件
addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

// ====== 检查来源是否合法（更严格版本） ======
function isAllowed(request) {
  // 1. 优先检查 Origin 头（浏览器跨域请求必带）
  const origin = request.headers.get("Origin");
  if (origin) {
    return ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed));
  }

  // 2. 如果没有 Origin，检查 Referer 头（例如从页面跳转或本站请求）
  const referer = request.headers.get("Referer");
  if (referer) {
    return ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed));
  }

  // 3. 既没有 Origin 也没有 Referer —— 直接拒绝
  return false;
}

// ====== 获取目标基础 URL ======
function getTargetBase(path) {
  for (const [prefix, base] of Object.entries(TARGET_MAP)) {
    if (path.startsWith(prefix)) {
      return base;
    }
  }
  return null;
}

// ====== 主处理函数 ======
async function handleRequest(request) {
  const url = new URL(request.url);

  // --- 1. 处理 OPTIONS 预检请求 ---
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

  // --- 2. 检查来源 ---
  if (!isAllowed(request)) {
    return new Response(
      JSON.stringify({
        error: "禁止访问",
        message: "该接口仅供授权的前端应用调用",
      }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // --- 3. 匹配目标基础 URL ---
  const path = url.pathname;
  const baseUrl = getTargetBase(path);
  if (!baseUrl) {
    return new Response(
      JSON.stringify({
        error: "路径无效",
        message: "仅支持 /FundMNewApi/ 或 /dataapi/ 开头的路径",
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

  // --- 4. 构建完整目标 URL（保留原始路径和查询参数） ---
  const query = url.search; // 包含 ? 的查询字符串
  const targetUrl = `${baseUrl}${path}${query}`;

  // --- 5. 准备转发请求 ---
  const headers = new Headers(request.headers);
  headers.delete("Host");
  headers.delete("Origin");
  headers.delete("Referer");
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Linux; Android 11; SM-G9910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
  );
  headers.set("Accept", "application/json, text/plain, */*");
  headers.set("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8");
  headers.set("Referer", "https://data.eastmoney.com/");
  headers.set("Origin", "https://data.eastmoney.com");

  const body =
    request.method === "GET" || request.method === "HEAD" ? null : request.body;

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
        "Content-Type":
          response.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "代理请求失败",
        message: error.message,
      }),
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
