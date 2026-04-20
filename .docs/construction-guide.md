# 基金助手 Webview 视图构建指南

## 📋 项目概述

本次开发将为现有的基金助手 VSCode 插件新增一个基于 Webview 的全新展示模式，提供更灵活、更美观的用户界面。新视图将采用类似【养基宝】、【韭菜助手】的布局设计，分为账户资产模块和基金列表模块两部分。

## 🎯 核心需求

### 1. 双模式并存
- **保留现有模式**：当前的 TreeView 文件目录展示方式继续保留
- **新增 Webview 模式**：提供更灵活的 Webview 布局展示
- **模式切换机制**：
  - 旧模式（TreeView）：标题栏添加"切换到新视图"按钮，点击打开 Webview 面板
  - 新模式（Webview）：顶部添加"返回旧视图"按钮，点击关闭 Webview 并聚焦到 TreeView
  - 两种模式可以同时存在，用户自由选择使用哪个

### 2. 新视图布局设计

#### 2.1 整体布局
```
┌─────────────────────────────────────┐
│      账户资产模块（上部）              │
├─────────────────────────────────────┤
│      基金列表模块（下部）              │
└─────────────────────────────────────��┘
```

#### 2.2 账户资产模块（上部）
**布局结构：**
```
┌─────────────────────────────────────┐
│  [← 返回旧视图]          [刷新] [⚙]  │  ← 顶部工具栏
├──────────────┬──────────────────────┤
│   资产总额    │   持有收益            │
│              │   - 持有收益率         │
│              │   - 持有收益           │
│              ├──────────────────────┤
│              │   日收益              │
│              │   - 日收益率           │
│              │   - 日收益             │
└──────────────┴──────────────────────┘
```

**数据字段：**
- 资产总额：所有基金持仓的当前市值总和
- 持有收益率：(当前市值 - 总成本) / 总成本 × 100%
- 持有收益：当前市值 - 总成本
- 日收益率：今日涨跌幅的加权平均
- 日收益：今日估算收益总和

#### 2.3 基金列表模块（下部）

**Header 区域：**
- **左侧功能按钮区：**
  - 设置按钮
  - 排序按钮
  - 添加基金按钮
  - 其他功能按钮（刷新、导入导出等）
  
- **右侧表头区（可横向滑动）：**
  - 基金名称/代码
  - 估算涨幅
  - 估值收益
  - 当日涨幅
  - 当日收益
  - 持有收益
  - 总收益率
  - 关联板块
  - 金额/份额
  - 成本价

**内容区域：**
- 每行显示一个基金的完整数据
- 第一列：基金名称 + 基金代码
- 其余列：对应表头的数据
- 支持横向滑动查看所有列
- 涨跌用颜色标识（红涨绿跌）

### 3. 数据接口方案

#### 3.1 新接口使用
使用天天基金的批量查询接口：
```
POST https://dgs.tiantianfunds.com/merge/m/api/jjxqy1_2
Content-Type: application/x-www-form-urlencoded

参数：
- deviceid: 设备ID
- version: 版本号
- fcode: 基金代码列表（逗号分隔）
- 其他字段参数...
```

**接口特点：**
- 支持批量查询多个基金
- 返回基金详细信息（包括关联板块、指数等）
- 有数量限制，需要分批请求

#### 3.2 数据处理策略
- 如果基金数量超过接口限制，自动分批请求
- 合并多次请求的结果
- 缓存机制优化性能

#### 3.3 现有接口保留
- TreeView 模式继续使用现有的 `fundgz.1234567.com.cn` 接口
- 两种模式的数据请求互不影响

### 4. 行情中心增强

#### 4.1 指数扩展
**A股指数：**
- 上证指数 (1.000001)
- 沪深300 (1.000300)
- 深证指数 (0.399001)
- 科创50 (1.000688)
- 创业板指 (0.399006)
- 中小100 (0.399005)
- 黄金9999 (118.AU9999)

**港股指数：**
- 恒生指数 (100.HSI)
- 恒生科技指数 (124.HSTECH)

