/**
 * JSONP 加载器 — 绕过 CORS 限制
 * 适用于支持 callback 参数的接口（如 fundmobapi.eastmoney.com）
 */

let jsonpCounter = 0

export function loadJSONP<T = any>(url: string, timeout = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__jsonp_cb_${Date.now()}_${++jsonpCounter}`
    const separator = url.includes('?') ? '&' : '?'
    const fullUrl = `${url}${separator}callback=${callbackName}`

    const script = document.createElement('script')
    script.src = fullUrl
    script.async = true

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
 * 普通 JSON fetch（用于不需要 JSONP 且无 CORS 限制的接口）
 */
export async function fetchJSON<T = any>(url: string, timeout = 12000): Promise<T | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
