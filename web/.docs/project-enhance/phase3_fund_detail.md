# Phase 3 — 基金详情页（1:1 复刻 VSCode 版）

> **目标**：完整复刻 `src/detail/html.ts` + `src/detail/scripts.ts` 的基金详情页，包含 6 个 Tab、ECharts 图表、持仓/概况/经理/关联板块/历史净值/累计收益完整信息。  
> **预计工时**：2 天

---

## 3.1 页面整体结构

参照 `src/detail/html.ts`，`FundDetailView.vue` 完全重构：

```
FundDetailView (使用 DetailLayout，只有 header + scrollable content)
├── Header: 基金名(code) + 刷新按钮
├── Tab 栏（6 个 Tab）
│   ├── [持仓信息]  ← 默认激活
│   ├── [基金概况]
│   ├── [基金经理]
│   ├── [关联板块]
│   ├── [历史净值]
│   └── [累计收益]
└── Tab Panel 内容区
```

---

## 3.2 持仓信息 Tab

参照 `src/detail/html.ts:50-94`，展示用户在该基金的持仓数据（本地 fundConfig 计算）：

| 字段 | 计算方式 | 颜色 |
|------|---------|------|
| 持仓份额 | `fund.shares.toFixed(2)` | — |
| 持仓成本 | `fund.cost.toFixed(4)` | — |
| 当前金额 | `shares × netValue` | — |
| 最新净值 | `fund.netValue.toFixed(4)` | — |
| 估算净值 | `fund.estimatedValue?.toFixed(4) \|\| '--'` | 涨红跌绿 |
| 估算涨跌幅 | `fund.changePercent.toFixed(2)%` | 涨红跌绿 |
| 持有收益 | `当前金额 - 成本金额` | 涨红跌绿 |
| 持有收益率 | `持有收益 / 成本金额 × 100%` | 涨红跌绿 |
| 日收益（估） | `shares × netValue × changePercent / 100` | 涨红跌绿 |
| 更新时间 | `fund.updateTime` | — |

**UI 样式**：`info-grid` 网格布局，每行 2 列，label 灰色小字，value 大字加粗。

---

## 3.3 基金概况 Tab

参照 `src/detail/scripts.ts` 中的 `loadFundInfo` 逻辑，调用以下接口：

```typescript
// 接口：dgs.tiantianfunds.com/merge/m/api/jjxqy1_2（POST）
// 参照 src/fundService.ts:591 fetchFundDetailInfo
```

**展示字段**（从 `fetchFundDetailInfo` 返回的 `fundUniqueInfo` 数据中提取）：

| 字段 | 接口字段 |
|------|---------|
| 基金类型 | `FTYPE` / `TTYPENAME` |
| 风险等级 | `RISKLEVEL` |
| 成立日期 | `ESTABDATE` |
| 基金规模 | `ENDNAV`（亿元） |
| 基金公司 | `JJGS` |
| 跟踪指数 | `INDEXNAME`（指数型基金） |
| 跟踪误差 | `TRKERROR` |
| 基准指数 | `BENCH` |
| 近1年收益 | `SYL_1N` |
| 近3年收益 | `SYL_LN` |
| 近成立来 | `SYL_Z` |
| 申购费率 | `SOURCERATE` |
| 管理费率 | `RATE` |
| 夏普比率1年 | `SHARP1`（从 `fundUniqueInfo` 字段） |
| 最大回撤1年 | `MAXRETRA1` |

**风险指标展示**（`fundUniqueInfo` 数据）：

以 3 列网格展示：同类排名（N/M 名）、同类百分位：

```
同类排名：
  夏普比率(1年)  标准差(1年)  最大回撤(1年)
  234/1890       156/1890     89/1890
  同类前12%      同类前8%     同类前5%
```

---

## 3.4 基金经理 Tab

参照 `src/detail/scripts.ts` 中的经理数据渲染，从 `fetchFundDetailInfo` 返回数据中的 `fundUniqueInfo.BUSINESSTYPE` 等字段解析：

**展示内容**（每位经理一个卡片）：

```
┌──────────────────────────────┐
│ [头像占位] 张三               │
│ 任职时间：2021-03-15 至今     │
│ 任职回报：+45.67%             │
│ 从业年限：5年                 │
│ 管理基金：3只                 │
│ 个人简介：... (可展开)        │
└──────────────────────────────┘
```

接口字段：`BUSINESSTYPE`=经理名、`BUSINESSCODE`=经理ID、`TSRQ`=任职开始日期、`BTYPE`=任职回报率。

---

## 3.5 关联板块 Tab

参照 `src/detail/scripts.ts` 中的 `loadThemeData`，调用 `fetchFundRelateTheme`（参照 `src/fundService.ts:540`）：

**展示内容**：