**美股指数：**
- 道琼斯 (100.DJIA)
- 纳斯达克 (100.NDX)
- 纳斯达克100 (100.NDX100)
- 标普500 (100.SPX)
- COMEX黄金 (101.GC00Y)

**亚太指数：**
- 日经225 (100.N225)
- 越南胡志明 (100.VNINDEX)
- 印度孟买SENS (100.SENSEX)

#### 4.2 指数数据获取
使用东方财富图片接口：
```
GET https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid={指数代码}&rnd={时间戳}
```

#### 4.3 自动刷新机制
- 每分钟整点自动刷新（使用 setInterval）
- 显示倒计时提示
- 交易时间内才刷新

### 5. 基金详情页增强

参考【韭菜助手】的详情页设计，包含以下信息：

**基本信息：**
- 基金名称、代码
- 基金类型
- 关联指数
- 基金公司
- 基金经理
- 交易状态

**持仓信息：**
- 持仓份额
- 持仓成本
- 当前金额
- 最新净值
- 估算净值

**收益信息：**
- 持有收益 / 持有收益率
- 日收益（估）
- 近1周、近3月、近6月、近1年收益及排名

**其他信息：**
- 累计净值
- 基金规模
- 历史净值图表

**数据接口：**
```
GET https://fundmobapi.eastmoney.com/FundMApi/FundBaseTypeInformation.ashx?FCODE={基金代码}&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0

GET https://fundmobapi.eastmoney.com/FundMApi/FundNetDiagram.ashx?FCODE={基金代码}&RANGE=y&deviceid=Wap&plat=Wap&product=EFund&version=2.0.0
```

## 🏗️ 技术实现方案

### 1. 文件结构规划

```
src/
├── extension.ts                 # 插件入口（已存在）
├── fundTreeView.ts             # TreeView 模式（已存在）
├── fundWebviewPanel.ts         # 新增：Webview 面板主控制器
├── fundWebviewProvider.ts      # 新增：Webview 内容提供者
├── fundService.ts              # 基金数据服务（扩展）
├── marketService.ts            # 行情数据服务（扩展）
└── webview/                    # 新增：Webview 前端资源
    ├── index.html              # Webview HTML 模板
    ├── main.js                 # Webview 前端逻辑
    └── style.css               # Webview 样式
```

### 2. 核心模块设计

#### 2.1 FundWebviewPanel（主控制器）
**职责：**
- 创建和管理 Webview 面板
- 处理前后端消息通信
- 管理面板生命周期

**主要方法：**
```typescript
class FundWebviewPanel {
  static createOrShow(extensionUri: vscode.Uri): void
  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri)
  private update(): void
  private handleMessage(message: any): void
  dispose(): void
}
```

#### 2.2 FundWebviewProvider（内容提供者）
**职责：**
- 生成 Webview HTML 内容
- 注入必要的脚本和样式
- 处理资源路径

**主要方法：**
```typescript
class FundWebviewProvider {
  getHtmlForWebview(webview: vscode.Webview): string
  private getWebviewContent(): string
  private getNonce(): string
}
```

#### 2.3 FundService 扩展
**新增方法：**
```typescript
// 批量获取基金详细信息（新接口）
async function fetchFundsBatch(codes: string[]): Promise<FundDetailInfo[]>

// 分批处理基金代码
function splitFundCodes(codes: string[], batchSize: number): string[][]

// 获取基金详情（用于详情页）
async function fetchFundDetail(code: string): Promise<FundFullDetail>

// 获取历史净值数据
async function fetchFundHistory(code: string, range: string): Promise<HistoryData[]>
```

#### 2.4 MarketService 扩展
**新增方法：**
```typescript
// 获取指数图片数据
async function fetchIndexImage(nid: string): Promise<string>

// 获取所有分类的指数数据
async function fetchAllIndices(): Promise<IndexData>

// 定时刷新控制
function setupMarketRefresh(callback: () => void): NodeJS.Timer
```

### 3. 前端实现方案

#### 3.1 技术栈
- 原生 HTML + CSS + JavaScript
- 不引入复杂框架，保持轻量
- 使用 VSCode Webview API 进行通信

