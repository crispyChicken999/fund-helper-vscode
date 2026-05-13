# Phase 2 — 分组管理全面重构

> **目标**：完全复刻 VSCode 版的分组管理功能，包括分组 Tab 横向滚动、长按弹窗、分组管理弹窗（拖拽排序/编辑/删除）、基金跨分组拖拽。  
> **预计工时**：2 天

---

## 2.1 分组 Tab 横向滚动条重构

### 问题现状

- 当前使用 `el-scrollbar` + `el-tag` 实现，样式与 VSCode 版差异大
- 缺少右侧设置按钮（⚙）
- 分组 item 样式不统一

### 目标效果（参照 index.png）

```
┌──────────────────────────────────────────────────────────┬───┐
│ [全部] [港股] [资源] [AI算力] [AI电力] [AI应用] [新能源] │ ⚙ │
└──────────────────────────────────────────────────────────┴───┘
                    ← 横向滚动 →
```

### 实施要求

**1. 分组 Tab 结构**

```html
<div class="group-tags-wrapper">
  <div class="group-tags-container" ref="groupTagsContainer">
    <div
      class="group-tag-item"
      :class="{ active: selectedGroupKey === 'all' }"
      @click="selectGroup('all')"
    >
      全部
    </div>
    <div
      v-for="group in groupList"
      :key="group.key"
      class="group-tag-item"
      :class="{ active: selectedGroupKey === group.key }"
      @click="selectGroup(group.key)"
      @pointerdown="onGroupPointerDown(group, $event)"
      @pointerup="onGroupPointerUp"
      @pointerleave="onGroupPointerUp"
    >
      {{ group.name }}
    </div>
  </div>
  <button class="group-tag-settings" @click="openGroupManagement" title="分组管理">
    ⚙
  </button>
</div>
```

**2. 样式**

```css
.group-tags-wrapper {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
  position: relative;
}

.group-tags-container {
  flex: 1;
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px;
}

.group-tags-container::-webkit-scrollbar {
  display: none;
}

.group-tag-item {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all 0.2s;
  user-select: none;
}

.group-tag-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.group-tag-item.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 500;
}

.group-tag-settings {
  flex-shrink: 0;
  width: 36px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-left: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.group-tag-settings:hover {
  background: var(--bg-secondary);
}
```

---

## 2.2 长按分组 Tab 弹出分组概况

### 问题现状

- 当前长按分组 Tab 弹出的是操作菜单（重命名/删除）
- VSCode 版长按弹出的是分组统计概况信息

### 目标效果

长按（500ms）分组 Tab 后弹出 Dialog，展示该分组的统计信息：

```
┌──────────────────────────────────┐
│ 分组名称：有色金属               │
│ 基金数量：7 只                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 估算收益 (05-13)：+487.19       │
│ 估算涨幅 (05-13)：+0.33%       │
│ 估算上涨/下跌 (05-13)：4 / 3   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 当日收益 (05-12)：-598.53       │
│ 当日涨幅 (05-12)：-0.41%       │
│ 当日上涨/下跌 (05-12)：1 / 6   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 持有收益 (05-12)：-1323.53      │
│ 持有收益率 (05-12)：-0.89%      │
│ 持有盈利/亏损 (05-12)：4 / 3   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ 总资产：147150.25               │
│ 总成本：148473.78               │
└──────────────────────────────────┘
```

### 实施要求

**1. 创建 `src/components/GroupTooltip.vue`**

```typescript
interface GroupStats {
  groupName: string
  fundCount: number
  // 估算
  estimatedGain: number
  estimatedChangePercent: number
  estimatedUpCount: number
  estimatedDownCount: number
  estimatedDate: string
  // 当日
  dailyGain: number
  dailyChangePercent: number
  dailyUpCount: number
  dailyDownCount: number
  dailyDate: string
  // 持有
  holdingGain: number
  holdingGainRate: number
  holdingProfitCount: number
  holdingLossCount: number
  holdingDate: string
  // 总计
  totalAsset: number
  totalCost: number
}
```

**2. 统计计算逻辑**

