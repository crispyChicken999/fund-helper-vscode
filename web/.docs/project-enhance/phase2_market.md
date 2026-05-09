# Phase 2 — 行情中心（1:1 复刻 VSCode 版）

> **目标**：完整复刻 `src/marketWebview.ts` 的行情中心，包含大盘资金、行业/风格/概念/地域板块、全球指数图片，以及每分钟整点自动刷新。  
> **预计工时**：1.5 天

---

## 2.1 页面结构（参照 marketWebview.ts:160-219）

将现有 `MarketView.vue` 完全重构，结构如下：

```
MarketView (使用 MainLayout)
├── Header: "行情中心" + 更新时间 + 刷新按钮
├── 主 Tab 栏（横向滚动）
│   ├── [大盘资金]  ← 默认激活
│   ├── [行业板块]
│   ├── [风格板块]
│   ├── [概念板块]
│   └── [地域板块]
└── Tab 内容区（各 Tab 懒加载，首次点击才请求）
```

---

## 2.2 大盘资金 Tab

### 2.2.1 两市成交统计条（marketStat）

参照 `marketWebview.ts:362-371`，展示：

```
两市合计成交额：12345.67亿元   上涨：2134   平盘：234   下跌：1876
```

**数据接口**：
```typescript
// push2.eastmoney.com 直接 fetch（允许跨域）
const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000001,0.399001&fields=f1,f2,f3,f4,f6,f12,f13,f104,f105,f106&_=${Date.now()}`
```

解析字段：`f6`=成交额，`f104`=上涨，`f105`=下跌，`f106`=平盘（上证+深证求和）。

### 2.2.2 大盘指数卡片（indexCards）

4 个指数卡片，参照 `marketWebview.ts:342-360`：

```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ 上证指数   │ │ 沪深300    │ │ 深证成指   │ │ 创业板指   │
│ 3256.78    │ │ 3891.23    │ │ 10234.56   │ │ 1987.34    │
│ +1.23%     │ │ -0.45%     │ │ +0.89%     │ │ +2.34%     │
│ +39.78     │ │ -17.89     │ │ +90.12     │ │ +45.67     │
└────────────┘ └────────────┘ └────────────┘ └────────────┘
  左边框红色         左边框绿色
```

卡片左边框颜色：涨红跌绿，与 A 股习惯一致（`--color-up` / `--color-down`）。

**数据接口**：
```
https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&fields=f2,f3,f4,f12,f13,f14&secids=1.000001,1.000300,0.399001,0.399006&_=时间戳
```

### 2.2.3 全球指数子 Tab + 图片

参照 `marketWebview.ts:476-515`：

```
[A股指数] [港股指数] [美股指数] [亚太指数]
```

每个子 Tab 展示对应指数的 K 线图片（`webquotepic.eastmoney.com`）：

| 分组 | 指数清单 |
|------|---------|
| A股 | 上证001、沪深300、深证成指、科创50、创业板、中小100、黄金9999 |
| 港股 | 恒生指数、恒生科技 |
| 美股 | 道琼斯、纳斯达克、纳斯达克100、标普500、COMEX黄金 |
| 亚太 | 日经225、越南胡志明、印度孟买 |

图片 URL 格式：
```
https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid={nid}&rnd={时间戳}
```

每张图 90×106px，圆角 6px，hover 有阴影。

### 2.2.4 沪深资金流向图（ECharts 折线图）

参照 `marketWebview.ts:374-420`：

**数据接口**：
```
https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?lmt=0&klt=1&secid=1.000001&secid2=0.399001&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63&_=时间戳
```

**ECharts 配置**（5 条折线）：
- 主力净流入（蓝）
- 超大单净流入（红）
- 大单净流入（青）
- 中单净流入（绿）
- 小单净流入（橙）

单位：亿元（原始值除以 1e8）

X 轴：时间（`HH:mm`），Y 轴：亿元数值，tooltip 显示正负颜色。

---

## 2.3 板块 Tab（行业/风格/概念/地域）

参照 `marketWebview.ts:422-473`，四个 Tab 共用相同逻辑，只是 `code` 参数不同：

| Tab | code 参数 |
|-----|---------|
| 行业板块 | `m:90+s:4` |
| 风格板块 | `m:90+e:4` |
| 概念板块 | `m:90+t:3` |
| 地域板块 | `m:90+t:1` |

每个 Tab 内部有子 Tab：

```
[今日排行(f62)] [5日排行(f164)] [10日排行(f174)]
```

**数据接口**（需要 Vite proxy 因为 CORS）：
```
/api-proxy/bkzj/getbkzj?key={f62|f164|f174}&code={板块code}
```

Vite 代理配置：
```typescript
'/api-proxy/bkzj': {
  target: 'https://data.eastmoney.com',
  changeOrigin: true,
  rewrite: path => path.replace('/api-proxy/bkzj', '/dataapi/bkzj')
}
```

**ECharts 柱状图配置**（参照 `marketWebview.ts:446-473`）：
- X 轴：板块名称（竖排字符显示，如 `半\n导\n体`）
- Y 轴：净流入亿元
- 柱子颜色：正值红色、负值绿色
- dataZoom：slider + inside，默认显示前 30 个
- 图表高度 280px

---

## 2.4 懒加载策略

参照 `marketWebview.ts:278-286` 的 `loadTabOnce` 逻辑：

```typescript
const loadedTabs = new Set<string>()

