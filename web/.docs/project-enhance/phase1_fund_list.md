# Phase 1 — 基金列表 & 分组管理（完整功能复刻）

> **目标**：1:1 还原 VSCode 版本的基金列表视图，包括完整列数据、双行 TD、fund-tooltip 弹窗、分组 Tab 全功能。  
> **预计工时**：2 天

---

## 1.1 基金数据主流程复刻

### 问题现状

`web/src/services/fundService.ts` 目前只有简单的模拟数据，没有实现 VSCode 版本的双接口并行获取逻辑。

### 目标：完全复刻 `src/fundService.ts` 的 `getFundData` 逻辑

**接口调用流程**：

```
configs (基金配置列表)
  │
  ├─── 并行请求 ───────────────────────────────────────────┐
  │                                                        │
  ▼                                                        ▼
fundgz.1234567.com.cn/js/{code}.js          FundMNFInfo 批量接口
(JSONP 解析估算数据)                         (真实净值、净值日期)
  │                                                        │
  │  解析失败/返回空 → 回退到 FundMNFInfo 单独接口           │
  │                                                        │
  └───────────── 合并结果 ──────────────────────────────────┘
                     │
                     ▼
              构建 FundInfo[]
              (含估算涨幅、真实净值、持仓计算等)
```

**Web 端实现注意点**：

由于浏览器存在 CORS 限制，以下接口需要处理：

| 接口 | CORS 情况 | 解决方案 |
|------|-----------|----------|
| `fundgz.1234567.com.cn` | ✅ 允许跨域 | 直接 fetch |
| `fundmobapi.eastmoney.com/FundMNFInfo` | ✅ 允许跨域 | 直接 fetch |
| `data.eastmoney.com/dataapi/bkzj` | ❌ 不允许跨域 | 配置 Vite proxy |
| `push2.eastmoney.com` | ✅ 允许跨域 | 直接 fetch |

**`vite.config.ts` 添加代理**：
```typescript
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

### 实施：改造 `web/src/api/fundgz.ts`

```typescript
/** 解析 JSONP 响应 */
function parseJsonp(text: string): any {
  const match = text.match(/jsonpgz\((.*)\)/s)
  if (match?.[1]) {
    try { return JSON.parse(match[1]) } catch { return null }
  }
  return null
}

