# Phase 1 — 首页资产栏 & 布局对齐 VSCode 版

> **目标**：将 Web 端首页的账户资产栏、搜索栏、开市/休市状态完全对齐 VSCode 版本的视觉和交互。  
> **预计工时**：1 天

---

## 1.1 账户资产栏三栏布局重构

### 问题现状

- 当前资产栏使用 `el-header` + 简单 flex 布局，配色丑陋，样式不美观
- 缺少隐藏/显示金额按钮和灰色模式按钮
- 持有收益栏缺少持有收益率
- 日收益栏缺少日收益率
- 整体视觉与 VSCode 版差距大

### 目标效果（参照 index.png）

```
┌──────────────────────────────────────────────────────────────┐
│  账户资产 [👁隐藏/显示] [🎨灰色模式]                          │
│  ¥ 147,150.25                                                │
├──────────────────────────────┬───────────────────────────────┤
│  持有收益                     │  日收益                        │
│  -1,323.53                   │  -598.53                      │
│  -0.89%                      │  -0.41%                       │
└──────────────────────────────┴───────────────────────────────┘
```

### 实施要求

**1. 重写资产栏 HTML 结构**

```html
<div class="account-summary">
  <div class="account-stats">
    <!-- 第一栏：账户资产 -->
    <div class="stat-item stat-item-main">
      <div class="stat-label">
        <span>账户资产</span>
        <button class="btn-icon" @click="togglePrivacy" title="隐藏/显示金额">
          <EyeIcon v-if="!privacyMode" />
          <EyeOffIcon v-else />
        </button>
        <button class="btn-icon" @click="toggleGrayscale" title="启用/停用灰色模式">
          <GrayscaleIcon :active="grayscaleMode" />
        </button>
      </div>
      <div class="stat-value-large">{{ formatAsset(totalAsset) }}</div>
    </div>
    <!-- 第二栏 + 第三栏 -->
    <div class="stat-item-wrapper">
      <div class="stat-item">
        <div class="stat-label">持有收益</div>
        <div class="stat-value" :class="valueClass(holdingGain)">{{ formatAsset(holdingGain) }}</div>
        <div class="stat-rate" :class="valueClass(holdingGainRate)">{{ formatPercent(holdingGainRate) }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">日收益</div>
        <div class="stat-value" :class="valueClass(dailyGain)">{{ formatAsset(dailyGain) }}</div>
        <div class="stat-rate" :class="valueClass(dailyGainRate)">{{ formatPercent(dailyGainRate) }}</div>
      </div>
    </div>
  </div>
</div>
```

**2. 资产栏样式**

```css
.account-summary {
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.account-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item-main .stat-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item-main .stat-value-large {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
  color: var(--text-primary);
}

.stat-item-wrapper {
  display: flex;
  gap: 16px;
}

.stat-item-wrapper .stat-item {
  flex: 1;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item .stat-value {
  font-size: 16px;
  font-weight: 600;
  margin-top: 2px;
}

.stat-item .stat-rate {
  font-size: 12px;
  margin-top: 2px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: var(--bg-secondary);
}
```

**3. 移除旧的 `@click="toggleAssetVisibility"` 逻辑**

不再通过点击整个资产栏切换隐私模式，改为独立按钮控制。

---

## 1.2 搜索栏 + 添加基金 + 开市/休市状态

### 问题现状

- 搜索栏和添加基金按钮布局与 VSCode 版不一致
- 缺少开市/休市状态指示器
- 搜索栏位置不对，应该在分组 Tab 下方、基金列表上方

### 目标效果

```
┌──────────────────────────────────────────────────────────────┐
│  [🔍 搜索基金...]  [+ 添加]  [● 开市/休市]                    │
└──────────────────────────────────────────────────────────────┘
```

### 实施要求

**1. 开市/休市状态组件**

参照 VSCode 版 `updateMarketStatus` 逻辑：

```typescript
// utils/marketStatus.ts
import { isMarketOpen } from '@/utils/marketChina'

export interface MarketStatusInfo {
  isOpen: boolean
  isClosed: boolean
  label: string
}

export function getMarketStatus(): MarketStatusInfo {
  const now = new Date()
  const open = isMarketOpen(now)
  return {
    isOpen: open,
    isClosed: !open,
    label: open ? '开市' : '休市'
  }
}
```

**2. 状态指示器样式**

```css
.market-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.status-open {
  background: #22c55e;
  box-shadow: 0 0 4px #22c55e;
}

.status-dot.status-closed {
  background: #9ca3af;
}
```

**3. 搜索栏布局调整**

将搜索栏从 `fund-list-header` 中提取，放到分组 Tab 和基金列表之间，与 VSCode 版一致：

```html
<div class="fund-toolbar">
  <div class="search-box">
    <el-input v-model="searchQuery" placeholder="搜索基金..." clearable size="small">
      <template #prefix><el-icon><Search /></el-icon></template>
    </el-input>
  </div>
  <el-button type="primary" size="small" @click="showAddFundDialog = true">
    <el-icon><Plus /></el-icon>
    <span>添加</span>
  </el-button>
  <div class="market-status">
    <span class="status-dot" :class="marketStatusClass"></span>
    <span class="status-text">{{ marketStatusLabel }}</span>
  </div>
</div>
```

---

## 1.3 隐私模式 & 灰色模式按钮交互

### 目标

- 隐私模式按钮：点击切换所有金额数据为 `****`
- 灰色模式按钮：点击后所有涨跌色变为统一灰色

### 实施

```typescript
// settingStore.ts 中已有 privacyMode 和 grayscaleMode
// 确保切换时同步更新 document.documentElement.dataset

function togglePrivacy() {
  settingStore.setPrivacyMode(!settingStore.privacyMode)
}

function toggleGrayscale() {
  settingStore.setGrayscaleMode(!settingStore.grayscaleMode)
}
```

灰色模式通过 CSS 变量覆盖实现（已在 Phase 0 定义）：
```css
[data-grayscale="true"] {
  --color-up: var(--text-primary);
  --color-down: var(--text-primary);
}
```

---

## 验收标准

- [ ] 资产栏为三栏布局：账户资产（含按钮）、持有收益（含收益率）、日收益（含收益率）
- [ ] 隐藏/显示按钮独立于资产栏，点击切换隐私模式
- [ ] 灰色模式按钮点击后涨跌色统一为灰色
- [ ] 搜索栏、添加按钮、开市/休市状态在同一行
- [ ] 开市时绿色圆点 + "开市"文字，休市时灰色圆点 + "休市"文字
- [ ] 资产栏配色美观，与 VSCode 版视觉一致
