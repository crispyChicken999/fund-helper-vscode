# Phase 4 — 数据同步与导入导出

> **目标**：完善 Jsonbox 数据同步体系，支持自动 boxName 初始化、二维码扫描导入、本地 JSON 导入导出、云端上传下载，以及后续 VSCode 二维码分享流程的前端配合。  
> **预计工时**：1 天

---

## 4.1 Jsonbox Box Name 生命周期

### 完整流程图

```
首次进入 App
    │
    ▼
localStorage.getItem('fund_helper_box_name')
    ├── 有值 ──────────────────────► 直接使用（静默）
    │
    └── 无值
         │
         ▼
     自动生成：'fh_' + randomId(21)
         │
         ▼
     localStorage.setItem(KEY, name)
         │
         ▼
     settingStore.jsonboxName = name
         │
         ▼
     （无弹窗，静默完成）


用户在设置页扫描 VSCode 二维码
    │
    ▼
    解析二维码中的 boxName
    │
    ▼
    ElMessageBox.confirm("是否替换当前 boxName？")
    ├── 确认 → localStorage 更新，settingStore 更新，重新从云端拉取数据
    └── 取消 → 不做任何改变
```

### `storageService.ts` 实现

```typescript
const BOX_NAME_KEY = 'fund_helper_box_name'

export function ensureBoxName(): string {
  let name = localStorage.getItem(BOX_NAME_KEY)
  if (!name) {
    name = 'fh_' + generateNanoId(21)
    localStorage.setItem(BOX_NAME_KEY, name)
  }
  return name
}

export function getBoxName(): string {
  return localStorage.getItem(BOX_NAME_KEY) || ''
}

export function setBoxName(name: string): void {
  localStorage.setItem(BOX_NAME_KEY, name)
}

// 简单的 nanoid-like 实现（不依赖外部库）
function generateNanoId(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, b => chars[b % chars.length]).join('')
}
```

---

## 4.2 Jsonbox 云端数据结构

```typescript
interface JsonboxPayload {
  funds: FundConfig[]          // 基金配置列表（code, num, cost）
  groups: GroupConfig[]        // 分组列表
  groupOrder: string[]         // 分组排序（group key 数组）
  settings: Partial<Settings>  // 用户设置（隐私模式、灰色模式等）
  version: number              // 数据版本号（每次写入 +1）
  lastModified: number         // Unix 时间戳（毫秒）
  clientId: string             // 来源标识（'web' | 'vscode'）
}
```

---

## 4.3 上传到云端（Upload）

```typescript
async function syncToCloud(): Promise<void> {
  const boxName = getBoxName()
  if (!boxName) throw new Error('Box Name 未设置')

  const payload: JsonboxPayload = {
    funds: fundStore.getAllConfigs(),
    groups: groupStore.getAllGroups(),
    groupOrder: groupStore.groupOrder,
    settings: settingStore.exportSettings(),
    version: (await jsonboxApi.read())?.version + 1 || 1,
    lastModified: Date.now(),
    clientId: 'web'
  }

  jsonboxApi.setBoxId(boxName)
  await jsonboxApi.write(payload)
}
```

---

## 4.4 从云端下载（Download）

```typescript
async function syncFromCloud(): Promise<void> {
  const boxName = getBoxName()
  jsonboxApi.setBoxId(boxName)
  const remote = await jsonboxApi.read()
  if (!remote) throw new Error('云端无数据')

  // 版本比较
  const localVersion = settingStore.dataVersion
  if (remote.version < localVersion) {
    // 远端版本更旧，提示用户
    const confirmed = await confirmDialog(
      '云端数据版本较旧，继续下载将覆盖本地数据，是否继续？'
    )
    if (!confirmed) return
  }

  // 应用远端数据
  await fundStore.importConfigs(remote.funds)
  await groupStore.importGroups(remote.groups, remote.groupOrder)
  await settingStore.importSettings(remote.settings)
  settingStore.dataVersion = remote.version
}
```

---

## 4.5 二维码扫描导入 boxName

### 设置页 UI 新增「扫码导入」按钮

```
┌─────────────────────────────────────────┐
│ 数据同步                                 │
├─────────────────────────────────────────┤
│ Box Name: [fh_xxxxxxxxxxxxxxxxxxx_____] │
│            [📷 扫码导入] [测试连接]       │
│ 提示：Box Name 用于与 VSCode 版本同步     │
├─────────────────────────────────────────┤
│ [⬆ 上传到云端]  [⬇ 从云端下载]           │
└─────────────────────────────────────────┘
```

### 扫码实现

使用 `html5-qrcode` 库（轻量，无需后端）：

