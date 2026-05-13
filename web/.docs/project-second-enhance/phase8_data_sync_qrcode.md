# Phase 8 — 数据同步 & 二维码方案

> **目标**：在 VSCode 端添加数据上传功能，支持生成二维码；Web 端支持扫码同步 boxName，实现跨端配置同步。  
> **预计工时**：1.5 天

---

## 8.1 VSCode 端数据上传功能

### 目标

在 VSCode 端添加一个命令/按钮，点击后弹出数据同步弹窗：

```
┌──────────────────────────────────────────────────────────────┐
│ 数据同步                                                [×]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ Box Name: box_f1b06a994af7f8f83525                           │
│                                                              │
│ [上传配置]  [下载配置]  [清空配置]  [重新生成]               │
│                                                              │
│ ┌────────────────────┐                                       │
│ │                    │                                       │
│ │    (二维码图片)     │  ← 扫码获取 boxName                  │
│ │                    │                                       │
│ └────────────────────┘                                       │
│                                                              │
│ 提示：Web 端扫描二维码可同步配置                              │
└──────────────────────────────────────────────────────────────┘
```

### 实施要求

**1. 生成 boxName**

```typescript
// 规则：box_ 开头 + 随机字符串
function generateBoxName(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'box_'
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}
```

**2. 上传配置到 Jsonbox**

```typescript
async function uploadConfig(boxName: string) {
  const config = buildExportConfig() // 构建导出 JSON
  const url = `https://jsonbox.cloud.exo-imaging.com/${boxName}`
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })
  
  if (res.ok) {
    vscode.window.showInformationMessage('配置上传成功')
  } else {
    vscode.window.showErrorMessage('配置上传失败')
  }
}
```

**3. 下载配置从 Jsonbox**

```typescript
async function downloadConfig(boxName: string) {
  const url = `https://jsonbox.cloud.exo-imaging.com/${boxName}`
  const res = await fetch(url)
  
  if (!res.ok) {
    vscode.window.showErrorMessage('配置下载失败')
    return
  }
  
  const config = await res.json()
  await importConfig(config) // 导入配置
  vscode.window.showInformationMessage('配置下载成功')
}
```

**4. 清空配置**

```typescript
async function clearConfig(boxName: string) {
  const url = `https://jsonbox.cloud.exo-imaging.com/${boxName}`
  const res = await fetch(url, { method: 'DELETE' })
  
  if (res.ok) {
    vscode.window.showInformationMessage('远程配置已清空')
  }
}
```

**5. 二维码生成**

使用 `qrcode` npm 包生成二维码 Data URL：

```typescript
import QRCode from 'qrcode'

async function generateQRCode(boxName: string): Promise<string> {
  // 二维码内容就是 boxName
  const dataUrl = await QRCode.toDataURL(boxName, {
    width: 200,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' }
  })
  return dataUrl
}
```

**6. VSCode Webview 弹窗**

创建一个 Webview Panel 展示同步界面，包含：
- boxName 显示
- 操作按钮（上传/下载/清空/重新生成）
- 二维码图片

---

## 8.2 Web 端扫码同步

### 目标

Web 端设置页面添加"扫码同步"功能：

```
┌──────────────────────────────────────┐
│ 数据同步                             │
├──────────────────────────────────────┤
│ 当前 Box Name: box_xxxxx            │
│                                      │
│ [扫码同步]  [手动输入 BoxName]       │
│ [上传配置]  [下载配置]               │
└──────────────────────────────────────┘
```

### 实施要求

**1. 扫码功能**

使用 `html5-qrcode` 库实现浏览器扫码：

```typescript
import { Html5QrcodeScanner } from 'html5-qrcode'

function startQRScanner() {
  const scanner = new Html5QrcodeScanner('qr-reader', {
    fps: 10,
    qrbox: { width: 250, height: 250 }
  })
  
  scanner.render(
    (decodedText) => {
      // 扫码成功，获取 boxName
      if (decodedText.startsWith('box_')) {
        setBoxName(decodedText)
        scanner.clear()
        ElMessage.success(`已同步 BoxName: ${decodedText}`)
        // 自动下载配置
        downloadAndImportConfig(decodedText)
      } else {
        ElMessage.warning('无效的二维码内容')
      }
    },
    (error) => {
      // 扫码失败，忽略
    }
  )
}
```

**2. 手动输入 BoxName**

```html
<el-dialog v-model="showSyncDialog" title="数据同步">
  <el-form>
    <el-form-item label="Box Name">
      <el-input v-model="boxName" placeholder="box_xxxxxxxx" />
    </el-form-item>
  </el-form>
  <template #footer>
    <el-button @click="startQRScanner">扫码同步</el-button>
    <el-button @click="manualSetBoxName">确认</el-button>
  </template>
</el-dialog>
```

**3. 同步流程**

```
扫码/手动输入 boxName
  ↓
保存到 localStorage
  ↓
从 jsonbox 下载配置
  ↓
解析 JSON
  ↓
导入到各 store
  ↓
刷新页面数据
```

---

## 8.3 Web 端上传/下载配置

### 上传

```typescript
async function uploadToJsonbox() {
  const boxName = getBoxName()
  if (!boxName) {
    ElMessage.warning('请先设置 Box Name')
    return
  }
  
  const config = buildExportConfig()
  const url = `https://jsonbox.cloud.exo-imaging.com/${boxName}`
  
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    
    if (res.ok) {
      ElMessage.success('配置上传成功')
    } else {
      ElMessage.error('上传失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  }
}
```

### 下载

```typescript
async function downloadFromJsonbox() {
  const boxName = getBoxName()
  if (!boxName) {
    ElMessage.warning('请先设置 Box Name')
    return
  }
  
  const url = `https://jsonbox.cloud.exo-imaging.com/${boxName}`
  
  try {
    const res = await fetch(url)
    if (!res.ok) {
      ElMessage.error('下载失败，请检查 Box Name')
      return
    }
    
    const config = await res.json()
    await importConfig(config)
    ElMessage.success('配置下载并导入成功')
  } catch (e) {
    ElMessage.error('网络错误')
  }
}
```

---

## 8.4 BoxName 持久化

```typescript
// storageService.ts
const BOX_NAME_KEY = 'fund_helper_box_name'

export function getBoxName(): string {
  return localStorage.getItem(BOX_NAME_KEY) || ''
}

export function setBoxName(name: string) {
  localStorage.setItem(BOX_NAME_KEY, name)
}

export function ensureBoxName(): string {
  let name = getBoxName()
  if (!name) {
    name = generateBoxName()
    setBoxName(name)
  }
  return name
}
```

---

## 验收标准

- [ ] VSCode 端可生成 boxName（box_ 开头）
- [ ] VSCode 端可上传配置到 jsonbox
- [ ] VSCode 端可下载配置从 jsonbox
- [ ] VSCode 端可清空远程配置
- [ ] VSCode 端可重新生成 boxName
- [ ] VSCode 端可生成二维码（内容为 boxName）
- [ ] Web 端可扫描二维码获取 boxName
- [ ] Web 端可手动输入 boxName
- [ ] Web 端扫码后自动下载并导入配置
- [ ] Web 端可上传/下载配置到 jsonbox
- [ ] boxName 持久化到 localStorage
- [ ] 配置格式与导入导出完全兼容