#### 3.2 布局实现
```html
<div class="fund-webview-container">
  <!-- 顶部工具栏（包含返回按钮） -->
  <div class="webview-toolbar">
    <button class="btn-back" id="btnBackToTree">
      <span class="icon">←</span>
      <span class="text">返回旧视图</span>
    </button>
    <div class="toolbar-right">
      <button class="btn-icon" id="btnRefresh" title="刷新">🔄</button>
      <button class="btn-icon" id="btnSettings" title="设置">⚙️</button>
    </div>
  </div>

  <!-- 账户资产模块 -->
  <div class="account-summary">
    <div class="total-assets">
      <div class="label">资产总额</div>
      <div class="value" id="totalAssets">0.00</div>
    </div>
    <div class="profit-info">
      <div class="holding-profit">
        <div class="label">持有收益</div>
        <div class="rate" id="holdingRate">0.00%</div>
        <div class="amount" id="holdingAmount">0.00</div>
      </div>
      <div class="daily-profit">
        <div class="label">日收益</div>
        <div class="rate" id="dailyRate">0.00%</div>
        <div class="amount" id="dailyAmount">0.00</div>
      </div>
    </div>
  </div>

  <!-- 基金列表模块 -->
  <div class="fund-list">
    <!-- Header -->
    <div class="fund-list-header">
      <div class="header-left">
        <button class="btn-icon" id="btnSettings">⚙️</button>
        <button class="btn-icon" id="btnSort">📊</button>
        <button class="btn-icon" id="btnAdd">➕</button>
      </div>
      <div class="header-right">
        <div class="table-header" id="tableHeader">
          <!-- 动态生成表头 -->
        </div>
      </div>
    </div>
    
    <!-- Content -->
    <div class="fund-list-content" id="fundListContent">
      <!-- 动态生成基金列表 -->
    </div>
  </div>
</div>
```

#### 3.3 数据通信
**前端 → 后端：**
```javascript
// 请求数据
vscode.postMessage({
  command: 'getFundData',
  codes: ['020256', '110020']
});

// 操作基金
vscode.postMessage({
  command: 'addPosition',
  code: '020256',
  amount: 1000
});
```

**后端 → 前端：**
```javascript
// 监听消息
window.addEventListener('message', event => {
  const message = event.data;
  switch (message.command) {
    case 'updateFundData':
      updateFundList(message.data);
      break;
    case 'updateAccountSummary':
      updateAccountSummary(message.data);
      break;
  }
});
```

### 4. 样式设计

#### 4.1 颜色方案
```css
:root {
  --color-up: #f5222d;      /* 上涨红色 */
  --color-down: #52c41a;    /* 下跌绿色 */
  --color-flat: #8c8c8c;    /* 平盘灰色 */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #262626;
  --text-secondary: #8c8c8c;
  --border-color: #d9d9d9;
  --toolbar-bg: #f8f8f8;
}

/* 暗色主题适配 */
body.vscode-dark {
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --text-primary: #cccccc;
  --text-secondary: #858585;
  --border-color: #3e3e3e;
  --toolbar-bg: #2d2d2d;
}

/* 工具栏样式 */
.webview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border-color);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--bg-secondary);
  border-color: var(--text-secondary);
}
```

#### 4.2 响应式设计
- 账户资产模块固定高度
- 基金列表模块自适应剩余空间
- 表格支持横向滚动
- 移动端友好（虽然主要在桌面使用）

### 5. 模式切换实现

#### 5.1 命令注册

在 `package.json` 中新增命令：
```json
{
  "commands": [
    {
      "command": "fund-helper.switchToWebview",
      "title": "切换到新视图",
      "icon": "$(window)"
    },
    {
      "command": "fund-helper.switchToTreeView",
      "title": "返回旧视图",
      "icon": "$(list-tree)"
    }
  ]
}
```

在 `menus` 中添加到 TreeView 标题栏：
```json
{
  "view/title": [
    {
      "command": "fund-helper.switchToWebview",
      "when": "view == fundList",
      "group": "navigation@0"
    }
  ]
}
```