```typescript
import { Html5Qrcode } from 'html5-qrcode'

async function startScan() {
  showScannerDialog.value = true
  await nextTick()

  const scanner = new Html5Qrcode('qr-reader')
  await scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      scanner.stop()
      handleScannedBoxName(decodedText)
    },
    undefined
  )
}

async function handleScannedBoxName(text: string) {
  // 格式校验：boxName 应以 'fh_' 开头或符合约定格式
  if (!isValidBoxName(text)) {
    ElMessage.error('二维码格式不正确')
    return
  }

  const confirmed = await ElMessageBox.confirm(
    `扫描到 Box Name：${text}\n是否替换当前配置并从云端同步数据？`,
    '同步确认'
  )
  if (confirmed) {
    setBoxName(text)
    settingStore.jsonboxName = text
    await syncFromCloud()
    ElMessage.success('数据同步成功')
  }
}
```

扫码弹窗 UI：
```
┌──────────────────────┐
│  扫描 VSCode 二维码   │
│  ┌────────────────┐  │
│  │                │  │
│  │   摄像头画面   │  │
│  │                │  │
│  └────────────────┘  │
│     [取消扫描]        │
└──────────────────────┘
```

---

## 4.6 导入来自 VSCode 版本的 JSON

### 入口

设置页新增「导入本地 JSON」按钮。

### VSCode 导出格式（预期）

VSCode 版本未来导出的 JSON 格式与 `JsonboxPayload` 一致，Web 端直接解析同一结构。

若用户上传旧格式（只有 funds 数组），做兼容处理：

```typescript
function normalizeImportData(raw: any): JsonboxPayload {
  // 老格式：直接是 funds 数组
  if (Array.isArray(raw)) {
    return {
      funds: raw,
      groups: [],
      groupOrder: [],
      settings: {},
      version: 1,
      lastModified: Date.now(),
      clientId: 'import'
    }
  }
  // 新格式
  return raw as JsonboxPayload
}
```

### 导入 UI 流程

```
点击「导入 JSON」
    │
    ▼
文件选择器（accept=".json"）
    │
    ▼
解析 JSON，校验格式
    │
    ▼
预览对话框：
  "检测到 X 个基金，Y 个分组"
  "是否覆盖当前所有数据？"
    ├── 覆盖 → 清空当前数据，导入
    └── 合并 → 仅追加不存在的基金（以 code 为 key 去重）
```

---

## 4.7 导出到本地 JSON

### 导出内容

```typescript
async function exportToJson() {
  const payload: JsonboxPayload = {
    funds: fundStore.getAllConfigs(),
    groups: groupStore.getAllGroups(),
    groupOrder: groupStore.groupOrder,
    settings: settingStore.exportSettings(),
    version: settingStore.dataVersion,
    lastModified: Date.now(),
    clientId: 'web'
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fund-helper-${formatDate(new Date())}.json`
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## 4.8 设置页 UI 重构

完整设置页布局：

```
┌────────────────────────────┐
│ ⚙️ 设置                    │
├────────────────────────────┤
│ 显示设置                    │
│ 隐私模式    [switch]        │
│ 灰色模式    [switch]        │
│ 深色主题    [switch]        │
│ 刷新间隔    [select]        │
├────────────────────────────┤
│ 列表配置                    │
│ 可见列      [配置按钮]      │
│ 列顺序      [拖拽排序]      │
├────────────────────────────┤
│ 数据同步                    │
│ Box Name    [input][扫码]   │
│             [测试连接]      │
│ [⬆上传云端] [⬇下载云端]    │
├────────────────────────────┤
│ 数据管理                    │
│ [📥 导入 JSON]              │
│ [📤 导出 JSON]              │
│ [🗑️ 重置云端数据]           │
├────────────────────────────┤
│ 关于                        │
│ 版本：1.0.0                 │
│ 数据来源：天天基金            │
└────────────────────────────┘
```

---

## 4.9 列顺序拖拽配置

设置页「列顺序」使用 SortableJS 拖拽，允许用户调整列的显示顺序（仅可见列参与排序）：

```
可见列及顺序（拖拽调整）：
☰ 基金名称  （不可拖拽，固定第一列）
☰ 估算涨幅
☰ 估算收益
☰ 当日涨幅
☰ 当日收益
☰ 持有收益
```

保存时写入 `settingStore.columnOrder`，列表渲染按该顺序输出列。

---

## 验收标准

- [ ] 首次进入 App，localStorage 自动生成 `fund_helper_box_name`
- [ ] 刷新后 boxName 保持不变
- [ ] 摄像头扫描二维码成功解析出 boxName 并提示确认
- [ ] 上传到云端将本地数据写入 Jsonbox
- [ ] 从云端下载将远端数据应用到本地，有版本冲突提示
- [ ] 支持导入本地 JSON 文件（兼容 VSCode 版导出格式）
- [ ] 支持覆盖和合并两种导入方式
- [ ] 支持导出当前所有数据为 JSON 文件（含基金/分组/设置）
- [ ] 设置页列顺序可拖拽调整，列表页实时响应
