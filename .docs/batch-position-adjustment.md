# 批量加减仓功能设计文档

## 一、功能概述

在基金助手的 VSCode 端和 Web 端，于顶部统计栏（`stat-label` 区域）新增一个**批量加减仓**按钮，点击后弹出操作面板，用户可在此：

- **加仓**：搜索并选择基金 → 选择买入日期（加载最近15日净值列表）→ 输入买入金额 → 计算新成本价和份额
- **减仓**：搜索并选择基金 → 输入减仓份额（受最大持仓份额限制）

> 所有数据**仅存储在本地**（Web 端用 `localStorage`，VSCode 端用 `ExtensionContext.globalState`），**不上传云端**，Web 端和 VSCode 端互相隔离，避免与云同步功能产生冲突。

---

## 二、UI 结构

### 2.1 入口按钮

**VSCode 端**（`src/sidebar/webview/index.ts`）

在 `stat-label` 内，紧跟 `btn-toggle-web`（网页版按钮）之后，新增：

```html
<button class="btn-batch-adjust" id="btnBatchAdjust" title="批量加减仓">
  <!-- 上下箭头组合图标 -->
  <svg>...</svg>
</button>
```

**Web 端**（`web/src/views/HomeView.vue`）

在 `stat-label` 内 `el-button` 组之前，新增：

```html
<el-button size="small" round @click="showBatchAdjust = true" title="批量加减仓">
  <el-icon><Sort /></el-icon>
</el-button>
```

### 2.2 弹窗布局

弹窗分为三个 Tab / 区域：

```
┌─────────────────────────────────────────────┐
│  批量加减仓                          [×关闭]  │
├─────────────────────────────────────────────┤
│  [加仓] [减仓] [进行中(N)]                    │
├─────────────────────────────────────────────┤
│                                             │
│  【加仓模块】                                │
│  🔍 搜索基金...                             │
│  ┌─────────────────────────────────────┐    │
│  │ 搜索结果列表（点击添加）               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  已选加仓基金列表：                           │
│  ┌─────────────────────────────────────┐    │
│  │ [x] 易方达蓝筹精选                    │    │
│  │     日期: [2025-05-15 ▾] 净值:1.2345 │    │
│  │     金额: [______] 元                │    │
│  │     预计新成本价: --  新份额: --       │    │
│  │                                     │    │
│  │ [x] 广发科技先锋                      │    │
│  │     日期: [待更新 ▾] 净值:--          │    │
│  │     金额: [______] 元                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  【减仓模块】                                │
│  🔍 搜索基金...                             │
│                                             │
│  已选减仓基金列表：                           │
│  ┌─────────────────────────────────────┐    │
│  │ [x] 招商中证白酒                      │    │
│  │     份额: [______] (最多 356.78 份)   │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│               [取消]    [确认操作]            │
└─────────────────────────────────────────────┘
```

### 2.3 进行中 Tab

展示当前所有处于 `pending` 状态（选择当日净值但净值尚未更新）的加仓记录：

```
┌────────────────────────────────────────────┐
│  进行中 (2)                                 │
├────────────────────────────────────────────┤
│  易方达蓝筹精选 (005827)                     │
│  预计买入日期: 2025-05-18    金额: 5000 元   │
│  状态: ⏳ 等待 2025-05-18 净值更新           │
│  [取消]                                    │
│                                            │
│  广发科技先锋 (004879)                       │
│  预计买入日期: 2025-05-18    金额: 3000 元   │
│  状态: ⏳ 等待 2025-05-18 净值更新           │
│  [取消]                                    │
└────────────────────────────────────────────┘
```

---

## 三、数据结构设计

### 3.1 单条加仓记录

```typescript
interface BuyRecord {
  id: string                // 唯一 ID（时间戳 + 随机数）
  code: string              // 基金代码
  name: string              // 基金名称（快照）
  buyDate: string           // 买入日期 "YYYY-MM-DD"
  amount: number            // 买入金额（元）
  navOnBuyDate: number | null  // 买入日期对应净值（null = 待更新）
  status: 'pending' | 'confirmed' | 'cancelled'
  // 'pending': 净值未更新，等待确认
  // 'confirmed': 已确认，基金数据已更新
  // 'cancelled': 用户取消
  createdAt: number         // 创建时间戳
  confirmedAt?: number      // 确认时间戳
}
```

