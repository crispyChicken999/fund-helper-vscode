/**
 * JSONP 加载器 — 绕过 CORS 限制
 * 适用于支持 callback 参数的接口（如 fundmobapi.eastmoney.com）
 *
 * @param url         请求 URL
 * @param timeout     超时时间（毫秒），默认 15000
 * @param callbackParam 回调参数名，默认 'callback'（push2.eastmoney.com 使用 'cb'）
 */

let jsonpCounter = 0

export function loadJSONP<T = any>(url: string, timeout = 15000, callbackParam = 'callback'): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}_${++jsonpCounter}`
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}${callbackParam}=${callbackName}`

    const script = document.createElement('script')
    script.src = fullUrl
    script.async = true
    script.referrerPolicy = 'no-referrer'

    const cleanup = () => {
      delete (window as any)[callbackName]
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('JSONP timeout'))
    }, timeout)

    ;(window as any)[callbackName] = (data: T) => {
      clearTimeout(timer)
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      clearTimeout(timer)
      cleanup()
      reject(new Error('JSONP script load failed'))
    }

    document.head.appendChild(script)
  })
}

/**
 * push2.eastmoney.com 专用 JSONP 加载器
 * 该接口使用 cb 参数作为回调参数名，响应格式为 jQueryCallbackName({...})
 */
export function loadPush2JSONP<T = any>(url: string, timeout = 15000): Promise<T> {
  return loadJSONP<T>(url, timeout, 'cb')
}

/**
 * 普通 JSON fetch（用于不需要 JSONP 且无 CORS 限制的接口）
 */
export async function fetchJSON<T = any>(url: string, timeout = 30000): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, { signal: controller.signal, mode: 'cors' })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