#### 5.2 Extension 中注册命令

在 `extension.ts` 中注册：
```typescript
context.subscriptions.push(
  // 切换到 Webview 模式
  vscode.commands.registerCommand(
    "fund-helper.switchToWebview",
    () => {
      FundWebviewPanel.createOrShow(context.extensionUri);
      vscode.window.showInformationMessage("已切换到新视图");
    }
  ),
  
  // 返回 TreeView 模式
  vscode.commands.registerCommand(
    "fund-helper.switchToTreeView",
    () => {
      // 关闭 Webview 面板
      FundWebviewPanel.dispose();
      // 聚焦到 TreeView
      vscode.commands.executeCommand("fundList.focus");
      vscode.window.showInformationMessage("已返回旧视图");
    }
  )
);
```

#### 5.3 Webview 中的返回按钮

在 Webview HTML 中添加顶部工具栏：
```html
<div class="webview-toolbar">
  <button class="btn-back" id="btnBackToTree">
    <span class="icon">←</span>
    <span class="text">返回旧视图</span>
  </button>
  <div class="toolbar-right">
    <button class="btn-icon" id="btnRefresh">🔄</button>
    <button class="btn-icon" id="btnSettings">⚙️</button>
  </div>
</div>
```

在 Webview JS 中处理点击事件：
```javascript
document.getElementById('btnBackToTree').addEventListener('click', () => {
  vscode.postMessage({
    command: 'switchToTreeView'
  });
});
```

在后端处理消息：
```typescript
private handleMessage(message: any): void {
  switch (message.command) {
    case 'switchToTreeView':
      vscode.commands.executeCommand('fund-helper.switchToTreeView');
      break;
    // ... 其他消息处理
  }
}
```

## 📊 数据流程图

```
┌─────────────┐
│  用户操作    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Webview 前端    │
│  - 发送消息      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Extension 后端  │
│  - 处理消息      │
│  - 调用 Service  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  FundService     │
│  - 请求接口      │
│  - 处理数据      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  返回数据        │
│  - 更新 Webview  │
└─────────────────┘
```

## 🔄 开发步骤

### Phase 1: 基础框架搭建
1. 创建 `fundWebviewPanel.ts` 和 `fundWebviewProvider.ts`
2. 创建 `webview/` 目录及基础文件
3. 实现基本的 Webview 面板显示
4. 建立前后端消息通信机制
5. **实现模式切换功能**
   - 在 TreeView 标题栏添加"切换到新视图"按钮
   - 在 Webview 顶部添加"返回旧视图"按钮
   - 注册切换命令并实现逻辑

### Phase 2: 账户资产模块
1. 实现账户资产数据计算逻辑
2. 完成账户资产模块 UI
3. 实现数据绑定和更新

### Phase 3: 基金列表模块
1. 扩展 `fundService.ts`，实现新接口调用
2. 实现基金列表 Header 和表格结构
3. 实现数据渲染和横向滚动
4. 实现排序功能

### Phase 4: 功能完善
1. 实现添加、删除、修改基金功能
2. 实现加仓、减仓功能
3. 实现搜索筛选功能
4. 实现自动刷新机制

### Phase 5: 行情中心增强
1. 扩展 `marketService.ts`，支持更多指数
2. 实现指数分类展示（A股、港股、美股、亚太）
3. 实现倒计时自动刷新

### Phase 6: 基金详情页增强
1. 实现新的详情页接口调用
2. 完善详情页 UI 和数据展示
3. 添加历史净值图表

### Phase 7: 测试和优化
1. 功能测试
2. 性能优化
3. 样式调整
4. 文档完善

## ⚠️ 注意事项

### 1. 兼容性
- 保持与现有 TreeView 模式的兼容
- 不影响现有功能的正常使用
- 配置项向后兼容

### 2. 性能优化
- 批量请求时控制并发数
- 实现数据缓存机制
- 避免频繁的 DOM 操作
- 使用虚拟滚动优化长列表

