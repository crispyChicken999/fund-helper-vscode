/** ECharts CDN 动态加载（避免打包体积膨胀） */

declare global {
  interface Window {
    echarts?: any
  }
}

let loadPromise: Promise<any> | null = null

const ECHARTS_CDN = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js'

export async function loadEcharts(): Promise<any> {
  if (window.echarts) return window.echarts

  if (loadPromise) return loadPromise

  loadPromise = new Promise<any>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = ECHARTS_CDN
    script.async = true
    script.onload = () => {
      resolve(window.echarts)
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('ECharts CDN 加载失败'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
