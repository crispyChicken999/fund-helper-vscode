# Phase 6 — 设置页面修复 & 导入导出同步

> **目标**：修复设置页面配色问题，重构列配置 UI，实现与 VSCode 版完全兼容的导入导出 JSON 格式。  
> **预计工时**：1.5 天

---

## 6.1 设置页面 Header 配色修复

### 问题现状

- 设置页面 header 配色与背景重叠，文字看不清
- 与行情中心同样的 `var(--text-h)` 问题

### 修复方案

```css
.settings-header h2 {
  color: var(--text-primary);  /* 替换 var(--text-h) */
  font-size: 1.1rem;
  font-weight: 600;
}
```

全局搜索所有使用 `var(--text-h)` 的地方，统一替换。

---

## 6.2 列配置 UI 重构

### 问题现状

- 当前设置页面的"可见列"和"列排序"是分开的两个模块
- VSCode 版是合并在一起的单一列表

### 目标效果

参照 VSCode 版 `openColumnSettings` 的实现，合并为一个列表：

```
列配置
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
勾选显示，取消隐藏；拖动或使用箭头调整顺序

☰ [✓] 基金名称          (固定，不可修改)
☰ [✓] 估算涨幅          [↑] [↓]
☰ [✓] 估算收益          [↑] [↓]
☰ [✓] 当日涨幅          [↑] [↓]
☰ [✓] 当日收益          [↑] [↓]
☰ [✓] 持有收益          [↑] [↓]
☰ [✓] 总收益率          [↑] [↓]
☰ [ ] 关联板块          [↑] [↓]
☰ [✓] 金额/份额         [↑] [↓]
☰ [✓] 成本/最新         [↑] [↓]

[恢复默认排序和显示]    [保存]
```

### 实施要求

**1. 列配置组件**

```html
<div class="column-settings-section">
  <h3>列配置</h3>
  <p class="hint">勾选显示，取消隐藏；拖动或使用箭头调整顺序</p>
  
  <div class="column-order-list">
    <div
      v-for="(col, index) in columnOrder"
      :key="col"
      class="column-order-item"
      :class="{ 'fixed-column': col === 'name' }"
      :draggable="col !== 'name'"
      @dragstart="onColDragStart(col, $event)"
      @dragover.prevent="onColDragOver(col, $event)"
      @drop="onColDrop(col, $event)"
      @dragend="onColDragEnd"
    >
      <span class="drag-handle" :class="{ disabled: col === 'name' }">☰</span>
      <label class="column-checkbox">
        <input
          type="checkbox"
          :checked="visibleColumns.includes(col)"
          :disabled="col === 'name'"
          @change="toggleColumnVisibility(col)"
        />
        <span>{{ columnDefinitions[col].label }}</span>
      </label>
      <div v-if="col !== 'name'" class="order-buttons">
        <button :disabled="index <= 1" @click="moveColumnUp(index)">↑</button>
        <button :disabled="index >= columnOrder.length - 1" @click="moveColumnDown(index)">↓</button>
      </div>
      <span v-else class="fixed-label">(固定)</span>
    </div>
  </div>
  
  <div class="column-settings-actions">
    <el-button @click="resetColumnSettings">恢复默认排序和显示</el-button>
    <el-button type="primary" @click="saveColumnSettings">保存</el-button>
  </div>
</div>
```

**2. 基金名称不可修改**

- 复选框 disabled，默认勾选
- 不可拖拽
- 不显示上下移动按钮
- 固定在第一位

**3. 恢复默认**

```typescript
const DEFAULT_COLUMN_ORDER = [
  'name', 'estimatedChange', 'estimatedGain',
  'dailyChange', 'dailyGain', 'holdingGain',
  'holdingGainRate', 'sector', 'amountShares', 'cost'
]

const DEFAULT_VISIBLE_COLUMNS = [
  'name', 'estimatedChange', 'estimatedGain',
  'dailyChange', 'dailyGain', 'holdingGain',
  'holdingGainRate', 'sector', 'amountShares', 'cost'
]

function resetColumnSettings() {
  columnOrder.value = [...DEFAULT_COLUMN_ORDER]
  visibleColumns.value = [...DEFAULT_VISIBLE_COLUMNS]
}
```

---

## 6.3 导入导出 JSON 格式兼容

### 问题现状

Web 端的导入导出格式需要与 VSCode 版完全兼容，即：
- VSCode 导出的 JSON 可以直接导入 Web 端
- Web 端导出的 JSON 可以直接导入 VSCode 端

### VSCode 版导出 JSON 结构

```json
{
  "funds": [
    {"code": "015282", "num": "41957.56", "cost": "1.3491"},
    {"code": "021760", "num": "26080.42", "cost": "1.4077"}
  ],
  "groups": {
    "港股": ["015282", "021760"],
    "资源": ["021874", "013943", "160605", "004433"],
    "AI算力": ["019331", "016874", "008989", "014855"]
  },
  "groupOrder": ["港股", "资源", "AI算力", "AI电力", "AI应用", "新能源", "杂项"],
  "columnSettings": {
    "columnOrder": ["name", "amountShares", "estimatedChange", "estimatedGain", "dailyChange", "dailyGain", "holdingGain", "holdingGainRate", "sector", "cost"],
    "visibleColumns": ["name", "amountShares", "estimatedChange", "estimatedGain", "dailyChange", "dailyGain", "holdingGain", "holdingGainRate", "sector", "cost"]
  },
  "sortMethod": "changePercent_asc",
  "refreshInterval": 0,
  "hideStatusBar": true,
  "defaultViewMode": "webview",
  "privacyMode": false,
  "grayscaleMode": true
}
```

