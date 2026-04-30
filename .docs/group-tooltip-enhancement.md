# 分组标签 Tooltip 增强

## 修改日期
2026-04-30

## 问题描述
之前的分组标签只在 hover 时通过 `title` 属性显示简单的"分组收益"信息，信息量太少，不够直观。

## 解决方案
实现类似基金名称 tooltip 的分组统计 tooltip，显示更全面、详细的分组统计信息。

---

## 分组统计信息

### 显示的统计数据

1. **基金数量**：该分组包含多少只基金
2. **估算收益**：当前估算的总收益（盘中数据）
3. **估算涨幅**：加权平均估算涨幅（按持有金额加权）
4. **当日收益**：基于真实净值的当日总收益
5. **当日涨幅**：加权平均当日涨幅（按持有金额加权）
6. **持有收益**：总持有收益
7. **持有收益率**：加权平均持有收益率
8. **总资产**：该分组的总资产
9. **总成本**：该分组的总成本

### 计算方式

#### 加权平均涨幅
```javascript
加权平均涨幅 = Σ(持有金额 × 涨幅) / Σ(持有金额)
```

这样可以更准确地反映分组的整体涨幅，持有金额大的基金对平均涨幅的影响更大。

#### 持有收益率
```javascript
持有收益率 = (总资产 - 总成本) / 总成本 × 100%
```

---

## 视觉效果

### Tooltip 显示内容示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━
科技股
━━━━━━━━━━━━━━━━━━━━━━━━━━
基金数量：5 只
━━━━━━━━━━━━━━━━━━━━━━━━━━
估算收益：+1,234.56
估算涨幅：+2.35%
━━━━━━━━━━━━━━━━━━━━━━━━━━
当日收益：+987.65
当日涨幅：+1.89%
━━━━━━━━━━━━━━━━━━━━━━━━━━
持有收益：+5,678.90
持有收益率：+12.34%
━━━━━━━━━━━━━━━━━━━━━━━━━━
总资产：51,678.90
总成本：46,000.00
```

### 颜色标识
- 正值：红色（上涨）
- 负值：绿色（下跌）
- 零值：灰色（持平）

---

## 修改的文件

### 1. `src/sidebar/webview/script.ts`

#### 1.1 修改 `renderGroupTags()` 函数

**修改前**：
- 只计算每个分组的估算收益总和
- 使用简单的 `title` 属性显示

**修改后**：
- 计算每个分组的详细统计信息：
  - 基金数量
  - 估算收益、估算涨幅（加权平均）
  - 当日收益、当日涨幅（加权平均）
  - 持有收益、持有收益率
  - 总资产、总成本
- 将统计数据存储在 `data-group-stats` 属性中（JSON 格式）
- 绑定 hover 事件显示详细 tooltip

**关键代码**：
```javascript
// 计算每个分组的详细统计信息
const groupStats = {};
sortedGroups.forEach(g => {
  groupStats[g] = {
    count: 0,
    estimatedGain: 0,
    dailyGain: 0,
    holdingGain: 0,
    totalAssets: 0,
    totalCost: 0,
    totalHoldingAmount: 0,
    weightedEstimatedChange: 0,
    weightedDailyChange: 0,
  };
});

// 遍历所有基金，累加统计数据
fundDataCache.forEach(f => {
  // ... 计算每只基金的数据
  // 更新分组统计
  groupStats[g].count += 1;
  groupStats[g].estimatedGain += estimatedGain;
  groupStats[g].dailyGain += dailyGain;
  // ... 其他统计
});

// 计算加权平均涨幅
sortedGroups.forEach(g => {
  const stats = groupStats[g];
  if (stats.totalHoldingAmount > 0) {
    stats.avgEstimatedChange = stats.weightedEstimatedChange / stats.totalHoldingAmount;
    stats.avgDailyChange = stats.weightedDailyChange / stats.totalHoldingAmount;
  }
  if (stats.totalCost > 0) {
    stats.holdingGainRate = (stats.holdingGain / stats.totalCost) * 100;
  }
});
```

#### 1.2 新增 `handleGroupTagHover()` 函数

创建并显示分组统计 tooltip。

**功能**：
- 解析 `data-group-stats` 属性中的 JSON 数据
- 创建 tooltip DOM 元素
- 显示详细的统计信息
- 根据数值正负显示不同颜色
- 定位 tooltip（默认显示在标签下方，空间不足时显示在上方）
- 绑定关闭按钮和 mouseleave 事件

**关键代码**：
```javascript
function handleGroupTagHover(e) {
  const groupTag = e.target.closest('.group-tag-btn[data-group-stats]');
  if (!groupTag) return;

  // 移除已存在的 tooltip
  removeTooltip();

  const tooltipDataStr = groupTag.getAttribute('data-group-stats');
  const data = JSON.parse(tooltipDataStr.replace(/&quot;/g, '"'));

  // 创建 tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'group-tooltip';
  tooltip.innerHTML = `
    <div class="tooltip-header">
      <div class="tooltip-title">${data.groupName}</div>
      <button class="tooltip-close-btn">×</button>
    </div>
    <div class="tooltip-divider"></div>
    <div class="tooltip-row">
      <span class="tooltip-label">基金数量：</span>
      <span class="tooltip-value">${data.count} 只</span>
    </div>
    <!-- 更多统计信息 -->
  `;

  document.body.appendChild(tooltip);

  // 定位 tooltip
  const rect = groupTag.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  // ... 边界检查和调整
  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}
