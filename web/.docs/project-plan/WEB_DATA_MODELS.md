# 基金助手Web端 - 数据模型与接口文档

## 一、TypeScript类型定义

### 1.1 基金相关

```typescript
// 用户持有的基金
interface Fund {
  code: string;              // 基金代码 (唯一标识)
  num: number;               // 持有份额
  cost: number;              // 成本价
  groupKey?: string;         // 所属分组键
}

// 基金详情信息（从接口获取）
interface FundInfo {
  code: string;              // 基金代码
  name: string;              // 基金名称
  currentPrice: number;      // 当前净值
  changePercent: number;     // 日涨跌幅 (%)
  changeAmount: number;      // 日涨跌额
  sector?: string;           // 行业分类
  type?: string;             // 基金类型
  company?: string;          // 基金公司
  establishDate?: string;    // 成立日期
  manager?: string;          // 基金经理
  
  // 计算字段（前端生成）
  dailyGain?: number;        // 日收益
  holdingGain?: number;      // 持有收益
  holdingGainRate?: number;  // 持有收益率 (%)
  estimatedGain?: number;    // 预计收益
  estimatedChange?: number;  // 预计涨幅 (%)
}

// 基金的计算视图（包含所有字段）
interface FundView extends Fund, Partial<FundInfo> {
  name?: string;
  dailyGain?: number;
  holdingGain?: number;
  holdingGainRate?: number;
  estimatedGain?: number;
  estimatedChange?: number;
  changePercent?: number;
  sector?: string;
}
```

### 1.2 分组相关

```typescript
// 分组
interface Group {
  key: string;               // 分组键 (唯一标识，如group_001)
  name: string;              // 分组名称
  fundCodes: string[];       // 分组包含的基金代码
  color?: string;            // 分组颜色 (可选)
  icon?: string;             // 分组图标 (可选)
  createdAt?: timestamp;     // 创建时间
  updatedAt?: timestamp;     // 更新时间
}

// 分组元数据
interface GroupMetadata {
  name: string;
  color?: string;
  icon?: string;
}
```

### 1.3 行情相关

```typescript
// 行情信息
interface MarketInfo {
  code: string;              // 行情代码
  name: string;              // 行情名称
  price: number;             // 当前价格
  changePercent: number;     // 涨跌幅 (%)
  changeAmount: number;      // 涨跌额
  category: string;          // 分类 (如: 'A股', 'H股', '美股')
  timestamp?: timestamp;     // 数据时间
}

// 行情分类
enum MarketCategory {
  STOCK_A = 'A股',           // 沪深京A股
  STOCK_H = 'H股',           // 港股
  STOCK_US = '美股',         // 美股
  OTHER = '其他'             // 其他指数
}

// 行情列表项（带缓存信息）
interface MarketListItem extends MarketInfo {
  cached?: boolean;          // 是否来自缓存
  lastUpdateTime?: timestamp;
}
```

### 1.4 设置相关

```typescript
// 用户设置
interface Settings {
  // JSONBox配置
  jsonboxName: string;       // Box名称 (20-64字符)
  
  // 显示设置
  privacyMode: boolean;      // 隐私模式
  grayscaleMode: boolean;    // 灰色模式
  refreshInterval: number;   // 自动刷新间隔(秒)
  theme: 'light' | 'dark';   // 主题
  language: 'zh-CN' | 'en-US'; // 语言
  
  // 列表配置
  columnOrder: string[];     // 列顺序
  visibleColumns: string[];  // 可见列
  sortMethod: string;        // 默认排序方法 (如: "holdingGainRate_desc")
}

// 列定义
interface ColumnDefinition {
  key: string;               // 列键
  label: string;             // 列标签
  width?: number;            // 列宽度
  sortable?: boolean;        // 是否可排序
  format?: (value: any) => string; // 格式化函数
}
```

### 1.5 同步相关

