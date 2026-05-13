# Phase 3 — 基金列表表格 1:1 复刻

> **目标**：将基金列表的表格渲染逻辑完全对齐 VSCode 版 `generateFundRow`，包括表头日期、TD 双行数据、长按基金名弹窗、列设置等。  
> **预计工时**：1.5 天

---

## 3.1 表头日期逻辑修正

### 问题现状

- 当前表头次行日期逻辑不正确
- 估算涨幅/估算收益的日期应该是最新一个交易日（今天如果开市就是今天）
- 其他列（当日涨幅、当日收益、持有收益、总收益率、金额/份额、成本/最新）的日期是上一个交易日的日期
- 关联板块列没有日期

### 目标

参照 VSCode 版 `script.ts` 中 `generateTableHeader` 的逻辑：

```typescript
// 估算列日期：来自 gztime（估算更新时间的日期部分）
// 格式：MM-DD
const estimatedDate = fund.gztime ? fund.gztime.substring(5, 10) : ''

// 其他列日期：来自 netValueDate（净值日期，即上一个交易日）
// 格式：MM-DD
const netValueDate = fund.netValueDate ? fund.netValueDate.substring(5, 10) : ''
```

### 实施

修改 `headerSubLabel` 函数：

```typescript
function headerSubLabel(col: string): string {
  const sample = sortedRows.value[0]
  if (!sample) return '—'
  
  switch (col) {
    case 'estimatedChange':
    case 'estimatedGain':
      // 估算列：使用估算日期（最新交易日）
      return sample.estimatedDateLabel || '—'
    case 'dailyChange':
    case 'dailyGain':
    case 'holdingGain':
    case 'holdingGainRate':
    case 'amountShares':
    case 'cost':
      // 其他列：使用净值日期（上一个交易日）
      return sample.navDateLabel || '—'
    case 'sector':
      return '' // 关联板块无日期
    default:
      return '—'
  }
}
```

---

## 3.2 TD 双行数据完整复刻

### 问题现状

部分列的 TD 渲染逻辑与 VSCode 版不一致，需要逐列对齐。

### 各列 TD 渲染规则（参照 `generateFundRow`）

| 列 Key | TD 主行 | TD 次行 | 备注 |
|--------|---------|---------|------|
| `name` | 基金名称（ellipsis） | `[代码]` + `[分组tag]` | 第一行支持长按弹窗 |
| `estimatedChange` | `±X.XX%`（估算涨幅） | 完整更新时间 `HH:MM` | 休市时显示 `—` |
| `estimatedGain` | `±XXX.XX`（估算收益） | `±X.XX%`（估算涨幅） | 休市时显示 `—` |
| `dailyChange` | `±X.XX%`（当日涨幅） | 净值日期 `MM-DD` | — |
| `dailyGain` | `±XXX.XX`（当日收益） | 净值日期 `MM-DD` | — |
| `holdingGain` | `±XXX.XX`（持有收益） | `±X.XX%`（持有收益率） | — |
| `holdingGainRate` | `±X.XX%`（总收益率） | `±XXX.XX`（持有收益） | — |
| `sector` | 板块名称 | — | 单行 |
| `amountShares` | `XXX.XX`（持有金额） | `XXXX.XX 份`（持有份额） | — |
| `cost` | `X.XXXX`（成本价） | `X.XXXX`（最新净值） | 4位小数 |

### 实施

确保每列的 `<template #default>` 渲染与上表一致。特别注意：

**估算列的休市判断**：
```typescript
// shouldShowEstimated 判断逻辑
const shouldShowEstimated = computed(() => {
  // 如果 gsz 为空或为 0，说明是 QDII 或休市
  // 如果 isRealValue 为 true，说明已更新真实净值，估算数据无意义
  return fund.gsz && parseFloat(fund.gsz) > 0 && !fund.isRealValue
})
```

**估算涨幅列的颜色逻辑**：
```typescript
function estGainClass(row: FundRowDisplay, value: number) {
  if (!row.shouldShowEstimated) return 'muted'
  if (settingStore.grayscaleMode) return ''
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'muted'
}
```

---

## 3.3 长按基金名称弹出详情 Dialog

### 问题现状

- 当前点击基金名称弹出 FundTooltip，但内容不完整
- 需要与 VSCode 版的 tooltip 内容完全一致

### 目标效果

长按基金名称（或点击）弹出详情 Dialog：