```

#### 1.3 新增 `handleGroupTagLeave()` 函数

处理鼠标离开分组标签的事件，延迟移除 tooltip（允许鼠标移到 tooltip 上）。

#### 1.4 修改 `removeTooltip()` 函数

同时移除基金 tooltip 和分组 tooltip。

```javascript
function removeTooltip() {
  const existingTooltip = document.querySelector('.fund-tooltip');
  if (existingTooltip) {
    existingTooltip.remove();
  }
  const existingGroupTooltip = document.querySelector('.group-tooltip');
  if (existingGroupTooltip) {
    existingGroupTooltip.remove();
  }
}
```

---

### 2. `src/sidebar/webview/style.ts`

#### 新增 `.group-tooltip` 样式

与 `.fund-tooltip` 样式类似，但宽度稍大（`min-width: 180px`, `max-width: 280px`）以容纳更多信息。

```css
.group-tooltip {
  position: fixed;
  z-index: 9999;
  background: var(--vscode-editorHoverWidget-background);
  border: 1px solid var(--vscode-editorHoverWidget-border);
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  min-width: 180px;
  max-width: 280px;
  font-size: 12px;
  color: var(--vscode-editorHoverWidget-foreground);
  pointer-events: auto;
  box-sizing: border-box;
  overflow: hidden;
}

/* 分组 Tooltip 中的颜色类 */
.group-tooltip .color-up {
  color: #f14c4c;
}

.group-tooltip .color-down {
  color: #73c991;
}

.group-tooltip .color-flat {
  color: var(--vscode-descriptionForeground);
}

/* 分组标签可 hover */
.group-tag-btn[data-group-stats] {
  cursor: pointer;
  position: relative;
}
```

---

## 用户体验提升

### 1. 信息更全面
- ✅ 从只显示"分组收益"到显示 9 项详细统计
- ✅ 用户可以快速了解分组的整体情况

### 2. 视觉更直观
- ✅ 使用颜色标识正负值（红涨绿跌）
- ✅ 分隔线清晰区分不同类别的统计
- ✅ 与基金 tooltip 风格一致

### 3. 交互更友好
- ✅ Hover 即显示，无需等待
- ✅ 可以移动鼠标到 tooltip 上查看
- ✅ 关闭按钮方便快速关闭
- ✅ 自动定位，避免超出屏幕边界

### 4. 数据更准确
- ✅ 使用加权平均涨幅，更准确反映分组整体表现
- ✅ 区分估算数据和真实数据
- ✅ 显示总资产和总成本，方便计算

---

## 技术细节

### 1. 加权平均计算
使用持有金额作为权重，计算加权平均涨幅：
```javascript
weightedChange = Σ(holdingAmount × changePercent)
avgChange = weightedChange / totalHoldingAmount
```

这样可以更准确地反映分组的整体涨幅，避免小额持仓对平均值的过度影响。

### 2. Tooltip 定位
- 默认显示在标签下方（`top = rect.bottom + 8`）
- 如果下方空间不足，显示在上方（`top = rect.top - tooltipRect.height - 8`）
- 如果右侧空间不足，向左对齐（`left = window.innerWidth - tooltipRect.width - 8`）

### 3. 事件处理
- 使用事件委托，在 `renderGroupTags()` 中绑定事件
- 延迟移除 tooltip（200ms），允许鼠标移到 tooltip 上
- 检查鼠标是否在 tooltip 或标签上，避免误关闭

---

## 注意事项

1. **"全部"分组**：统计所有基金的数据，不重复计算
2. **空分组**：如果分组没有基金，统计数据都为 0
3. **数据格式**：使用 `toFixed(2)` 保留两位小数，保持一致性
4. **颜色标识**：使用 `getColorClass()` 函数统一处理颜色

---

## 相关文件
- `src/sidebar/webview/script.ts` - 前端显示逻辑
- `src/sidebar/webview/style.ts` - CSS 样式