```typescript
// 同步元数据
interface SyncMetadata {
  lastSyncTime: timestamp;   // 最后同步时间
  localVersion: number;      // 本地数据版本
  cloudVersion: number;      // 云端数据版本
  jsonboxName: string;       // JSONBox Box名称
  status: 'idle' | 'syncing' | 'success' | 'error';
  error?: string;            // 错误信息
}

// 同步操作
interface SyncAction {
  id?: string;               // 操作ID
  type: 'add' | 'update' | 'delete';
  entity: 'fund' | 'group' | 'setting';
  data: any;                 // 操作数据
  timestamp: timestamp;      // 操作时间
  synced?: boolean;          // 是否已同步
}

// 数据冲突
interface DataConflict {
  type: 'version_mismatch' | 'data_mismatch';
  localVersion: number;
  cloudVersion: number;
  localData: any;
  cloudData: any;
  timestamp: timestamp;
}
```

### 1.6 UI状态相关

```typescript
// 通知
interface Notification {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;         // 显示时间(ms)
  closable?: boolean;
}

// 操作面板（基金或分组）
interface OperationMenu {
  type: 'fund' | 'group';
  target: Fund | Group;
  actions: MenuAction[];
}

interface MenuAction {
  id: string;
  label: string;
  icon?: string;
  handler: () => void;
}

// 加载状态
interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error?: string;
}
```

---

## 二、Pinia Store接口定义

### 2.1 fundStore

```typescript
interface FundStoreState {
  // 数据
  funds: Fund[];
  fundDetails: Map<string, FundInfo>;
  
  // UI状态
  selectedGroupKey: string;
  selectedFundCode?: string;
  
  // 搜索和筛选
  searchQuery: string;
  
  // 排序和分页
  sortConfig: {
    field: string;           // 排序字段
    order: 'asc' | 'desc';  // 排序顺序
  };
}

interface FundStoreActions {
  // CRUD
  addFund(code: string, num: number, cost: number, groupKey?: string): Promise<void>
  updateFund(code: string, num: number, cost: number, groupKey?: string): Promise<void>
  deleteFund(code: string): Promise<void>
  
  // 查询
  getFund(code: string): Fund | undefined
  getFundList(groupKey?: string): Fund[]
  searchFunds(query: string): Fund[]
  
  // 详情
  fetchFundDetail(code: string): Promise<FundInfo>
  
  // 更新行情
  updateFundPrices(prices: Map<string, number>): void
  
  // 批量操作
  moveFundsToGroup(fundCodes: string[], groupKey: string): Promise<void>
  clearFunds(): void
}

interface FundStoreGetters {
  // 计算
  fundCount: () => number
  getFundView(code: string): (code: string) => FundView
  getAllFundViews: () => FundView[]
  
  // 统计
  getTotalAsset: () => number
  getTotalHoldingGain: () => number
  getTotalDailyGain: () => number
  getAverageGainRate: () => number
}
```

### 2.2 groupStore

```typescript
interface GroupStoreState {
  groups: Map<string, Group>;
  groupOrder: string[];
}

interface GroupStoreActions {
  // CRUD
  addGroup(name: string, color?: string): Promise<string>
  updateGroup(key: string, name: string, color?: string): Promise<void>
  deleteGroup(key: string): Promise<void>
  
  // 查询
  getGroup(key: string): Group | undefined
  getGroupList(): Group[]
  getGroupFunds(key: string): Fund[]
  
  // 操作
  addFundToGroup(fundCode: string, groupKey: string): Promise<void>
  removeFundFromGroup(fundCode: string): Promise<void>
  reorderGroups(newOrder: string[]): Promise<void>
  
  // 批量
  clearGroups(): void
}

interface GroupStoreGetters {
  groupCount: () => number
  getGroupName(key: string): string
  getGroupsByFund(fundCode: string): Group[]
}
```

### 2.3 marketStore

```typescript
interface MarketStoreState {
  markets: Map<string, MarketInfo>;
  categories: MarketCategory[];
  selectedCategory: MarketCategory;
  lastUpdateTime: timestamp;
  loading: boolean;
  error?: string;
}

interface MarketStoreActions {
  // 获取
  fetchMarkets(category?: MarketCategory): Promise<void>
  fetchMarketByCode(code: string): Promise<MarketInfo>
  
  // 更新
  updateMarket(code: string, info: Partial<MarketInfo>): void
  updateMarkets(markets: MarketInfo[]): void
  
  // UI
  selectCategory(category: MarketCategory): void
  search(query: string): MarketInfo[]
  
  // 清空
  clearMarkets(): void
}

interface MarketStoreGetters {
  marketsByCategory: (category: MarketCategory) => MarketInfo[]
  getMarket: (code: string) => MarketInfo | undefined
  filteredMarkets: () => MarketInfo[]
  isMarketLoading: () => boolean
}
```

