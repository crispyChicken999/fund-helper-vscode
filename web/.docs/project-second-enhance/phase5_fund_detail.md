# Phase 5 — 基金详情页重写

> **目标**：参照 VSCode 版 `src/detail/scripts.ts` 的生成逻辑，重写 Web 端基金详情页，修复持仓信息日收益（估）无数据、基金概况不显示、基金经理无信息等问题。  
> **预计工时**：2 天

---

## 5.1 持仓信息修复

### 问题现状

- 日收益（估）没有数据
- 持仓信息展示不完整

### 目标

持仓信息区域应展示以下字段：

| 字段 | 数据来源 | 计算逻辑 |
|------|---------|---------|
| 持有金额 | `shares × dwjz` | 份额 × 最新净值 |
| 持有份额 | 配置中的 `num` | — |
| 成本价 | 配置中的 `cost` | — |
| 持有收益 | `shares × (dwjz - cost)` | — |
| 持有收益率 | `(dwjz - cost) / cost × 100%` | — |
| 日收益（估） | `shares × dwjz × gszzl / 100` | 份额 × 净值 × 估算涨幅% |
| 当日收益 | `shares × dwjz × navChgRt / 100` | 份额 × 净值 × 当日涨幅% |
| 估算净值 | `gsz` | 来自 fundgz 接口 |
| 单位净值 | `dwjz` | 来自 MNFInfo 接口 |
| 累计净值 | `ljjz` | 来自详情接口 |

### 修复方案

```typescript
// 日收益（估）计算
const estimatedDailyGain = computed(() => {
  if (!fundDetail.value) return 0
  const { shares, dwjz, gszzl } = fundDetail.value
  if (!gszzl || gszzl === 0) return 0
  return shares * dwjz * gszzl / 100
})

// 当日收益计算
const dailyGain = computed(() => {
  if (!fundDetail.value) return 0
  const { shares, dwjz, navChgRt } = fundDetail.value
  if (!navChgRt || navChgRt === 0) return 0
  return shares * dwjz * navChgRt / 100
})
```

---

## 5.2 基金概况信息完善

### 问题现状

基金概况没有显示出来，缺少基金类型、成立日期、基金公司、基金经理等信息。

### 目标效果

```
基金概况
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
基金类型        指数型-股票
成立日期        2022-03-15
基金公司        南方基金
基金经理        朱恒红
单位净值        1.3258 (2026-05-12)
累计净值        1.3338
基金规模        25.44 亿
交易状态        开放申购 / 开放赎回
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
近1周收益率     +3.64%
近1月收益率 (排名)    +7.77% (2252)
近3月收益率 (排名)    +5.21% (1991)
近6月收益率 (排名)    +11.43% (2161)
近1年收益率 (排名)    +36.6% (1815)
近3年收益率 (排名)    0% (--)
近5年收益率 (排名)    0% (--)
成立以来收益率        0%
```

### 数据来源

参照 VSCode 版 `src/detail/scripts.ts` 中的接口调用：

**1. 基金基本信息接口**

```typescript
// 基金概况数据
const FUND_INFO_URL = `https://fund.eastmoney.com/pingzhongdata/${code}.js`
// 或使用 JSONP
const FUND_DETAIL_URL = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNDetail?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
```

**2. 基金经理信息**

```typescript
// 基金经理接口
const MANAGER_URL = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNManager?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
```

**3. 收益率排名**

```typescript
// 阶段收益率
const RATE_URL = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNPeriodIncrease?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
```

### 实施

**修改 `api/fundDetail.ts`**

```typescript
export interface FundOverview {
  fundType: string       // 基金类型
  establishDate: string  // 成立日期
  fundCompany: string    // 基金公司
  fundManager: string    // 基金经理
  nav: string            // 单位净值
  navDate: string        // 净值日期
  accNav: string         // 累计净值
  fundScale: string      // 基金规模
  tradeStatus: string    // 交易状态
  // 阶段收益率
  weekRate: string
  monthRate: string
  monthRank: string
  threeMonthRate: string
  threeMonthRank: string
  sixMonthRate: string
  sixMonthRank: string
  yearRate: string
  yearRank: string
  threeYearRate: string
  threeYearRank: string
  fiveYearRate: string
  fiveYearRank: string
  sinceEstablishRate: string
}

export async function fetchFundOverview(code: string): Promise<FundOverview | null> {
  // 调用 FundMNDetail 接口获取基本信息
  const detailUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNDetail?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  const detailRes = await fetch(detailUrl).catch(() => null)
  if (!detailRes?.ok) return null
  const detailData = await detailRes.json()
  
  // 调用 FundMNPeriodIncrease 接口获取阶段收益
  const rateUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNPeriodIncrease?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  const rateRes = await fetch(rateUrl).catch(() => null)
  const rateData = rateRes?.ok ? await rateRes.json() : null
  
  // 解析并返回
  // ...
}
```

---

## 5.3 基金经理信息

### 问题现状

基金经理信息没有展示。

### 修复方案

```typescript
export interface FundManagerInfo {
  name: string
  workTime: string      // 任职时间
  totalDays: number     // 任职天数
  totalReturn: string   // 任职回报
  manageFunds: string[] // 管理基金列表
}