### 实施要求

**1. 导出逻辑**

```typescript
interface ExportConfig {
  funds: Array<{ code: string; num: string; cost: string }>
  groups: Record<string, string[]>
  groupOrder: string[]
  columnSettings: {
    columnOrder: string[]
    visibleColumns: string[]
  }
  sortMethod: string
  refreshInterval: number
  hideStatusBar: boolean
  defaultViewMode: string
  privacyMode: boolean
  grayscaleMode: boolean
}

function exportConfig(): ExportConfig {
  const fundStore = useFundStore()
  const groupStore = useGroupStore()
  const settingStore = useSettingStore()
  
  return {
    funds: fundStore.funds.map(f => ({
      code: f.code,
      num: String(f.num),
      cost: String(f.cost)
    })),
    groups: groupStore.getGroupsMap(),  // { groupName: [codes] }
    groupOrder: groupStore.getGroupOrder(),
    columnSettings: {
      columnOrder: settingStore.columnOrder,
      visibleColumns: settingStore.visibleColumns
    },
    sortMethod: `${fundStore.sortConfig.field}_${fundStore.sortConfig.order}`,
    refreshInterval: settingStore.refreshInterval,
    hideStatusBar: settingStore.hideStatusBar,
    defaultViewMode: 'webview',
    privacyMode: settingStore.privacyMode,
    grayscaleMode: settingStore.grayscaleMode
  }
}

function downloadConfig() {
  const config = exportConfig()
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fund-helper-config-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

**2. 导入逻辑**

```typescript
async function importConfig(file: File) {
  const text = await file.text()
  let config: ExportConfig
  
  try {
    config = JSON.parse(text)
  } catch {
    ElMessage.error('JSON 格式错误')
    return
  }
  
  // 验证必要字段
  if (!config.funds || !Array.isArray(config.funds)) {
    ElMessage.error('配置文件缺少 funds 字段')
    return
  }
  
  // 导入基金列表
  const fundStore = useFundStore()
  fundStore.setFunds(config.funds.map(f => ({
    code: f.code,
    num: parseFloat(f.num) || 0,
    cost: parseFloat(f.cost) || 0
  })))
  
  // 导入分组
  if (config.groups && config.groupOrder) {
    const groupStore = useGroupStore()
    groupStore.importGroups(config.groups, config.groupOrder)
  }
  
  // 导入列设置
  if (config.columnSettings) {
    const settingStore = useSettingStore()
    settingStore.setColumnSettings(
      config.columnSettings.columnOrder,
      config.columnSettings.visibleColumns
    )
  }
  
  // 导入其他设置
  const settingStore = useSettingStore()
  if (config.privacyMode !== undefined) settingStore.setPrivacyMode(config.privacyMode)
  if (config.grayscaleMode !== undefined) settingStore.setGrayscaleMode(config.grayscaleMode)
  if (config.refreshInterval !== undefined) settingStore.setRefreshInterval(config.refreshInterval)
  
  // 导入排序方式
  if (config.sortMethod) {
    const [field, order] = config.sortMethod.split('_')
    fundStore.setSortConfig(field, order as 'asc' | 'desc')
  }
  
  ElMessage.success('导入成功')
  
  // 刷新数据
  await fundService.refreshAllFunds()
}
```

**3. 关键兼容点**

- `funds` 中的 `num` 和 `cost` 在 VSCode 版是字符串，导入时需要 `parseFloat`
- `groups` 的 key 是分组名称（不是 key），value 是基金代码数组
- `groupOrder` 是分组名称数组（不包含"全部"和"未分类"）
- Web 端内部使用 `groupKey` 作为分组标识，导入时需要将分组名称映射为 key

**4. 分组名称 vs 分组 Key 的映射**

由于 VSCode 版使用分组名称作为标识，Web 端也应该统一使用分组名称作为 key，避免映射复杂度：

```typescript
// groupStore 中，key 就是分组名称
// 这样导入导出时无需额外映射
interface Group {
  key: string   // 就是分组名称
  name: string  // 同 key
  fundCodes: string[]
}
```

---

## 6.4 Jsonbox 同步配置

### 问题现状

- `jsonboxName` 需要按照 `box_` 开头的规则生成
- 当前生成规则可能不正确

### 修复方案

```typescript
// 生成 boxName 规则：box_ 开头 + 随机字符串
function generateBoxName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'box_'
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Jsonbox URL 格式
// https://jsonbox.cloud.exo-imaging.com/{boxName}
function getJsonboxUrl(boxName: string): string {
  return `https://jsonbox.cloud.exo-imaging.com/${boxName}`
}
```

### 同步流程

```
Web 端扫描二维码
  ↓
获取 boxName
  ↓
localStorage.setItem('fund_helper_box_name', boxName)
  ↓
从 jsonbox 下载配置
  ↓
导入配置（同导入逻辑）
```

---

## 验收标准

- [ ] 设置页面标题文字在深色/浅色模式下清晰可见
- [ ] 列配置合并为单一列表（复选框 + 拖拽/箭头排序）
- [ ] 基金名称列不可隐藏、不可排序
- [ ] 恢复默认功能正常
- [ ] 导出的 JSON 格式与 VSCode 版完全一致
- [ ] VSCode 版导出的 JSON 可以直接导入 Web 端
- [ ] Web 端导出的 JSON 可以直接导入 VSCode 端
- [ ] `funds` 中 `num`/`cost` 为字符串格式（兼容 VSCode）
- [ ] `groups` 使用分组名称作为 key
- [ ] `boxName` 以 `box_` 开头生成