### 2.4 settingStore

```typescript
interface SettingStoreState {
  settings: Settings;
  columns: Map<string, ColumnDefinition>;
}

interface SettingStoreActions {
  // 基础设置
  updateSetting(key: keyof Settings, value: any): Promise<void>
  updateSettings(partial: Partial<Settings>): Promise<void>
  getSettings(): Settings
  
  // JSONBox
  setJsonboxName(name: string): Promise<void>
  getJsonboxName(): string
  
  // 列表配置
  setColumnOrder(order: string[]): Promise<void>
  setVisibleColumns(columns: string[]): Promise<void>
  setSortMethod(method: string): Promise<void>
  
  // 显示设置
  setPrivacyMode(enabled: boolean): Promise<void>
  setGrayscaleMode(enabled: boolean): Promise<void>
  setRefreshInterval(seconds: number): Promise<void>
  
  // 重置
  resetSettings(): Promise<void>
}

interface SettingStoreGetters {
  privacyMode: () => boolean
  grayscaleMode: () => boolean
  refreshInterval: () => number
  isValidJsonboxName: (name: string) => boolean
}
```

### 2.5 syncStore

```typescript
interface SyncStoreState {
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  lastSyncTime: timestamp;
  syncError?: string;
  localVersion: number;
  cloudVersion: number;
  offlineQueue: SyncAction[];
  dataConflict?: DataConflict;
}

interface SyncStoreActions {
  // 同步
  syncToCloud(): Promise<void>
  syncFromCloud(): Promise<void>
  fullSync(): Promise<void>
  
  // 离线
  queueAction(action: SyncAction): void
  processOfflineQueue(): Promise<void>
  clearOfflineQueue(): void
  
  // 冲突
  resolveConflict(strategy: 'local' | 'cloud'): Promise<void>
  
  // 状态
  setSyncStatus(status: SyncStoreState['syncStatus']): void
  clearSyncError(): void
}

interface SyncStoreGetters {
  isSyncing: () => boolean
  canSync: () => boolean
  hasOfflineActions: () => boolean
  hasConflict: () => boolean
  getOfflineActionCount: () => number
}
```

### 2.6 uiStore

```typescript
interface UIStoreState {
  // 页面导航
  currentPage: 'home' | 'market' | 'settings' | 'detail';
  detailFundCode?: string;
  
  // UI状态
  isLoading: boolean;
  isRefreshing: boolean;
  notification?: Notification;
  
  // 菜单
  showFundMenu: boolean;
  fundMenuTarget?: Fund;
  showGroupMenu: boolean;
  groupMenuTarget?: string;
}

interface UIStoreActions {
  // 页面导航
  navigateTo(page: UIStoreState['currentPage'], params?: any): void
  goToFundDetail(code: string): void
  goHome(): void
  
  // 菜单
  showFundOperationMenu(fund: Fund): void
  showGroupOperationMenu(groupKey: string): void
  closeFundMenu(): void
  closeGroupMenu(): void
  
  // 通知
  showNotification(notification: Notification): void
  hideNotification(): void
  
  // 加载状态
  setLoading(loading: boolean): void
  setRefreshing(refreshing: boolean): void
}

interface UIStoreGetters {
  isHomePage: () => boolean
  isDetailPage: () => boolean
  hasNotification: () => boolean
}
```

---

## 三、API接口定义

### 3.1 JSONBox API

#### 获取Box中的数据
```
GET /api/v1/box/{boxName}

响应:
{
  "funds": [...],
  "groups": {...},
  "settings": {...},
  "version": 1,
  "lastModified": "2026-05-08T10:30:00Z"
}

状态码:
200 - 成功
404 - Box不存在
500 - 服务器错误
```