```
┌──────────────────────────────┐
│ 关联板块（相关性从高到低）     │
├──────────────────────────────┤
│ 半导体       相关性：0.89    │
│ 消费电子     相关性：0.76    │
│ 科技硬件     相关性：0.71    │
│ 新能源汽车   相关性：0.65    │
└──────────────────────────────┘
```

字段：`SEC_NAME`=板块名，`CORR_1Y`=1年相关系数，`OL2TOP`=超额收益。

---

## 3.6 历史净值 Tab（ECharts 折线图）

参照 `src/detail/html.ts:123-139` + `scripts.ts` 中的 `loadNetValueChart`：

### 时间范围选择器

```
[近1周] [近1月✓] [近3月] [近6月] [近1年] [近3年] [近5年]
```

### 数据接口

```typescript
// 参照 src/fundService.ts:419 getNetValueHistory
async function fetchNetValueHistory(code: string, pageSize: number): Promise<NetValueRecord[]> {
  const url = `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=${pageSize}&startDate=&endDate=&_=${Date.now()}`
  const res = await fetch(url, {
    headers: { Referer: 'https://fundf10.eastmoney.com/' }
  })
  // ...
}
```

pageSize 映射：
```
近1周  → 7
近1月  → 30
近3月  → 90
近6月  → 180
近1年  → 365
近3年  → 1095
近5年  → 1825
```

### ECharts 配置

```typescript
{
  tooltip: { trigger: 'axis' },
  grid: { left: '1%', right: '2%', top: 20, bottom: 50, containLabel: true },
  xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
  yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 11 } },
  dataZoom: [
    { type: 'inside' },
    { type: 'slider', bottom: 8, height: 20 }
  ],
  series: [{
    type: 'line',
    data: netValues,
    smooth: true,
    showSymbol: false,
    lineStyle: { width: 2, color: 'var(--color-primary)' },
    areaStyle: { opacity: 0.1 }
  }]
}
```

---

## 3.7 累计收益 Tab（ECharts 折线图）

参照 `src/detail/html.ts:141-157`：

与历史净值 Tab 结构相同（时间范围选择器 + ECharts），但展示的是**累计收益率**（基于用户持仓成本计算的个人收益曲线）：

```
收益率(%) = (当日净值 - 成本价) / 成本价 × 100
```

Y 轴格式：`+15.23%`

---

## 3.8 数据接口汇总

| Tab | 接口 | 备注 |
|-----|------|------|
| 持仓信息 | 本地 fundStore 数据 | 无需网络请求 |
| 基金概况 | `fetchFundDetailInfo` (POST tiantianfunds) | 需要 Vite proxy |
| 基金经理 | 同上，解析 `fundUniqueInfo` | — |
| 关联板块 | `fetchFundRelateTheme` (POST tiantianfunds) | 需要 Vite proxy |
| 历史净值 | `api.fund.eastmoney.com/f10/lsjz` | 需要 Referer 头 |
| 累计收益 | 同历史净值，前端计算 | — |

**Vite proxy 配置补充**：

```typescript
'/api-proxy/tiantian': {
  target: 'https://dgs.tiantianfunds.com',
  changeOrigin: true,
  rewrite: path => path.replace('/api-proxy/tiantian', '/merge/m/api')
},
'/api-proxy/eastfund': {
  target: 'https://api.fund.eastmoney.com',
  changeOrigin: true,
  rewrite: path => path.replace('/api-proxy/eastfund', ''),
  headers: { Referer: 'https://fundf10.eastmoney.com/' }
}
```

---

## 3.9 Tab 懒加载

每个 Tab 首次被点击时才请求数据，使用 `loadedTabs: Set<string>` 记录已加载的 Tab：

```typescript
const loadedTabs = ref(new Set<string>())

async function onTabChange(tab: string) {
  if (loadedTabs.value.has(tab)) return
  loadedTabs.value.add(tab)
  await loadTabData(tab)
}
```

---

## 3.10 刷新功能

点击 Header 右上角「刷新」按钮：

```typescript
async function handleRefresh() {
  loadedTabs.value.clear()  // 清除已加载标记
  await loadTabData(activeTab.value)  // 重新加载当前 Tab
}
```

---

## 验收标准

- [ ] 持仓信息 Tab 所有字段正确展示，涨跌颜色正确
- [ ] 基金概况 Tab 从天天基金接口获取真实数据（类型、规模、费率、风险指标等）
- [ ] 基金经理 Tab 展示每位经理的卡片信息
- [ ] 关联板块 Tab 展示相关性排序的板块列表
- [ ] 历史净值 Tab ECharts 折线图正常，7 个时间范围可切换
- [ ] 累计收益 Tab 基于用户成本价计算个人收益率曲线
- [ ] Tab 首次点击才加载数据（懒加载），切换无重复请求
- [ ] 刷新按钮可强制重新获取所有 Tab 数据
- [ ] 图表在移动端也能正常显示和交互（dataZoom）