### 3.2 单条减仓记录

```typescript
interface SellRecord {
  id: string
  code: string
  name: string
  sellShares: number        // 减仓份额
  navOnSell: number         // 减仓时的最新净值（当前 dwjz）
  status: 'done'
  createdAt: number
}
```

### 3.3 本地存储 Key

```
localStorage key (Web):   "fund_helper_pending_buys"   → BuyRecord[]
VSCode globalState key:   "fund_helper_pending_buys"   → BuyRecord[]
```

减仓因为是即时操作（直接用当前净值执行），不需要 pending 状态，直接修改基金份额和成本价，操作完成后不再持久化 SellRecord（或者可选保留最近50条操作日志供查看）。

---

## 四、核心交互逻辑

### 4.1 加仓——日期选择与净值加载

1. 用户选中一个基金后，调用历史净值接口获取最近 **15 日净值**：
   ```
   https://funddataapi.eastmoney.com/Fund/GetFundNetDiagramNew
     ?FCODE={code}&RANGE=y1&_={timestamp}
   ```
   或直接使用现有的 `proxyFetch` 走代理：
   ```
   https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx
     ?FCODE={code}&RANGE=m1
   ```
   取最近 15 条记录（`jzList: [{Date, Dv}]`）。

2. 日期下拉列表中：
   - 展示历史净值列表（最近15日，格式：`2025-05-15  1.2345`）
   - 额外增加一个选项：**「今日（{today}）」**，表示选择当日净值
   - 今日净值如果还没更新（即净值列表中最新日期 < 今天），净值列显示 `--（待更新）`

3. 用户选择「今日」时，`navOnBuyDate = null`，标记为 `pending` 状态；选择历史日期时，直接从列表中取对应净值。

### 4.2 加仓计算公式

```
新份额   = 买入金额 / 买入净值
新总份额  = 原份额 + 新份额
新成本价  = (原份额 × 原成本价 + 买入金额) / 新总份额
```

弹窗中实时预览（仅供参考，展示在每个加仓 item 下方）。

### 4.3 减仓计算公式

减仓只改变份额，成本价不变：
```
新份额   = 原份额 - 减仓份额
```
减仓份额最大值 = 当前持仓份额（`fund.num`），输入框 `max` 属性限制，`placeholder` 展示 `最多 {fund.num} 份`。

### 4.4 点击「确认操作」

1. **处理即时加仓项**（navOnBuyDate 有值）：
   - 计算新成本价和新份额
   - 调用 `fundStore.updateFund(code, newNum, newCost)` 更新持仓
   - 数据保存到本地，**不触发云同步**（用户需手动云同步）

2. **处理 pending 加仓项**（navOnBuyDate 为 null）：
   - 将记录写入本地 `fund_helper_pending_buys`
   - 状态 = `pending`

3. **处理减仓项**：
   - 计算新份额
   - 调用 `fundStore.updateFund(code, newNum, fund.cost)` 更新持仓
   - 数据保存到本地，**不触发云同步**

4. 弹窗关闭后，如有 pending 项，顶部进行中按钮显示角标数量。

> **云同步说明**：所有加减仓操作（即时执行或 pending 确认）均只写入本地存储，不自动触发云同步。用户需要在需要的时候手动点击云同步按钮，将更新后的份额和成本价同步到云端。

### 4.5 Pending 加仓——净值更新后的确认流程

**触发时机**：每次应用初始化（`initApp`）或手动刷新后，刷新完成时检查一次。

**检查逻辑**（`checkPendingBuys`）：

