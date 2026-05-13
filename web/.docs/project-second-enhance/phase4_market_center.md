# Phase 4 — 行情中心修复与完善

> **目标**：修复行情中心的配色问题、板块 ECharts 图表不渲染问题，完全对齐 VSCode 版 `marketWebview.ts` 的实现。  
> **预计工时**：1.5 天

---

## 4.1 Header 配色修复

### 问题现状

- `header-top` 的 `h2` 颜色使用了 `var(--text-h)` 导致与背景重叠看不清
- 深色/浅色模式下标题文字不可见

### 修复方案

将 `h2` 颜色改为 `var(--text-primary)`：

```css
.market-header .header-top h2 {
  color: var(--text-primary);  /* 替换原来的 var(--text-h) */
  font-size: 1.1rem;
  font-weight: 600;
}
```

同时检查所有使用 `var(--text-h)` 的地方，统一替换为 `var(--text-primary)` 或合适的文字颜色变量。

---

## 4.2 板块 ECharts 图表不渲染问题

### 问题现状

行业板块、风格板块、概念板块、地域板块的 ECharts 图表没有绘制出来。

### 根因分析

参照 VSCode 版 `marketWebview.ts` 的实现，板块数据通过代理接口获取：

```
https://data.eastmoney.com/dataapi/bkzj/getbkzj?key=f62&code=m%3A90%2Bs%3A4
```

该接口返回结构：
```json
{
  "data": {
    "total": 128,
    "diff": [
      { "f12": "BK1037", "f13": 90, "f14": "消费电子", "f62": 7809078528 }
    ]
  }
}
```

Web 端可能存在以下问题：
1. CORS 限制导致请求失败
2. 代理配置不正确
3. 数据解析逻辑错误
4. ECharts 容器尺寸为 0（未正确设置 display）

### 修复方案