export async function fetchFundManager(code: string): Promise<FundManagerInfo | null> {
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNManager?FCODE=${code}&deviceid=web&plat=Android&appType=ttjj&product=EFund&Version=1`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) return null
  const data = await res.json()
  const manager = data?.Datas?.[0]
  if (!manager) return null
  
  return {
    name: manager.MGRNAME || '',
    workTime: manager.FEMPDATE || '',
    totalDays: manager.DAYS || 0,
    totalReturn: manager.PENAVGROWTH || '',
    manageFunds: (manager.BINDLIST || []).map((f: any) => f.SHORTNAME)
  }
}
```

---

## 5.4 历史净值和累计收益图表修复

### 问题现状

- 历史净值和累计收益只有近一周和近1月可以看到
- 其他时间段（近3月、近6月、近1年、近3年、近5年）没有数据

### 根因分析

参照 VSCode 版 `scripts.ts` 中的时间范围请求逻辑：

```typescript
const RANGES = [
  { label: '近1周', days: 7 },
  { label: '近1月', days: 30 },
  { label: '近3月', days: 90 },
  { label: '近6月', days: 180 },
  { label: '近1年', days: 365 },
  { label: '近3年', days: 1095 },
  { label: '近5年', days: 1825 }
]
```

可能的问题：
1. 请求参数中的日期范围计算错误
2. 接口返回数据量大时解析失败
3. 切换时间范围后没有重新请求数据

### 修复方案

**1. 历史净值接口**

```typescript
// 使用 JSONP 方式获取历史净值
export async function fetchHistoryNav(code: string, startDate: string, endDate: string): Promise<any[]> {
  // 接口：fund.eastmoney.com/f10/F10DataApi.aspx
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=365&startDate=${startDate}&endDate=${endDate}&_=${Date.now()}`
  const res = await fetch(url, {
    headers: { 'Referer': 'https://fund.eastmoney.com/' }
  }).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json()
  return data?.Data?.LSJZList || []
}
```

**2. 确保所有时间范围都能正确请求**

```typescript
function getDateRange(days: number): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  
  return {
    startDate: formatDate(start), // YYYY-MM-DD
    endDate: formatDate(end)
  }
}

async function loadHistoryData(range: number) {
  const { startDate, endDate } = getDateRange(range)
  const data = await fetchHistoryNav(fundCode, startDate, endDate)
  renderNavChart(data)
}
```

**3. 累计收益图表**

```typescript
// 累计收益 = 当前净值相对于起始净值的涨幅
function calculateCumulativeReturn(navList: any[]): { dates: string[]; values: number[] } {
  if (!navList.length) return { dates: [], values: [] }
  
  const sorted = [...navList].reverse() // 按时间正序
  const baseNav = parseFloat(sorted[0].DWJZ)
  
  const dates = sorted.map(item => item.FSRQ.substring(5)) // MM-DD
  const values = sorted.map(item => {
    const nav = parseFloat(item.DWJZ)
    return ((nav - baseNav) / baseNav * 100)
  })
  
  return { dates, values }
}
```

---

## 5.5 详情页整体结构重写

### 目标

参照 VSCode 版 `detail/html.ts` 的页面结构，重写 `FundDetailView.vue`：

```
┌──────────────────────────────────────────────────────────────┐
│ [← 返回]  基金名称 (代码)                        [刷新]     │
├──────────────────────────────────────────────────────────────┤
│ 持仓信息                                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 持有金额  持有份额  成本价  持有收益  持有收益率          │ │
│ │ 日收益(估)  当日收益  估算净值  单位净值  累计净值        │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ [基金概况] [历史净值] [累计收益]                              │
├──────────────────────────────────────────────────────────────┤
│ (Tab 内容区)                                                 │
│                                                              │
│ 基金概况 Tab：基金类型、成立日期、基金公司、基金经理...       │
│ 历史净值 Tab：ECharts 折线图 + 时间范围切换                  │
│ 累计收益 Tab：ECharts 面积图 + 时间范围切换                  │
└──────────────────────────────────────────────────────────────┘
```

### 实施

完全重写 `FundDetailView.vue`，确保：
1. 持仓信息区域所有字段有数据
2. 基金概况 Tab 展示完整信息
3. 历史净值 Tab 所有时间范围都能加载数据
4. 累计收益 Tab 所有时间范围都能加载数据
5. 基金经理信息正确展示

---

## 验收标准

- [ ] 持仓信息中"日收益（估）"有正确数据
- [ ] 基金概况完整展示（基金类型、成立日期、基金公司、基金经理等）
- [ ] 基金经理信息正确显示（姓名、任职时间、任职回报）
- [ ] 阶段收益率（近1周~成立以来）全部有数据
- [ ] 历史净值图表所有时间范围（近1周~近5年）都能正常渲染
- [ ] 累计收益图表所有时间范围都能正常渲染
- [ ] 时间范围切换后图表正确更新
- [ ] 详情页整体布局与 VSCode 版一致