function loadTabOnce(tab: string) {
  if (loadedTabs.has(tab)) return
  loadedTabs.add(tab)
  switch(tab) {
    case 'market':   loadMarket(); loadIndexImages(); break
    case 'industry': loadPlate('industry', 'm:90+s:4'); break
    case 'style':    loadPlate('style',    'm:90+e:4'); break
    case 'concept':  loadPlate('concept',  'm:90+t:3'); break
    case 'region':   loadPlate('region',   'm:90+t:1'); break
  }
}
```

首次进入页面自动加载「大盘资金」Tab，其他 Tab 点击时才请求。

手动刷新时：`loadedTabs.clear()` 并重新加载当前 Tab。

---

## 2.5 自动刷新（每分钟整点）

参照 `marketWebview.ts:539-578`：

```typescript
function setupAutoRefresh() {
  function scheduleNext() {
    const now = new Date()
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
    setTimeout(() => {
      // 仅工作日 9:00-15:00 自动刷新
      const hour = new Date().getHours()
      const day  = new Date().getDay()
      if (day >= 1 && day <= 5 && hour >= 9 && hour < 15) {
        refreshAll()
      }
      scheduleNext()
    }, delay)
  }
  scheduleNext()
}
```

更新时间显示：`更新于 10:30:00（25秒后刷新）`，每秒倒计时更新。

---

## 2.6 ECharts 引入方式

使用 CDN 避免打包体积膨胀：

```typescript
// src/utils/echarts.ts
let echartsLoaded = false

export async function loadEcharts(): Promise<typeof echarts> {
  if (window.echarts) return window.echarts
  if (echartsLoaded) {
    // 等待加载完成
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (window.echarts) { clearInterval(check); resolve(window.echarts) }
      }, 50)
    })
  }
  echartsLoaded = true
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js'
    script.onload = () => resolve(window.echarts)
    script.onerror = reject
    document.head.appendChild(script)
  })
}
```

在 `MarketView.vue` 的 `onMounted` 中 `await loadEcharts()` 后再初始化图表。

---

## 2.7 图表响应式

```typescript
// 监听容器尺寸变化，自动 resize 所有图表
const resizeObserver = new ResizeObserver(() => {
  Object.values(chartInstances).forEach(c => c.resize())
})
resizeObserver.observe(contentEl.value)
onUnmounted(() => resizeObserver.disconnect())
```

---

## 验收标准

- [ ] 大盘资金 Tab：两市成交额、上涨/平/跌数量正确展示
- [ ] 四个大盘指数卡片实时数据，涨红跌绿左边框
- [ ] 全球指数子 Tab 切换，图片正确加载（A股/港股/美股/亚太）
- [ ] 资金流向图 ECharts 折线图正常渲染，tooltip 正确显示正负亿元
- [ ] 行业/风格/概念/地域板块柱状图正常，dataZoom 可拖拽
- [ ] 板块子 Tab 切换（今日/5日/10日）正常
- [ ] 首次切换 Tab 才请求数据（懒加载）
- [ ] 工作日 9:00-15:00 每分钟整点自动刷新，显示倒计时
- [ ] 窗口大小变化时图表自动 resize
- [ ] 手动刷新按钮强制重新获取所有数据