```typescript
function calculateGroupStats(groupKey: string): GroupStats {
  const funds = getGroupFunds(groupKey)
  
  let estimatedGain = 0, dailyGain = 0, holdingGain = 0
  let totalAsset = 0, totalCost = 0
  let estUp = 0, estDown = 0, dailyUp = 0, dailyDown = 0
  let holdProfit = 0, holdLoss = 0
  
  for (const fund of funds) {
    // 估算收益
    const estG = calculateEstimatedGain(fund)
    estimatedGain += estG
    if (fund.gszzl > 0) estUp++
    else if (fund.gszzl < 0) estDown++
    
    // 当日收益
    const dG = calculateDailyGain(fund)
    dailyGain += dG
    if (fund.navChgRt > 0) dailyUp++
    else if (fund.navChgRt < 0) dailyDown++
    
    // 持有收益
    const hG = fund.num * fund.dwjz - fund.num * fund.cost
    holdingGain += hG
    if (hG > 0) holdProfit++
    else if (hG < 0) holdLoss++
    
    totalAsset += fund.num * fund.dwjz
    totalCost += fund.num * fund.cost
  }
  
  return {
    groupName: getGroupName(groupKey),
    fundCount: funds.length,
    estimatedGain,
    estimatedChangePercent: totalCost > 0 ? (estimatedGain / totalCost) * 100 : 0,
    estimatedUpCount: estUp,
    estimatedDownCount: estDown,
    estimatedDate: getEstimatedDate(),
    dailyGain,
    dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
    dailyUpCount: dailyUp,
    dailyDownCount: dailyDown,
    dailyDate: getNetValueDate(),
    holdingGain,
    holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
    holdingProfitCount: holdProfit,
    holdingLossCount: holdLoss,
    holdingDate: getNetValueDate(),
    totalAsset,
    totalCost
  }
}
```

**3. 长按事件处理**

```typescript
const LONG_PRESS_MS = 500
let pressTimer: ReturnType<typeof setTimeout> | null = null

function onGroupPointerDown(group: Group, e: PointerEvent) {
  pressTimer = setTimeout(() => {
    // 计算分组统计并弹出 GroupTooltip
    const stats = calculateGroupStats(group.key)
    showGroupTooltip(stats)
  }, LONG_PRESS_MS)
}

function onGroupPointerUp() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}
```

---

## 2.3 分组管理弹窗重构（参照 group.png）

### 问题现状

- 当前分组管理使用 `el-dialog` + 简单列表，功能不完整
- 缺少上下两个面板（分组管理器 + 基金列表）
- 缺少基金拖拽到分组的功能
- 缺少基金列表内排序功能

### 目标效果（参照 group.png）

```
┌──────────────────────────────────────────────────────────────┐
│ 分组管理（基金从底部拖拽到上方分组）                      [×] │
├──────────────────────────────────────────────────────────────┤
│ 分组管理器（拖拽排序 / 编辑 / 删除）              [+ 新建分组]│
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ☰ 未分类                                                 │ │
│ │ ☰ 港股                                    [✏️] [🗑️]     │ │
│ │ ☰ 资源                                    [✏️] [🗑️]     │ │
│ │ ☰ AI算力                                  [✏️] [🗑️]     │ │
│ │ ☰ AI电力                                  [✏️] [🗑️]     │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ 基金列表（港股）- 共 2 只                                     │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ☰ 华夏恒生科技ETF联接C    015282                         │ │
│ │ ☰ 广发中证港股通科技ETF联接C  021760                     │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                                          [取消]    [保存]    │
└──────────────────────────────────────────────────────────────┘
```

### 实施要求

**1. 创建 `src/components/GroupManageDialog.vue`**

完全参照 VSCode 版 `group.ts` 的 `createFundGroupManager` 逻辑实现 Vue 组件版本。

**核心功能**：
- 上半部分：分组管理器
  - 显示所有分组（未分类固定在第一位，不可编辑/删除/拖拽）
  - 其他分组支持拖拽排序、重命名、删除
  - 点击分组 item 切换下方基金列表
  - 支持新建分组