#### 更新Box中的数据
```
PUT /api/v1/box/{boxName}

请求体:
{
  "funds": [...],
  "groups": {...},
  "settings": {...},
  "version": 2
}

响应:
{
  "success": true,
  "version": 2,
  "lastModified": "2026-05-08T10:35:00Z"
}

状态码:
200 - 成功
409 - 版本冲突 (返回当前版本)
400 - 请求格式错误
500 - 服务器错误
```

#### 创建新Box
```
POST /api/v1/box?name={boxName}

请求体:
{
  "funds": [],
  "groups": {},
  "settings": {...}
}

响应:
{
  "name": "{boxName}",
  "version": 1,
  "createdAt": "2026-05-08T10:00:00Z"
}

状态码:
201 - 创建成功
400 - 名称无效
409 - Box已存在
```

#### 删除Box
```
DELETE /api/v1/box/{boxName}

响应:
{
  "success": true
}

状态码:
200 - 删除成功
404 - Box不存在
```

### 3.2 fundgz行情接口（JSONP）

#### 获取行情列表
```
GET http://api.fund.eastmoney.com/h5/newlist
Params:
- pageindex: 1
- pagesize: 100
- sortType: 0
- sortRule: 0
- callback: jsonpCallback

响应格式: JSONP
Callback response:
{
  "data": {
    "datas": [
      {
        "FCODE": "000001",
        "SHORTNAME": "上证综合",
        "PERCENT": "1.20",
        "PRICE": "3000.00",
        "PDATE": "2026-05-08",
        "PTIME": "15:00"
      },
      ...
    ]
  }
}
```

#### 获取基金详情
```
GET http://api.fund.eastmoney.com/fundinfo/web
Params:
- code: 基金代码 (如: 001)
- callback: jsonpCallback

响应格式: JSONP
Callback response:
{
  "Datas": {
    "fundcode": "001",
    "name": "华夏成长混合",
    "jjlx": "混合型基金",
    "establishdate": "2020-01-01",
    "gxrq": "2026-05-08",
    "dwjz": "2.5156",
    "ljjz": "10.5600",
    "fund_manager": "张某某"
  }
}
```

### 3.3 本地API (Service)

#### fundService
```typescript
// 基金管理
FundService.addFund(code, num, cost): Promise<void>
FundService.updateFund(code, num, cost): Promise<void>
FundService.deleteFund(code): Promise<void>
FundService.getFund(code): Fund
FundService.getFundList(): Fund[]

// 计算
FundService.calculateHoldingGain(fund, price): number
FundService.calculateDailyGain(fund, changeAmount): number
FundService.calculateEstimatedGain(fund, price): number

// 统计
FundService.getTotalAsset(): number
FundService.getTotalHoldingGain(): number
FundService.getTotalDailyGain(): number
```

#### groupService
```typescript
// 分组管理
GroupService.addGroup(name): Promise<string>
GroupService.updateGroup(key, name): Promise<void>
GroupService.deleteGroup(key): Promise<void>
GroupService.getGroup(key): Group
GroupService.getGroupList(): Group[]

// 基金操作
GroupService.addFundToGroup(fundCode, groupKey): Promise<void>
GroupService.removeFundFromGroup(fundCode): Promise<void>
GroupService.getGroupFunds(groupKey): Fund[]
```

#### marketService
```typescript
// 行情
MarketService.fetchMarkets(category): Promise<MarketInfo[]>
MarketService.searchMarkets(query): MarketInfo[]
MarketService.getMarket(code): MarketInfo

// 缓存
MarketService.isCached(code): boolean
MarketService.getCachedMarket(code): MarketInfo | null
```

#### syncService
```typescript
// 同步
SyncService.syncToCloud(): Promise<void>
SyncService.syncFromCloud(): Promise<void>
SyncService.fullSync(): Promise<void>

// 冲突
SyncService.resolveConflict(strategy): Promise<void>
SyncService.compareVersions(): DataConflict | null

// 离线
SyncService.queueAction(action): void
SyncService.processQueue(): Promise<void>
```

---

## 四、表格列定义

### 基金列表列