```
┌──────────────────────────────────────┐
│ 基金名称：天弘中证工业有色金属...C   │
│ 基金代码：017193                     │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 估算涨幅 (05-13)：+1.24%           │
│ 估算收益 (05-13)：+263.83          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 当日涨幅 (05-12)：-0.54%           │
│ 当日收益 (05-12)：-114.86          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 持有收益：-132.99                   │
│ 总收益率：-0.62%                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 持有金额：21270.60                  │
│ 持有份额：10724.85                  │
│ 成本价：1.9957                      │
│ 估算净值：2.0079                    │
│ 单位净值：1.9833                    │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 关联板块：有色金属                   │
│ 更新时间：05-13 10:50               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ [查看详情] [加仓] [减仓]            │
│ [编辑持仓] [设置分组] [删除]        │
└──────────────────────────────────────┘
```

### 实施要求

**1. 修改 `FundTooltip.vue` 组件**

确保包含以下所有字段：
- 基金名称、基金代码
- 估算涨幅（含日期）、估算收益（含日期）
- 当日涨幅（含日期）、当日收益（含日期）
- 持有收益、总收益率
- 持有金额、持有份额、成本价、估算净值、单位净值
- 关联板块、更新时间

**2. 操作按钮**

- 查看详情 → 跳转到基金详情页
- 加仓 → 弹出加仓对话框
- 减仓 → 弹出减仓对话框
- 编辑持仓 → 弹出编辑对话框
- 设置分组 → 弹出分组选择
- 删除 → 确认后删除

---

## 3.4 列设置弹窗重构

### 问题现状

- 当前设置页面的列配置分为"可见列"和"列排序"两个独立模块
- VSCode 版是合并在一起的：一个列表，每项有复选框（控制可见）+ 拖拽手柄（控制排序）

### 目标效果（参照 list-header-setting.png）

```
┌──────────────────────────────────────┐
│ 列设置                          [×]  │
├──────────────────────────────────────┤
│ 列顺序和显示                         │
│ 勾选显示，取消隐藏；拖动或箭头排序   │
│ ┌──────────────────────────────────┐ │
│ │ ☰ [✓] 基金名称          (固定)  │ │
│ │ ☰ [✓] 估算涨幅          [↑][↓] │ │
│ │ ☰ [✓] 估算收益          [↑][↓] │ │
│ │ ☰ [✓] 当日涨幅          [↑][↓] │ │
│ │ ☰ [✓] 当日收益          [↑][↓] │ │
│ │ ☰ [✓] 持有收益          [↑][↓] │ │
│ │ ☰ [✓] 总收益率          [↑][↓] │ │
│ │ ☰ [ ] 关联板块          [↑][↓] │ │
│ │ ☰ [✓] 金额/份额         [↑][↓] │ │
│ │ ☰ [✓] 成本/最新         [↑][↓] │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│              [恢复默认]    [保存]     │
└──────────────────────────────────────┘
```

### 实施要求

**1. 合并可见列和列排序为一个列表**

每个列 item 包含：
- 拖拽手柄 `☰`（基金名称不可拖拽）
- 复选框（控制是否可见，基金名称默认可见不可取消）
- 列名称
- 上移/下移按钮（基金名称不可移动）

**2. 基金名称列特殊处理**

- 固定在第一位
- 不可隐藏（复选框 disabled）
- 不可拖拽排序
- 不显示上下移动按钮

**3. 恢复默认**

点击恢复默认后，重置为默认列顺序和全部可见。

**4. 保存逻辑**

保存时同时保存 `columnOrder` 和 `visibleColumns` 到 settingStore。

---

## 3.5 基金名称列结构

### 目标

基金名称列为两行：
- 第一行：基金名称（支持 ellipsis，点击/长按弹出 FundTooltip）
  - 如果 `isRealValue` 为 true，名称前显示 ✓ 图标
- 第二行：基金代码 + 分组 tag
  - 分组 tag 仅在"全部"分组视图下显示

### 实施

```html
<div class="fund-name-cell">
  <div class="fund-name-row" @click="openTooltip(row)">
    <span v-if="row.isRealValue" class="real-value-icon" title="已更新实际净值">✓</span>
    <span class="fund-name-text">{{ row.name }}</span>
  </div>
  <div class="fund-code-row">
    <span class="fund-code">{{ row.code }}</span>
    <span v-if="showGroupTag && row.groupName" class="group-label">{{ row.groupName }}</span>
  </div>
</div>
```

---

## 验收标准

- [ ] 表头日期正确：估算列显示估算日期，其他列显示净值日期
- [ ] 每列 TD 包含正确的主行和次行数据
- [ ] 休市时估算列显示 `—`
- [ ] 长按/点击基金名称弹出完整详情 Dialog
- [ ] 详情 Dialog 包含所有字段和操作按钮
- [ ] 列设置弹窗合并了可见性和排序功能
- [ ] 基金名称列固定不可隐藏/排序
- [ ] 恢复默认功能正常
- [ ] 基金名称列两行结构正确（名称 + 代码/分组tag）