### 3. 错误处理
- 网络请求失败的降级处理
- 数据格式异常的容错处理
- 用户友好的错误提示

### 4. 安全性
- 防止 XSS 攻击
- 使用 nonce 验证脚本
- 限制 Webview 权限

### 5. 用户体验
- 加载状态提示
- 操作反馈及时
- 动画过渡流畅
- 响应式布局

## 📝 配置项扩展

在 `package.json` 中新增配置：
```json
{
  "fund-helper.defaultViewMode": {
    "type": "string",
    "default": "tree",
    "enum": ["tree", "webview"],
    "enumDescriptions": [
      "传统树形列表视图",
      "新版 Webview 视图"
    ],
    "description": "默认启动时使用的视图模式（可随时切换）"
  },
  "fund-helper.webview.autoRefresh": {
    "type": "boolean",
    "default": true,
    "description": "Webview 模式下是否自动刷新"
  },
  "fund-helper.webview.refreshInterval": {
    "type": "number",
    "default": 60,
    "description": "Webview 模式刷新间隔（秒）"
  },
  "fund-helper.rememberLastViewMode": {
    "type": "boolean",
    "default": true,
    "description": "记住上次使用的视图模式，下次启动时自动打开"
  }
}
```

## 🔄 模式切换交互流程

```
┌─────────────────┐
│  TreeView 模式   │
│  (旧视图)        │
│                 │
│  [切换到新视图]  │ ←── 点击按钮
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Webview 模式    │
│  (新视图)        │
│                 │
│  [← 返回旧视图]  │ ←── 点击按钮
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  TreeView 模式   │
│  (旧视图)        │
│                 │
│  聚焦到侧边栏    │
└─────────────────┘
```

**切换逻辑：**
1. 用户在 TreeView 点击"切换到新视图" → 打开 Webview 面板
2. 用户在 Webview 点击"返回旧视图" → 关闭 Webview，聚焦到 TreeView
3. 两种模式可以同时打开，互不影响
4. 可选：记住用户最后使用的模式，下次启动时自动打开

## 🎨 UI 参考

根据提供的图片分析：

**图1 - 基金列表：**
- 顶部显示"持仓中基金"标题
- 账户总资产显示在顶部
- 持有收益和日收益并排显示
- 基金列表每行显示：名称、代码、涨跌幅、收益等
- 使用红绿色标识涨跌

**图2 - 历史净值：**
- 折线图展示历史走势
- 下方列表显示每日净值数据
- 包含日期、单位净值、累计净值、日增长率
- 底部有累计收益对比图表

**图3 - 基金详情：**
- 顶部显示基金名称和代码
- 关联指数信息
- 持仓成本、当前金额
- 最新净值、估算净值
- 持有收益、日收益
- 近期收益统计（近1周、3月、6月、1年）
- 基金公司、基金经理信息
- 交易状态
- 估值走势图
- 关联指数走势
- 特色数据展示

## ✅ 验收标准

1. **功能完整性**
   - ✅ 双模式正常切换
   - ✅ 账户资产数据准确
   - ✅ 基金列表完整展示
   - ✅ 所有操作功能正常
   - ✅ 行情中心数据完整
   - ✅ 详情页信息丰富

2. **性能要求**
   - ✅ 首次加载时间 < 2s
   - ✅ 数据刷新流畅无卡顿
   - ✅ 内存占用合理

3. **用户体验**
   - ✅ 界面美观，布局合理
   - ✅ 操作流畅，反馈及时
   - ✅ 错误提示友好
   - ✅ 适配暗色主题

4. **代码质量**
   - ✅ 代码结构清晰
   - ✅ 注释完整
   - ✅ 类型定义完善
   - ✅ 错误处理完善

## 📚 参考资料

- [VSCode Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [天天基金 API 文档](https://fundgz.1234567.com.cn/)
- [东方财富 API](https://www.eastmoney.com/)
- 现有项目代码：`src/fundWebview.ts`、`src/marketWebview.ts`

---

**构建指南版本：** v1.0  
**创建日期：** 2026-04-17  
**最后更新：** 2026-04-17