**1. 确认 Vite 代理配置**

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api-proxy/bkzj': {
      target: 'https://data.eastmoney.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api-proxy\/bkzj/, '/dataapi/bkzj')
    }
  }
}
```

**2. 修复 API 调用**

```typescript
// api/market.ts
export async function fetchPlateData(code: string, key: string = 'f62'): Promise<any[]> {
  const url = `/api-proxy/bkzj/getbkzj?key=${key}&code=${encodeURIComponent(code)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) }).catch(() => null)
  if (!res?.ok) return []
  const json = await res.json().catch(() => null)
  return json?.data?.diff || []
}
```

**3. 板块代码映射（与 VSCode 版一致）**

```typescript
const PLATE_CODES = {
  industry: 'm:90+s:4',  // 行业板块
  style: 'm:90+e:4',     // 风格板块
  concept: 'm:90+t:3',   // 概念板块
  region: 'm:90+t:1'     // 地域板块
}
```

**4. ECharts 渲染逻辑（参照 VSCode 版 `renderPlateChart`）**

```typescript
function renderPlateChart(chartRef: Ref<HTMLElement>, data: any[], key: string) {
  if (!data.length || !chartRef.value) return
  
  const chart = echarts.init(chartRef.value)
  
  // 按 key 字段排序（降序）
  const sorted = [...data].sort((a, b) => (b[key] || 0) - (a[key] || 0))
  const names = sorted.map(d => d.f14 || '--')
  const values = sorted.map(d => parseFloat(((d[key] || 0) / 1e8).toFixed(4)))
  const colors = values.map(v => v >= 0 ? '#f56c6c' : '#4eb61b')
  
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0]
        const v = parseFloat(p.value)
        const sign = v >= 0 ? '+' : ''
        const col = v >= 0 ? '#f56c6c' : '#4eb61b'
        return `${p.name}<br/>净流入: <span style="color:${col};font-weight:600;">${sign}${v.toFixed(2)}</span> 亿`
      }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 130, containLabel: false },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        color: textColor,
        fontSize: 11,
        rotate: 0,
        formatter: (value: string) => value.split('').join('\n')
      },
      axisLine: { lineStyle: { color: gridColor } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor, fontSize: 11 },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } }
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        bottom: 8,
        height: 18,
        startValue: 0,
        endValue: Math.min(29, names.length - 1)
      },
      { type: 'inside', xAxisIndex: 0 }
    ],
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
      barMaxWidth: 30
    }]
  }, true)
}
```

**5. 确保 ECharts 容器有正确尺寸**

```css
.plate-chart {
  width: 100%;
  min-height: 280px;
  /* 确保 Tab 切换后容器可见 */
}
```

切换 Tab 后需要调用 `chart.resize()`：

```typescript
watch(activeMainTab, () => {
  nextTick(() => {
    // 触发所有 chart resize
    Object.values(chartInstances).forEach(chart => chart?.resize())
  })
})
```

---

## 4.3 子 Tab 切换逻辑

### 问题现状

板块的子 Tab（今日排行/5日排行/10日排行）切换后可能没有重新请求数据。

### 修复方案

参照 VSCode 版，子 Tab 切换时使用不同的 `key` 参数重新请求：

```typescript
const SUB_TAB_KEYS = {
  today: 'f62',    // 今日排行
  fiveDay: 'f164', // 5日排行
  tenDay: 'f174'   // 10日排行
}

function switchSubTab(tabId: string, key: string) {
  activeSubTabs[tabId] = key
  fetchPlateData(tabId, PLATE_CODES[tabId], key)
}
```

---

## 4.4 大盘资金流向图表

### 确认实现

确保沪深两市资金流向（分钟级）图表正常渲染：

```typescript
// 接口：push2.eastmoney.com（允许跨域）
async function loadFlowKline() {
  const url = `https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=1&secid=1.000001&secid2=0.399001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&_=${Date.now()}`
  const res = await fetch(url)
  const json = await res.json()
  const klines = json?.data?.klines || []
  renderFlowChart(klines)
}
```

图表包含 5 条线：主力净流入、超大单净流入、大单净流入、中单净流入、小单净流入。

---

## 4.5 全球指数图片

### 确认实现

全球指数使用东方财富的图片接口，按分类展示：

```typescript
const INDEX_CONFIGS = {
  'A股': [
    { nid: '1.000001', name: '上证指数' },
    { nid: '1.000300', name: '沪深300' },
    { nid: '0.399001', name: '深证成指' },
    { nid: '1.000688', name: '科创50' },
    { nid: '0.399006', name: '创业板指' },
    { nid: '0.399005', name: '中小100' },
    { nid: '118.AU9999', name: '黄金9999' }
  ],
  '港股': [
    { nid: '100.HSI', name: '恒生指数' },
    { nid: '124.HSTECH', name: '恒生科技' }
  ],
  '美股': [
    { nid: '100.DJIA', name: '道琼斯' },
    { nid: '100.NDX', name: '纳斯达克' },
    { nid: '100.NDX100', name: '纳斯达克100' },
    { nid: '100.SPX', name: '标普500' },
    { nid: '101.GC00Y', name: 'COMEX黄金' }
  ],
  '亚太': [
    { nid: '100.N225', name: '日经225' },
    { nid: '100.VNINDEX', name: '越南胡志明' },
    { nid: '100.SENSEX', name: '印度孟买SENS' }
  ]
}

function getIndexImageUrl(nid: string): string {
  return `https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid=${nid}&rnd=${Date.now()}`
}
```

---

## 验收标准

- [ ] 行情中心标题文字在深色/浅色模式下都清晰可见
- [ ] 行业板块 ECharts 柱状图正常渲染
- [ ] 风格板块 ECharts 柱状图正常渲染
- [ ] 概念板块 ECharts 柱状图正常渲染
- [ ] 地域板块 ECharts 柱状图正常渲染
- [ ] 子 Tab 切换（今日/5日/10日）正确刷新图表数据
- [ ] 大盘资金流向分钟级折线图正常渲染
- [ ] 全球指数图片按分类正确展示
- [ ] Tab 切换后图表自动 resize