/** 单基金 fundgz 接口（估算数据） */
export async function fetchFundGz(code: string): Promise<any> {
  const url = `https://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
  if (!res?.ok) return null
  const text = await res.text()
  return parseJsonp(text) // 返回 null 说明休市/QDII
}

/** 批量 MNFInfo 接口（真实净值） */
export async function fetchBatchMNFInfo(codes: string[]): Promise<Map<string, any>> {
  const map = new Map<string, any>()
  if (!codes.length) return map
  const url = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?pageIndex=1&pageSize=200&plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=web&Fcodes=${codes.join(',')}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) }).catch(() => null)
  if (!res?.ok) return map
  const data = await res.json().catch(() => null)
  for (const fund of (data?.Datas ?? [])) {
    map.set(fund.FCODE, {
      navchgrt: fund.NAVCHGRT,
      jzrq: fund.PDATE,
      dwjz: fund.NAV,
      name: fund.SHORTNAME,
      gszzl: fund.GSZZL,
      gztime: data.Expansion?.GZTIME ?? ''
    })
  }
  return map
}
```

### `web/src/services/fundService.ts` 核心逻辑

完整实现 VSCode 版 `getFundData` 的所有分支：
- QDII 基金（`gsz` 为空/0）：使用持仓加权估算涨幅
- 普通基金：fundgz 估算 + MNFInfo 真实净值合并
- `isRealValue` 判断：`jzrq === gztime.substring(0,10)`
- 数据获取失败时回退到 `previousData` 中的旧数据

---

## 1.2 基金列表：完整列 + 双行 TD

### 问题现状

当前列表缺少：
- 表头双行（主字段名 + 日期副标题）  
- 每个 TD 的主行 + 次行数据  
- 列宽固定导致表头文字换行很丑
- 缺少「关联板块」列
- 缺少「成本/最新」列
- 名称列缺少 group-tag（分组标签）
- 缺少实时净值标识（✓ 图标）

### 完整列定义（参照 script.ts:2394 `generateFundRow`）

| 列 Key | 表头主行 | 表头次行 | TD 主行 | TD 次行 |
|--------|---------|---------|---------|---------|
| `name` | 基金名称 | — | 基金名（ellipsis + 点击弹窗） | `[代码]` `[group-tag]` |
| `estimatedChange` | 估算涨幅 | 估算日期/休市 | `gszzl%` | 更新时间 |
| `estimatedGain` | 估算收益 | 估算日期/休市 | `estimatedGain` | `gszzl%` |
| `dailyChange` | 当日涨幅 | 净值日期 | `navChgRt%` | 净值日期 |
| `dailyGain` | 当日收益 | 净值日期 | `dailyGain` | 净值日期 |
| `holdingGain` | 持有收益 | 净值日期 | `holdingGain` | `holdingGainRate%` |
| `holdingGainRate` | 总收益率 | 净值日期 | `holdingGainRate%` | `holdingGain` |
| `sector` | 关联板块 | — | 板块名称 | — |
| `amountShares` | 金额/份额 | 净值日期 | `holdingAmount` | `shares` |
| `cost` | 成本/最新 | 净值日期 | `cost`（成本价） | `dwjz`（最新净值） |

### 名称列 TD 结构

```html
<!-- 名称列：第一行基金名，第二行 flex 左代码右 group-tag -->
<td class="td-name">
  <div class="fund-name-cell">
    <!-- 第一行：基金名 + 实时净值图标，支持 ellipsis，点击弹出 FundTooltip -->
    <div class="fund-name" @click="openFundTooltip(fund)">
      <span v-if="fund.isRealValue" class="real-value-icon">✓</span>
      {{ fund.name }}
    </div>
    <!-- 第二行：flex 布局，左边代码右边 group-tag -->
    <div class="fund-code-row">
      <span class="fund-code">{{ fund.code }}</span>
      <!-- 仅在"全部"分组时显示 group-tag -->
      <span v-if="showGroupTag && fund.groupName" class="group-tag">{{ fund.groupName }}</span>
    </div>
  </div>
</td>
```

CSS：
```css
.td-name { min-width: 140px; max-width: 160px; }
.fund-name {
  font-size: 13px; font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  cursor: pointer; color: var(--text-primary);
}
.fund-name:hover { color: var(--color-primary); }
.fund-code-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: 4px;
  margin-top: 2px;
}
.fund-code { font-size: 11px; color: var(--text-secondary); }
.group-tag {
  font-size: 10px; padding: 1px 5px;
  background: var(--color-primary); color: #fff;
  border-radius: 3px;
  max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.real-value-icon { color: var(--color-primary); margin-right: 2px; font-size: 11px; }
```

### 数值列 TD 结构

每个数值列 TD 包含主行 + 次行：
```html
<td class="td-value">
  <div :class="upDownClass(fund.estimatedGain)">+12.34</div>
  <div class="td-sub" :class="upDownClass(fund.estimatedChange)">+1.23%</div>
</td>
```

CSS：
```css
.td-value { text-align: right; white-space: nowrap; min-width: 72px; padding: 6px 8px; }
.td-sub { font-size: 11px; color: var(--text-secondary); margin-top: 2px; }
.color-up   { color: var(--color-up); }
.color-down { color: var(--color-down); }
.color-flat { color: var(--color-flat); }
```

### 表头固定宽度（解决换行问题）

```css
.th-center {
  white-space: nowrap;    /* 表头不换行 */
  padding: 6px 8px;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
/* 排序箭头 */
.sort-arrows { margin-left: 3px; }
.arrow-up, .arrow-down { font-size: 10px; color: var(--color-flat); }
.arrow-up.active  { color: var(--color-up); }
.arrow-down.active { color: var(--color-down); }
```

### 表格整体结构

```html
<div class="fund-table-wrapper">           <!-- 水平+垂直滚动容器 -->
  <table class="fund-table">
    <thead class="fund-table-header">      <!-- position: sticky; top: 0 -->
      <tr>
        <th v-for="col in visibleColumns" ...>
          <!-- 双行表头 -->
          <div class="th-content">
            <div class="th-text">
              <div>{{ col.label }}</div>
              <div class="th-date">{{ col.dateLabel }}</div>
            </div>
            <span class="sort-arrows" v-if="col.sortable">...</span>
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="fund in sortedFunds" :key="fund.code" class="fund-row">
        <!-- 各列 TD 按 visibleColumns 顺序渲染 -->
      </tr>
    </tbody>
  </table>
</div>
```

---

## 1.3 Fund-Tooltip 弹窗（点击基金名弹出）

### 问题现状

点击基金名目前跳转到详情页路由。VSCode 版本是弹出一个 `fund-tooltip`，在当前页展示所有核心数据并提供操作入口。

### 目标

创建 `src/components/FundTooltip.vue`，以全屏遮罩弹窗形式展示：

**弹窗内容（参照 VSCode 版 tooltip）**：

```
┌─────────────────────────────┐
│ 华夏沪深300        [×关闭]  │
│ 000001                       │
├─────────────────────────────┤
│ 估算净值   估算涨幅  更新时间 │
│ 1.2345     +1.23%   10:30   │
├─────────────────────────────┤
│ 当日涨幅   当日收益  净值日期 │
│ +0.89%    +12.34   05-08    │
├─────────────────────────────┤
│ 持有收益   总收益率           │
│ +234.56   +15.23%           │
├─────────────────────────────┤
│ 金额/份额  成本/最新          │
│ 10234.56  1.1234/1.2345     │
│ 8888.88份                    │
├─────────────────────────────┤
│ 关联板块：半导体               │
├─────────────────────────────┤
│ [查看详情] [加仓] [减仓]      │
│ [编辑持仓] [设置分组] [删除]  │
└─────────────────────────────┘
```

**组件 Props**：
```typescript
interface Props {
  fund: FundData    // 基金完整数据
  visible: boolean
}
```

**操作按钮对应动作**：
- 查看详情 → `router.push('/fund/' + fund.code)`
- 加仓 → 打开加仓对话框（输入买入份额）
- 减仓 → 打开减仓对话框（输入卖出份额）
- 编辑持仓 → 打开编辑对话框（修改份额/成本价）
- 设置分组 → 打开分组选择下拉
- 删除 → ElMessageBox 确认后删除

---

## 1.4 添加基金弹窗：搜索下拉选择

### 问题现状

当前添加基金只有一个 input 框让用户输入代码，没有搜索提示。

### 目标

输入代码或关键词时，调用 `fundsuggest.eastmoney.com` 接口返回下拉候选列表：

```
┌─────────────────────────────┐
│ 添加基金                     │
├─────────────────────────────┤
│ 搜索：[000001______________] │
│       ┌─────────────────┐   │
│       │ 000001 华夏成长  │   │
│       │ 000002 华夏债券  │   │
│       │ 001234 中欧价值  │   │
│       └─────────────────┘   │
├─────────────────────────────┤
│ 已选：000001 华夏成长         │
│ 持有份额：[________]         │
│ 成本价：  [________]         │
│ 所属分组：[下拉选择____]      │
├─────────────────────────────┤
│              [取消] [确认]   │
└─────────────────────────────┘
```

**搜索接口**（参照 `src/fundService.ts:388`）：
```typescript
export async function searchFund(keyword: string): Promise<{code: string, name: string}[]> {
  if (!keyword.trim()) return []
  const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=9&key=${encodeURIComponent(keyword)}&_=${Date.now()}`
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) }).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json().catch(() => ({}))
  return (data.Datas ?? []).map((v: any) => ({ code: v.CODE, name: v.NAME }))
}
```

**防抖**：输入后 300ms 再发请求。  
**选中后**：自动填入代码字段，显示基金名称（只读），用户继续填份额/成本/分组。

---

## 1.5 分组管理：完整功能

### 问题现状

- 分组 Tab 只有基础的点击切换
- 无拖拽移动基金到分组
- 分组管理弹窗功能不完整（缺少拖拽排序分组）
- 缺少长按 group item 弹出 group-tooltip

### 目标

**分组 Tab 区域**：

```
[全部(12)] [成长(3)] [价值(5)] [QDII(4)] [+]
```

- 点击 Tab → 切换当前分组，列表只显示该分组基金
- 长按 Tab（500ms） → 弹出 `GroupTooltip` 弹窗
- `+` 按钮 → 弹出新建分组对话框

**GroupTooltip 弹窗内容**（长按分组 Tab 触发）：

```
┌──────────────────────────┐
│ 分组：成长股              │
├──────────────────────────┤
│ [✏️ 重命名]              │
│ [🗑️ 删除分组]            │
│ [↕️ 管理分组顺序]         │
└──────────────────────────┘
```

**分组管理对话框**（点击「管理分组顺序」进入）：

```
┌──────────────────────────────┐
│ 分组管理                  [×]│
├──────────────────────────────┤
│ ☰ 成长股     [✏️重命名][🗑️] │
│ ☰ 价值股     [✏️重命名][🗑️] │
│ ☰ QDII       [✏️重命名][🗑️] │
│              ← 拖拽排序      │
├──────────────────────────────┤
│ 基金跨分组移动区             │
│ 将基金拖到这里换分组         │
├──────────────────────────────┤
│               [取消] [保存]  │
└──────────────────────────────┘
```

**拖拽实现方案**：使用 `@vueuse/integrations` 的 `useSortable`（基于 SortableJS），对分组顺序列表启用拖拽。

**基金跨分组拖拽**：
- 列表中每个基金 TR 左侧显示拖拽手柄 `☰`（仅「全部」分组且无排序时）
- 拖拽基金 TR 到分组 Tab 上 → 触发移动到该分组的操作
- 使用 SortableJS 的 `group` 选项实现跨列表拖拽

**保存机制**：弹窗内所有操作（重命名、删除、排序、跨分组）暂存在本地状态，点击「保存」后一次性提交到 store → 持久化。

---

## 1.6 账户总览区更新

### 问题现状

顶部资产展示区数值计算逻辑需要与 VSCode 版的 `calculateSmartDailyGain` 对齐：
- 开盘中：用估算净值计算日收益
- 收盘后净值已更新：用真实净值计算  
- 非交易日：用最新真实净值计算

### 目标字段

| 字段 | 计算逻辑 |
|------|---------|
| 资产总值 | `Σ (shares × dwjz)` |
| 持有收益 | `Σ (shares × dwjz - shares × cost)` |
| 日收益 | `Σ calculateSmartDailyGain(fund)` |

---

## 验收标准

- [ ] 基金数据通过 fundgz + MNFInfo 双接口真实获取
- [ ] QDII 基金（返回空 JSONP）自动回退到 MNFInfo + 持仓加权估算
- [ ] 所有列在表格中正确渲染双行数据
- [ ] 表头不换行，排序箭头正常显示
- [ ] 点击基金名弹出 FundTooltip，包含完整数据和操作按钮
- [ ] 添加基金时输入关键词有搜索下拉提示
- [ ] 长按分组 Tab 弹出 GroupTooltip
- [ ] 分组内基金可拖拽排序；基金可跨分组拖拽
- [ ] 分组管理弹窗可拖拽排序分组顺序
- [ ] 账户总览日收益使用智能计算逻辑