```typescript
async function checkPendingBuys(): Promise<void> {
  const pendingList = loadPendingBuys()  // 读取本地存储
  if (!pendingList.length) return

  // 取出所有 pending 记录中，今日净值已更新的项
  const readyList: BuyRecord[] = []
  
  for (const record of pendingList) {
    const detail = fundStore.fundDetails.get(record.code)
    if (!detail) continue
    
    // 判断：基金当前净值日期 >= 买入日期
    if (detail.netValueDate && detail.netValueDate >= record.buyDate) {
      record.navOnBuyDate = detail.netValue  // 获取对应净值
      readyList.push(record)
    }
  }
  
  if (readyList.length === 0) return
  
  // 弹出确认弹窗
  showPendingConfirmDialog(readyList)
}
```

**确认弹窗内容**（每个 ready 记录展示一条）：

```
╔══════════════════════════════════════════════╗
║  净值已更新，确认加仓？                        ║
╠══════════════════════════════════════════════╣
║  易方达蓝筹精选 (005827)                      ║
║  买入日期：2025-05-18   净值：1.2456          ║
║  买入金额：5,000 元                           ║
║  买入份额：+4,014.43 份                       ║
║  当前份额：12,000 份 → 新份额：16,014.43 份    ║
║  当前成本：1.1800 → 新成本价：1.1965           ║
╠══════════════════════════════════════════════╣
║  广发科技先锋 (004879)                        ║
║  买入日期：2025-05-18   净值：0.9876          ║
║  买入金额：3,000 元                           ║
║  买入份额：+3,038.58 份                       ║
║  ...                                         ║
╠══════════════════════════════════════════════╣
║         [稍后再说]        [全部确认加仓]        ║
╚══════════════════════════════════════════════╝
```

- **全部确认加仓**：批量更新所有 ready 记录对应基金的份额和成本价（写入本地存储），并从 pending 列表中移除这些记录。**不触发云同步**，数据仅保存到本地，用户需手动触发云同步。
- **稍后再说**：关闭弹窗，不做任何操作。下次重新打开插件/网页时，若这些 pending 项的净值仍然已更新，则再次弹出提示。

> 注意：确认弹窗中只展示「本次净值已更新」的 pending 记录，不会把仍未更新的记录一并展示。例如有 10 个 pending 记录，本次进入时只有 5 个基金的净值已更新，则弹窗只显示这 5 条；用户确认后这 5 条从 pending 列表移除。剩余 5 条仍保留在 pending 中，等下次进入时再检查——若届时净值已更新，弹窗会再次出现。

---

## 五、基金搜索实现

复用现有的 `searchFund` 函数（`web/src/api/fundEastmoney.ts`）：

```
https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx
  ?m=9&key={keyword}&callback={callbackName}
```

- 输入时 debounce 300ms 后触发搜索
- 搜索结果展示 `name + code`，点击后加入已选列表
- 搜索框在已选列表更新后清空，但保持焦点

**限制**：
- 每个基金只能在加仓列表中出现一次（重复点击提示"已添加"）
- 仅能选择**当前持仓**中的基金进行减仓（因为需要知道当前份额和成本价）
- 加仓可以选择任意基金（包括未持仓的，相当于新建持仓，成本价 = 买入净值，份额 = 买入金额 / 净值）

---

## 六、历史净值接口

需要新增接口，通过代理请求东方财富历史净值：

```typescript
// web/src/api/fundNav.ts (新文件)

export interface NavRecord {
  date: string    // "YYYY-MM-DD"
  nav: number     // 单位净值
}

export async function fetchRecentNavList(code: string, days = 15): Promise<NavRecord[]> {
  const url = `https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx`
    + `?FCODE=${code}&RANGE=m1&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0`
  try {
    const res = await proxyFetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    const data = await res.json().catch(() => null)
    // data.Datas 是 [[date, nav], ...] 或 [{Date, Dv}, ...]
    // 取最近 days 条，逆序（最新在前）
    const list: NavRecord[] = (data?.Datas ?? [])
      .slice(-days)
      .reverse()
      .map((item: any) => ({
        date: item[0] ?? item.Date ?? '',
        nav: parseFloat(item[1] ?? item.Dv ?? 0)
      }))
    return list
  } catch {
    return []
  }
}
```