| 键 | 标签 | 格式 | 宽度 | 可排序 | 说明 |
|----|------|------|------|--------|------|
| name | 基金名称 | 代码 + 名称 | 固定 | ✓ | 左固定，可点击进入详情 |
| estimatedGain | 预计收益 | ¥ 格式 | 120px | ✓ | (当前价-成本价)×份额 |
| estimatedChange | 预计涨幅 | % 格式 | 100px | ✓ | (当前价/成本价-1)×100% |
| holdingGainRate | 持有收益率 | % 格式 | 100px | ✓ | 预计收益/(成本价×份额)×100% |
| holdingGain | 持有收益 | ¥ 格式 | 120px | ✓ | 同estimatedGain |
| amountShares | 持有份额 | 数值 | 120px | ✗ | 份额数量 |
| dailyChange | 日涨幅 | % 格式 | 100px | ✓ | 日涨跌幅 |
| dailyGain | 日收益 | ¥ 格式 | 120px | ✓ | 日涨跌额×份额 |
| sector | 所属分类 | 文本 | 100px | ✓ | 行业分类 |
| cost | 成本价 | ¥ 格式 | 100px | ✓ | 买入成本价 |

### 行情列表列

| 键 | 标签 | 格式 | 宽度 | 说明 |
|----|------|------|------|------|
| code | 代码 | 文本 | 80px | 行情代码 |
| name | 名称 | 文本 | 200px | 行情名称 |
| price | 当前 | ¥ 格式 | 100px | 当前价格 |
| changePercent | 涨幅 | % 格式 | 80px | 涨跌幅（%） |
| changeAmount | 涨跌 | ¥ 格式 | 100px | 涨跌额 |
| category | 分类 | 标签 | 80px | 行情分类 |

---

## 五、数据验证规则

### 基金数据
```typescript
// 基金代码: 6位数字
/^\d{6}$/

// 持有份额: 正数，最多2位小数
/^\d+(\.\d{1,2})?$/

// 成本价: 正数，最多4位小数
/^\d+(\.\d{1,4})?$/

// 分组名称: 1-50字符，不能为空
/^[\w\u4e00-\u9fa5]{1,50}$/
```

### 设置数据
```typescript
// JSONBox名称: 20-64字符，只允许字母、数字、下划线、连字符
/^[a-zA-Z0-9_-]{20,64}$/

// 刷新间隔: 10-3600秒
[10, 20, 30, 60, 300, 600, 3600]

// 主题: light | dark
// 语言: zh-CN | en-US
```

---

## 六、状态码和错误处理

### HTTP状态码
```
200 OK - 成功
201 Created - 创建成功
400 Bad Request - 请求参数错误
404 Not Found - 资源不存在
409 Conflict - 版本冲突
500 Internal Server Error - 服务器错误
503 Service Unavailable - 服务不可用
```

### 应用错误码
```
E001 - JSONBox连接失败
E002 - 行情接口请求失败
E003 - 数据版本冲突
E004 - 本地存储满
E005 - 输入数据验证失败
E006 - 操作权限不足
E007 - 离线队列处理失败
```

### 错误处理流程
```
API调用失败
  ↓
检查错误类型
  ├─ 网络错误 → 使用缓存/离线模式
  ├─ 超时 → 自动重试 (最多3次)
  ├─ 数据格式错误 → 记录日志，显示错误
  └─ 服务器错误 → 显示用户友好提示
  ↓
更新syncStore错误状态
  ↓
显示通知给用户
```

---

## 七、缓存策略

### 缓存键名
```
基金详情: cache:fund:{code}
行情数据: cache:market:{code}
行情列表: cache:markets:{category}
基金列表: cache:funds
用户设置: cache:settings
```

### 缓存时间
```
基金详情: 1小时
行情数据: 15分钟
行情列表: 15分钟
用户设置: 永不过期
同步元数据: 永不过期
离线队列: 永不过期
```

### 缓存命中逻辑
```
请求数据
  ↓
检查缓存是否存在且未过期
  ├─ 是 → 返回缓存数据
  └─ 否 → 继续
  ↓
检查网络连接
  ├─ 在线 → 请求新数据
  │  ├─ 成功 → 保存缓存，返回数据
  │  └─ 失败 → 返回过期缓存（如有）
  └─ 离线 → 返回缓存数据
```

---

