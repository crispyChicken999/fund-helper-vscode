# 基金助手Web端需求文档

## 一、项目概述

### 1.1 项目目标
构建一个移动端优先的Web应用，作为VSCode基金助手插件的克隆版本，提供基金投资组合管理、行情查看和数据同步功能。

### 1.2 核心特性
- 基金列表管理（完整复刻VSCode插件功能）
- 基金详情查看
- 行情中心展示
- 数据云端同步（基于JSONBox）
- 移动端友好的UI设计
- 暗黑模式和隐私模式支持

### 1.3 技术栈
- **前端框架**: Vue 3
- **构建工具**: Vite
- **UI库**: Element Plus
- **状态管理**: Pinia
- **数据存储**: JSONBox (https://jsonbox.cloud.exo-imaging.com/)
- **跨域方案**: JSONP (用于fundgz接口调用)
- **HTTP客户端**: Axios

### 1.4 适配范围
- **主要**: 移动端（iOS Safari、Android Chrome）
- **辅助**: PC浏览器（桌面预览）

---

## 二、功能需求详解

### 2.1 数据模型

#### 2.1.1 用户数据结构（JSONBox存储）
```json
{
  "funds": [
    {
      "code": "018125",           // 基金代码
      "num": "8745.52",           // 持有份额
      "cost": "2.5156"            // 成本价
    }
  ],
  "groups": {
    "有色金属": ["002963", "018168"],
    "半导体": ["015968", "023829"]
  },
  "groupOrder": ["有色金属", "半导体"],
  "columnSettings": {
    "columnOrder": ["name", "estimatedGain", ...],
    "visibleColumns": ["name", "estimatedGain", ...]
  },
  "sortMethod": "holdingGainRate_desc",
  "refreshInterval": 20,
  "hideStatusBar": true,
  "defaultViewMode": "webview",
  "privacyMode": true,
  "grayscaleMode": true
}
```

#### 2.1.2 基金信息（从fundgz接口获取）
```typescript
interface FundInfo {
  code: string;              // 基金代码
  name: string;              // 基金名称
  currentPrice: number;      // 当前净值
  changePercent: number;     // 日涨跌幅
  changeAmount: number;      // 日涨跌额
  sector: string;            // 行业分类
  dailyGain: number;         // 日收益（计算）
  holdingGain: number;       // 持有收益（计算）
  holdingGainRate: number;   // 持有收益率（计算）
  estimatedGain: number;     // 预计收益（计算）
  estimatedChange: number;   // 预计涨跌幅（计算）
}
```

### 2.2 首页（列表视图）

#### 2.2.1 页面结构
```
┌─────────────────────────────┐
│    资产展示区               │
│  资产总值 | 持有收益 | 日收益 │
├─────────────────────────────┤
│  分组管理区                 │
│  [全部] [有色金属] [半导体]  │
│  [新能源] [AI应用] ...      │
├─────────────────────────────┤
│  基金列表区                 │
│ ┌─名称──┬─收益──┬─涨幅──┐  │
│ │基金名│ 收益  │ 收益率 │  │
│ ├─────┼──────┼────── ┤  │
│ │ 名称 │ 数值  │ 百分比 │  │
│ └─────┴──────┴────── ┘  │
├─────────────────────────────┤
│  [首页] [行情] [设置]       │
└─────────────────────────────┘
```

#### 2.2.2 顶部资产展示（固定）
- **资产总值**: 所有基金持有收益总和
- **持有收益**: ∑(当前价格 - 成本价) × 份额
- **日收益**: ∑(日涨跌额 × 份额)
- 点击可切换显示/隐藏（隐私模式）

#### 2.2.3 分组管理区
**功能需求**:
- 显示所有分组TAG，默认选中"全部"
- 支持横向滚动
- 点击分组TAG筛选列表
- 长按分组TAG显示操作弹窗（移动端）：
  - 编辑分组名称
  - 删除分组
  - 查看分组包含的基金数量

**分组操作**:
- 新增分组：点击"+"按钮
- 编辑分组：长按TAG
- 删除分组：长按TAG → 删除选项
- 基金移动到分组：从列表拖拽或点击基金操作面板

#### 2.2.4 基金列表（核心区域）

**表格结构** (完全复刻VSCode插件):
```
列顺序（可配置）:
- name           // 基金名称（左固定）
- estimatedGain  // 预计收益（￥）
- estimatedChange// 预计涨幅（%）
- holdingGainRate// 持有收益率（%）
- holdingGain    // 持有收益（￥）
- amountShares   // 持有份额
- dailyChange    // 日涨幅（%）
- dailyGain      // 日收益（￥）
- sector         // 所属分类
- cost           // 成本价
```

**表格特性**:
1. **基金名称列固定左侧**
   - 宽度固定，不参与横向滚动
   - 显示基金代码（小字）和基金名称

2. **横向滚动功能**
   - 支持拖动/滑动查看其他列
   - 提示用户可以滑动

3. **数据排序**
   - 默认按 `holdingGainRate_desc`（持有收益率降序）
   - 点击列头排序
   - 支持多列排序配置

4. **条件样式**
   - 收益为正（绿色）/为负（红色）
   - 可选灰色模式（无色差）

5. **基金交互**
   - **点击基金名称** → 跳转基金详情页
   - **长按基金行** → 显示操作面板（弹窗）：
     - 查看详情（重定向）
     - 编辑基金（修改份额、成本价）
     - 转移分组
     - 删除基金
     - 复制基金代码

**操作面板设计** (移动端适配):
```
┌──────────────────────┐
│  基金名 (XXXXX)      │
├──────────────────────┤
│ 📊 查看详情          │
│ ✏️  编辑             │
│ 📁 转移分组          │
│ 🗑️  删除             │
│ 📋 复制代码          │
└──────────────────────┘
```

#### 2.2.5 列表配置
- **可见列配置**: 用户可在设置中选择显示/隐藏的列
- **列顺序配置**: 用户可拖拽调整列顺序
- **排序配置**: 默认排序方式可在设置中修改
- 配置实时同步到JSONBox

#### 2.2.6 列表刷新
- **自动刷新**: 按设置中的 `refreshInterval` (秒) 定时刷新
- **手动刷新**: 下拉刷新或点击刷新按钮
- **增量更新**: 只更新价格和计算字段，不刷新列表结构
- **离线支持**: 本地缓存最后一次数据，断网时显示

### 2.3 基金详情页

#### 2.3.1 页面结构
```
┌─────────────────────────────┐
│ ← 基金名 (代码) 📋        │
├─────────────────────────────┤
│  📊 基金信息卡片             │
│  当前净值: XXXXX             │
│  日涨跌幅: +X.XX%            │
│  日涨跌额: +X.XX¥            │
├─────────────────────────────┤
│  💰 持仓信息卡片             │
│  持有份额: XXXXX             │
│  成本价: X.XXXX              │
│  持有收益: +XXXXX¥           │
│  持有收益率: +X.XX%          │
├─────────────────────────────┤
│  📈 预计收益卡片             │
│  预计收益: +XXXXX¥           │
│  预计涨幅: +X.XX%            │
├─────────────────────────────┤
│  📑 基金概况                 │
│  基金类型: 混合型基金         │
│  所属行业: 有色金属           │
│  成立日期: 2020-01-01        │
│  管理人: XXX基金公司          │
│  (其他基金信息)              │
├─────────────────────────────┤
│  ✏️ 编辑 | 🗑️ 删除           │
└─────────────────────────────┘
```

#### 2.3.2 功能需求
1. **基金信息显示**
   - 基金代码、名称、当前净值、日涨跌
   - 来自fundgz接口实时更新

2. **持仓信息显示**
   - 持有份额、成本价、持有收益、收益率
   - 来自本地存储

3. **预计收益显示**
   - 预计收益 = (当前净值 - 成本价) × 持有份额
   - 预计涨幅 = (当前净值 / 成本价 - 1) × 100%

4. **基金概况**
   - 从基金详情接口获取
   - 包含基金类型、成立日期、基金公司等信息

5. **操作按钮**
   - **编辑**: 修改持有份额、成本价
   - **删除**: 删除该基金

6. **返回导航**
   - 点击返回箭头或手机返回键回到首页

#### 2.3.3 编辑模式
```
┌─────────────────────────────┐
│ 编辑基金信息                 │
├─────────────────────────────┤
│ 基金名称                     │
│ [基金名称] (只读)            │
├─────────────────────────────┤
│ 持有份额                     │
│ [8745.52]                    │
├─────────────────────────────┤
│ 成本价                       │
│ [2.5156]                     │
├─────────────────────────────┤
│ 所属分组                     │
│ [有色金属 ▼]                 │
├─────────────────────────────┤
│  [取消] [保存]               │
└─────────────────────────────┘
```

### 2.4 行情中心

#### 2.4.1 页面结构
```
┌─────────────────────────────┐
│  行情中心                    │
├─────────────────────────────┤
│  行情类型筛选                │
│  [沪深京A] [H股] [美股]      │
│  [数字货币] ...              │
├─────────────────────────────┤
│  🔍 搜索行情                 │
│  [搜索框...]                 │
├─────────────────────────────┤
│  📊 行情列表                 │
│  行情名 | 当前 | 涨幅 | 涨跌 │
│  ───────────────────────────│
│  上证综合 | 3000.00 | +1.2% │
│  ───────────────────────────│
│  深证成指 | 9500.00 | -0.5% │
│  ───────────────────────────│
│  ...                         │
├─────────────────────────────┤
│  [首页] [行情] [设置]       │
└─────────────────────────────┘
```

#### 2.4.2 功能需求
1. **行情分类**
   - 沪深京A股
   - 港股 (H股)
   - 美股 (主要指数)
   - 其他指数

2. **行情数据**
   - 使用JSONP获取fundgz行情接口数据
   - 实时更新（设置中可配置刷新频率）

3. **搜索功能**
   - 按行情名称/代码搜索
   - 实时过滤

4. **行情展示**
   - 行情代码、名称、当前价格、涨跌幅、涨跌额
   - 条件样式（正绿负红/灰色模式）

5. **交互**
   - 点击行情条目，显示行情详情或历史走势（可选）

#### 2.4.3 行情数据接口
```
JSONP调用示例:
http://api.fund.eastmoney.com/h5/newlist?pageindex=1&pagesize=100&sortType=0&sortRule=0&callback=?

返回字段:
- 沪深京A: sh000001 (上证), sz399001 (深证), bj899050 (北证)
- H股: 恒生指数 (HSI)
- 美股: SPX (标普500), IXIC (纳斯达克)
```

### 2.5 设置页面

#### 2.5.1 页面结构
```
┌─────────────────────────────┐
│  设置                        │
├─────────────────────────────┤
│  数据同步                    │
│  JSONBox Box名称             │
│  [输入框: box_xxxxx]         │
│  [连接] [刷新] [重置]        │
├─────────────────────────────┤
│  同步状态                    │
│  ✓ 已连接 | 最后同步: XXX   │
│  [立即同步]                  │
├─────────────────────────────┤
│  显示设置                    │
│  ☑️ 隐私模式 (隐藏数值)     │
│  ☑️ 灰色模式 (无色差)        │
│  🔄 自动刷新间隔             │
│  [20 秒 ▼]                   │
├─────────────────────────────┤
│  列表配置                    │
│  可见列设置 →                │
│  列顺序设置 →                │
│  默认排序方式 →              │
├─────────────────────────────┤
│  关于                        │
│  版本: 1.0.0                 │
│  基金数据来源: 天天基金      │
│  [GitHub] [更新日志]         │
├─────────────────────────────┤
│  [首页] [行情] [设置]       │
└─────────────────────────────┘
```

#### 2.5.2 功能需求

##### 2.5.2.1 JSONBox数据同步配置
- **Box名称输入**
  - 默认值: 自动生成 `box_${random}` (20-64字符)
  - 用户可自定义 (20-64字符)
  - 验证规则: 只允许字母、数字、下划线

- **连接测试**
  - 验证Box是否存在/可访问
  - 显示连接状态

- **刷新数据**
  - 从JSONBox同步最新数据到本地
  - 若本地版本较新，提示冲突处理

- **重置数据**
  - 清空本地数据，从JSONBox重新加载
  - 或创建新的Box

- **自动同步**
  - 应用启动时自动同步
  - 用户修改数据时自动上传到JSONBox
  - 显示最后同步时间

##### 2.5.2.2 数据冲突处理
```
场景1: 本地修改未同步就打开另一个设备
- 弹窗提示: "检测到数据冲突"
- 选项: [使用本地版本] [使用云端版本]

场景2: 网络超时
- 显示错误提示，允许重试
- 保留本地修改，等待网络恢复

场景3: Box已被删除
- 提示创建新Box或指定其他Box
```

##### 2.5.2.3 显示设置
- **隐私模式** ☑️
  - 勾选后，列表和详情页的数值字段显示为 `****`
  - 影响范围: 金额、份额、价格、收益率等
  - 影响布局: 用***占位，保持排版不变

- **灰色模式** ☑️
  - 移除所有色彩（红绿），仅保留黑白灰
  - 应用于整个应用

- **自动刷新间隔**
  - 选项: 10秒、20秒、30秒、1分钟、5分钟、不自动刷新
  - 默认: 20秒

##### 2.5.2.4 列表配置
- **可见列设置**
  - 显示所有可用列的多选框
  - 勾选/取消显示的列
  - 保存后应用到首页列表

- **列顺序设置**
  - 显示所有可见列，支持拖拽排序
  - 或上下箭头调整顺序
  - 保存后应用到首页列表

- **默认排序方式**
  - 选择默认排序列
  - 选择升序/降序
  - 保存后应用到首页列表

##### 2.5.2.5 关于信息
- 应用版本号
- 数据来源声明
- 快捷链接
  - GitHub项目链接
  - 更新日志
  - 问题反馈

---

## 三、数据层架构

### 3.1 数据层分层设计

```
┌─────────────────────────────┐
│   UI层 (Vue Components)     │
├─────────────────────────────┤
│  State管理层 (Pinia Stores) │
├─────────────────────────────┤
│  业务逻辑层 (Services)      │
├─────────────────────────────┤
│  数据访问层 (API + Storage) │
├─────────────────────────────┤
│  ┌──────────────┬───────────┤
│  │ LocalStorage │ JSONBox   │
│  │ (本地缓存)   │ (云端)    │
│  └──────────────┴───────────┤
└─────────────────────────────┘
```

### 3.2 Pinia Store设计

#### 3.2.1 Store模块划分
```
stores/
├── fundStore          // 基金数据管理
├── groupStore         // 分组数据管理
├── marketStore        // 行情数据管理
├── settingStore       // 用户设置管理
├── syncStore          // 数据同步管理
└── uiStore            // UI状态管理
```

#### 3.2.2 fundStore (基金数据)
```typescript
interface FundStoreState {
  // 本地基金列表
  funds: Fund[];                    // 用户持有的基金
  fundDetails: Map<code, FundInfo>; // 基金详情缓存
  
  // UI状态
  selectedGroupKey: string;         // 当前选中分组
  sortConfig: SortConfig;           // 排序配置
  columnVisibility: Map<string, boolean>; // 列可见性
}

interface Fund {
  code: string;
  num: number;        // 持有份额
  cost: number;       // 成本价
  groupKey?: string;  // 所属分组
}
```

#### 3.2.3 groupStore (分组管理)
```typescript
interface GroupStoreState {
  groups: Map<string, string[]>;    // 分组名 -> 基金代码数组
  groupOrder: string[];             // 分组顺序
  groupMetadata: Map<string, GroupMeta>; // 分组元数据
}

interface GroupMeta {
  name: string;
  color?: string;
  icon?: string;
  createdAt: timestamp;
}
```

#### 3.2.4 marketStore (行情)
```typescript
interface MarketStoreState {
  markets: Map<code, MarketInfo>;   // 行情代码 -> 信息
  marketCategories: string[];       // 行情分类
  selectedCategory: string;         // 当前选中分类
  lastUpdateTime: timestamp;        // 最后更新时间
}

interface MarketInfo {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  changeAmount: number;
  category: string;
}
```

#### 3.2.5 settingStore (用户设置)
```typescript
interface SettingStoreState {
  // JSONBox配置
  jsonboxName: string;              // Box名称
  jsonboxApiUrl: string;            // API地址
  
  // 显示设置
  privacyMode: boolean;             // 隐私模式
  grayscaleMode: boolean;           // 灰色模式
  refreshInterval: number;          // 刷新间隔(秒)
  
  // 列表配置
  columnOrder: string[];            // 列顺序
  visibleColumns: string[];         // 可见列
  sortMethod: string;               // 默认排序 (列名_asc/desc)
  
  // 其他
  theme: 'light' | 'dark';          // 主题
  language: 'zh-CN' | 'en-US';      // 语言
}
```

#### 3.2.6 syncStore (数据同步)
```typescript
interface SyncStoreState {
  // 同步状态
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: timestamp;
  syncError: string | null;
  
  // 版本管理
  localVersion: number;             // 本地数据版本
  cloudVersion: number;             // 云端数据版本
  
  // 离线支持
  offlineQueue: SyncAction[];       // 待同步操作队列
}

interface SyncAction {
  type: 'add' | 'update' | 'delete';
  entity: 'fund' | 'group' | 'setting';
  data: any;
  timestamp: timestamp;
}
```

#### 3.2.7 uiStore (UI状态)
```typescript
interface UIStoreState {
  // 页面导航
  currentPage: 'home' | 'market' | 'settings' | 'fundDetail';
  detailFundCode?: string;          // 打开的详情基金代码
  
  // 加载状态
  isLoading: boolean;
  isRefreshing: boolean;
  
  // 模态框/弹窗
  showFundMenu: boolean;
  selectedFundForMenu?: Fund;
  showGroupMenu: boolean;
  selectedGroupForMenu?: string;
  
  // 搜索
  searchQuery: string;
  
  // 通知
  notification: Notification | null;
}
```

### 3.3 Service层设计

#### 3.3.1 Service模块
```
services/
├── fundService.ts         // 基金业务逻辑
├── groupService.ts        // 分组业务逻辑
├── marketService.ts       // 行情业务逻辑
├── syncService.ts         // 数据同步业务逻辑
├── apiService.ts          // API调用
└── storageService.ts      // 本地存储
```

#### 3.3.2 fundService
```typescript
class FundService {
  // 基金操作
  addFund(code: string, num: number, cost: number): Promise<void>
  updateFund(code: string, num: number, cost: number): Promise<void>
  deleteFund(code: string): Promise<void>
  getFundList(): Fund[]
  getFundDetail(code: string): Promise<FundInfo>
  
  // 计算
  calculateHoldingGain(fund: Fund, currentPrice: number): number
  calculateHoldingGainRate(fund: Fund, currentPrice: number): number
  calculateDailyGain(fund: Fund, changeAmount: number): number
  calculateEstimatedGain(fund: Fund, currentPrice: number): number
  calculateEstimatedChange(fund: Fund, currentPrice: number): number
  
  // 统计
  getTotalAsset(): number
  getTotalHoldingGain(): number
  getTotalDailyGain(): number
  
  // 搜索排序
  searchFunds(query: string): Fund[]
  sortFunds(funds: Fund[], sortMethod: string): Fund[]
}
```

#### 3.3.3 syncService
```typescript
class SyncService {
  // 同步操作
  syncToCloud(): Promise<void>          // 上传本地数据到JSONBox
  syncFromCloud(): Promise<void>        // 从JSONBox下载数据
  resolveConflict(strategy: 'local' | 'cloud'): Promise<void>
  
  // 管理
  setJsonboxName(name: string): Promise<void>
  validateJsonboxConnection(): Promise<boolean>
  resetJsonbox(): Promise<void>
  
  // 离线支持
  queueAction(action: SyncAction): void
  processOfflineQueue(): Promise<void>
  
  // 工具
  getLastSyncTime(): timestamp
  getSyncStatus(): SyncStatus
}
```

### 3.4 API接口设计

#### 3.4.1 JSONBox API
```
Base URL: https://jsonbox.cloud.exo-imaging.com

操作:
1. 创建/获取Box
   GET /api/v1/box?name=box_xxxxx
   POST /api/v1/box?name=box_xxxxx

2. 读取所有数据
   GET /api/v1/box/box_xxxxx

3. 写入/更新数据
   PUT /api/v1/box/box_xxxxx
   POST /api/v1/box/box_xxxxx

4. 删除Box
   DELETE /api/v1/box/box_xxxxx
```

#### 3.4.2 fundgz行情接口(JSONP)
```
接口: http://api.fund.eastmoney.com/h5/newlist
参数: pageindex, pagesize, sortType, sortRule, callback
响应格式: JSONP
```

### 3.5 本地存储策略

#### 3.5.1 LocalStorage使用
```javascript
// 缓存基金数据
localStorage.setItem('funds', JSON.stringify(funds))

// 缓存行情数据
localStorage.setItem('markets', JSON.stringify(markets))

// 缓存用户设置
localStorage.setItem('settings', JSON.stringify(settings))

// 缓存同步元数据
localStorage.setItem('syncMeta', JSON.stringify({
  lastSyncTime: timestamp,
  localVersion: number,
  jsonboxName: string
}))
```

#### 3.5.2 缓存策略
- **基金数据**: 应用启动时加载，本地修改实时保存
- **行情数据**: 按刷新间隔更新，保持15分钟缓存
- **用户设置**: 修改时立即保存

---

## 四、关键业务流程

### 4.1 应用启动流程
```
应用启动
  ↓
检查本地存储中是否有数据
  ├─ 有 → 加载本地数据 → 初始化Pinia stores
  └─ 无 → 使用默认数据
  ↓
检查JSONBox配置
  ├─ 已配置 → 尝试从JSONBox同步数据
  │  ├─ 成功 → 比对版本，解决冲突
  │  └─ 失败 → 记录错误，使用本地数据
  └─ 未配置 → 生成默认Box名称
  ↓
获取最新行情数据 (JSONP)
  ├─ 成功 → 更新市场行情
  └─ 失败 → 使用缓存数据
  ↓
显示首页，开始自动刷新
```

### 4.2 数据修改流程
```
用户修改数据 (添加/编辑/删除基金)
  ↓
更新本地Pinia store
  ↓
立即保存到LocalStorage
  ↓
触发异步同步任务
  ├─ 网络可用 → 实时上传到JSONBox
  └─ 网络不可用 → 加入离线队列
  ↓
更新UI显示
```

### 4.3 数据同步流程
```
用户点击"立即同步"或定时同步触发
  ↓
比对本地版本和云端版本
  ├─ 版本相同 → 检查是否有新的基金价格更新
  ├─ 本地较新 → 提示冲突（使用本地/使用云端）
  └─ 云端较新 → 下载并刷新UI
  ↓
同步完成，更新lastSyncTime
  ↓
显示同步成功通知
```

### 4.4 分组管理流程
```
新增分组
  ├─ 输入分组名称 → 验证唯一性
  ├─ 保存到groupStore
  ├─ 保存到LocalStorage
  └─ 上传到JSONBox
  
编辑分组
  ├─ 修改分组名称 → 验证唯一性
  ├─ 修改分组内基金 → 更新映射
  ├─ 更新所有数据源
  └─ 上传到JSONBox
  
删除分组
  ├─ 确认操作（弹窗）
  ├─ 分组内基金移至"未分配"
  ├─ 删除分组
  └─ 上传到JSONBox
```

---

## 五、跨域与兼容性方案

### 5.1 fundgz跨域问题
**问题**: fundgz接口返回JSONP格式，浏览器同源策略限制

**解决方案**: 使用JSONP库
```javascript
// 使用jsonp库获取行情数据
import jsonp from 'jsonp';

const getMarketData = async () => {
  return new Promise((resolve, reject) => {
    jsonp('http://api.fund.eastmoney.com/h5/newlist?...', 
      { param: 'callback' }, 
      (err, data) => {
        if (err) reject(err);
        else resolve(data);
      }
    );
  });
};
```

### 5.2 移动端适配
- 使用Element Plus组件库的移动端适配
- Viewport设置: `width=device-width, initial-scale=1.0`
- 触摸事件支持: 长按、滑动
- 响应式设计: 栅格系统、弹性布局

### 5.3 浏览器兼容性
- 最低支持: iOS 11+, Android 5+
- 关键API: 
  - LocalStorage (所有现代浏览器)
  - Fetch API (需Polyfill支持旧浏览器)
  - Promise (需Polyfill支持旧浏览器)

---

## 六、安全与隐私

### 6.1 数据安全
- JSONBox只存储JSON数据，不涉及敏感操作
- 建议用户妥善保管Box名称（当作密钥）
- 可选: 本地加密存储敏感数据

### 6.2 隐私模式
- 开启后，所有数值字段显示为****
- 对话框也隐藏数值
- 数据本身不加密，仅隐藏显示

### 6.3 数据冲突处理
- 版本控制: 每次同步时对比版本号
- 用户选择: 冲突时给用户选择权
- 操作日志: 记录所有修改操作，便于追踪

---

## 七、性能优化

### 7.1 渲染优化
- 虚拟滚动: 基金列表超过100项时使用虚拟滚动
- 图片懒加载: 基金详情页的图表延迟加载
- 组件懒加载: 使用动态import加载路由组件

### 7.2 数据优化
- 增量更新: 只更新变化的字段，不重新加载全部
- 缓存策略: 行情数据15分钟缓存，基金详情1小时缓存
- 离线队列: 网络不可用时缓存修改操作，恢复后批量同步

### 7.3 网络优化
- 请求合并: 多个相同请求合并为一个
- 请求去重: 短时间内多次请求同一数据返回缓存
- 超时控制: 设置合理的请求超时（5秒）
- 重试机制: 失败自动重试（最多3次）

---

## 八、测试策略

### 8.1 单元测试
- Store逻辑: 状态更新、getters、actions
- Service逻辑: 数据计算、转换、验证
- 工具函数: 日期、数字格式化等

### 8.2 集成测试
- 数据同步流程
- 分组管理流程
- 基金修改流程

### 8.3 E2E测试
- 首页交互: 排序、搜索、筛选
- 详情页交互: 编辑、删除
- 设置页交互: 配置修改、同步

### 8.4 兼容性测试
- iOS Safari (最新版)
- Android Chrome (最新版)
- 浏览器 (Chrome, Firefox, Safari)

---

## 九、部署与发布

### 9.1 构建输出
- 生成 `dist/` 目录
- 静态文件: HTML、CSS、JS
- SourceMap: 便于调试（可选生成）

### 9.2 部署选项
1. **GitHub Pages**: 免费托管（推荐）
2. **Vercel**: 自动部署、CDN加速
3. **其他**: Netlify、服务器自托管等

### 9.3 CI/CD
- 使用GitHub Actions自动构建和部署
- 每次push到main分支自动部署
- 运行测试，确保代码质量

---

## 十、扩展性设计

### 10.1 未来功能
- 基金对比功能
- 持仓时间线图表
- 风险评估
- 财务计划
- 社区分享

### 10.2 插件化架构
- 核心功能与扩展分离
- 支持第三方插件开发
- 主题系统：支持自定义主题

### 10.3 国际化
- i18n支持: 预留多语言框架
- 初期支持: 简体中文、English

---