**VSCode 端**：历史净值接口在现有 `fundService.ts` 中已有 `getNetValueHistory`，可直接复用（通过 `postMessage` 发送到 Webview）。

---

## 七、实现范围与文件影响

### Web 端

| 文件 | 变更 | 说明 |
|---|---|---|
| `web/src/views/HomeView.vue` | 新增 | 添加入口按钮 + `showBatchAdjust` 状态 |
| `web/src/components/BatchAdjustModal.vue` | **新建** | 弹窗主组件（加仓/减仓/进行中三个面板） |
| `web/src/components/PendingConfirmDialog.vue` | **新建** | Pending 加仓确认弹窗 |
| `web/src/api/fundNav.ts` | **新建** | 历史净值接口 |
| `web/src/services/pendingBuyService.ts` | **新建** | Pending 记录的增删查、净值检查逻辑 |
| `web/src/appInit.ts` | 修改 | 初始化完成后调用 `checkPendingBuys()` |
| `web/src/services/storageService.ts` | 修改 | 新增 `loadPendingBuys / savePendingBuys` 方法 |

### VSCode 端

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/sidebar/webview/index.ts` | 修改 | 在 `stat-label` 添加入口按钮 HTML |
| `src/sidebar/webview/script.ts` | 修改 | 初始化批量加减仓弹窗，绑定按钮事件 |
| `src/sidebar/webview/batchAdjust.ts` | **新建** | Webview 侧 JS（弹窗渲染、搜索、列表管理） |
| `src/sidebar/webview/style.ts` | 修改 | 新增弹窗样式 |
| `src/extension.ts` | 修改 | 新增 message handler：`getBatchPendingBuys`、`saveBatchPendingBuys`、`confirmPendingBuy`、`searchFundForBatch`、`getNavHistory` |
| `src/core.ts` / `src/fundService.ts` | 修改 | 新增 `getNavHistory(code)` 方法（如尚未有） |

---

## 八、本地存储隔离说明

| 端 | 存储方式 | Key | 数据格式 |
|---|---|---|---|
| Web | `localStorage` | `fund_helper_pending_buys` | `BuyRecord[]` JSON |
| VSCode | `ExtensionContext.globalState` | `fund_helper_pending_buys` | `BuyRecord[]` JSON |

两端数据**完全独立**，不共享、不上传云端。云同步只包含：`funds`（code/num/cost）、`groups`、`columnSettings` 等字段，`pending_buys` 字段始终不进入云端 payload。

---

## 九、边界情况处理

| 情况 | 处理方式 |
|---|---|
| 加仓基金不在持仓中 | 允许，成本价 = 买入净值，份额 = 买入金额 / 净值；若是当日 pending，则 pending 期间基金尚未在持仓列表中，确认后再执行 `addFund` |
| Pending 记录对应基金被用户手动删除 | 检查时发现基金不存在，则自动将 pending 记录标记为 `cancelled` 并从列表中移除，不做任何提示 |
| 买入金额为 0 或负数 | 输入框校验，不允许提交 |
| 减仓份额 > 持仓份额 | `max` 属性限制 + 提交时再次校验 |
| 同一基金同一天有多条 pending | 允许存在，确认时依次处理（累计计算） |
| 网络错误导致历史净值加载失败 | 显示"加载失败，请重试"，重试按钮；用户也可手动输入净值 |
| 开市时段频繁打开插件 | `checkPendingBuys` 每次初始化都检查，但弹窗只在有 ready 记录时出现，不会无故打扰 |

---

## 十、开发顺序建议

1. **数据层先行**：`storageService` 扩展 + `pendingBuyService` 新建 + `fundNav.ts` 新建
2. **Web 端弹窗**：`BatchAdjustModal.vue` + `PendingConfirmDialog.vue`
3. **Web 端集成**：`HomeView.vue` 入口 + `appInit.ts` 检查逻辑
4. **VSCode 端适配**：`batchAdjust.ts` + `index.ts` HTML + `extension.ts` message handler
5. **联调测试**：覆盖 pending 确认流程、计算公式正确性、云同步不受影响三个核心场景