- 下半部分：基金列表
  - 显示当前选中分组下的基金
  - 基金 item 支持拖拽排序（调整分组内顺序）
  - 基金 item 可拖拽到上方分组 item 上，实现跨分组移动

**2. 组件 Props & Events**

```typescript
interface Props {
  visible: boolean
  fundData: FundRowDisplay[]
  groups: Record<string, string[]>
  groupOrder: string[]
}

interface Emits {
  (e: 'update:visible', val: boolean): void
  (e: 'save', payload: {
    groupOrder: string[]
    groups: Record<string, string[]>
    orderedCodes: string[]
  }): void
}
```

**3. 拖拽实现**

使用原生 HTML5 Drag & Drop API（与 VSCode 版一致），不依赖 SortableJS：

```typescript
// 分组拖拽排序
function onGroupDragStart(group: string, e: DragEvent) {
  draggingGroup.value = group
  e.dataTransfer!.effectAllowed = 'move'
}

function onGroupDrop(targetGroup: string, e: DragEvent) {
  if (!draggingGroup.value || draggingGroup.value === targetGroup) return
  if (targetGroup === '未分类') return // 不能拖到未分类前面
  
  // 重新排序 groupOrder
  const from = groupOrder.indexOf(draggingGroup.value)
  const to = groupOrder.indexOf(targetGroup)
  groupOrder.splice(from, 1)
  groupOrder.splice(to, 0, draggingGroup.value)
}

// 基金拖拽到分组
function onFundDragToGroup(code: string, targetGroup: string) {
  // 从所有分组中移除
  for (const g of Object.keys(groups)) {
    groups[g] = groups[g].filter(c => c !== code)
  }
  // 添加到目标分组（未分类则不添加到任何分组）
  if (targetGroup !== '未分类') {
    if (!groups[targetGroup]) groups[targetGroup] = []
    groups[targetGroup].push(code)
  }
}

// 基金列表内排序
function onFundReorder(draggedCode: string, targetCode: string) {
  const list = getCurrentGroupFundList()
  const from = list.indexOf(draggedCode)
  const to = list.indexOf(targetCode)
  list.splice(from, 1)
  list.splice(to, 0, draggedCode)
}
```

**4. 未分类分组逻辑**

- 未分类分组显示所有不在任何自定义分组中的基金
- 未分类分组不可重命名、不可删除、不可拖拽排序
- 未分类分组固定在第一位

**5. 保存逻辑**

点击保存时，构建 payload 发送给父组件：

```typescript
function save() {
  const payload = {
    groupOrder: groupOrder.filter(g => g !== '未分类'),
    groups: { ...groups },
    orderedCodes: allCodes // 全局基金顺序
  }
  emit('save', payload)
  emit('update:visible', false)
}
```

---

## 2.4 基金列表拖拽排序规则

### 问题现状

基金列表的拖拽排序规则不明确，需要与 VSCode 版对齐。

### 规则

1. **全部分组**：仅在默认排序（无排序字段）时才能拖拽排序
2. **其他分组**：同样仅在默认排序时才能拖拽排序
3. 拖拽排序影响基金在该分组中的显示顺序
4. 拖拽手柄 `☰` 仅在可拖拽时显示

### 实施

```typescript
const canDragFund = computed(() => {
  // 仅在默认排序时允许拖拽
  return !fundStore.sortConfig.field || fundStore.sortConfig.field === 'default'
})
```

---

## 验收标准

- [ ] 分组 Tab 为横向滚动条，右侧有 ⚙ 设置按钮
- [ ] 长按分组 Tab（500ms）弹出分组统计概况弹窗
- [ ] 分组管理弹窗分为上下两个面板
- [ ] 分组管理器支持拖拽排序、重命名、删除
- [ ] 未分类分组固定第一位，不可编辑/删除/拖拽
- [ ] 基金列表显示当前选中分组的基金
- [ ] 基金可拖拽到上方分组实现跨分组移动
- [ ] 基金列表内可拖拽排序
- [ ] 分组排序影响首页分组 Tab 的显示顺序
- [ ] 仅在默认排序时基金列表才能拖拽
