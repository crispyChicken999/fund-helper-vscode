// 基金助手Web端 - TypeScript类型定义

// ==================== 基金相关 ====================

// 用户持有的基金
export interface Fund {
  code: string              // 基金代码 (唯一标识)
  num: number               // 持有份额
  cost: number              // 成本价
  groupKey?: string         // 所属分组键
}

// 基金详情信息（从接口获取）
export interface FundInfo {
  code: string              // 基金代码
  name: string              // 基金名称
  currentPrice: number      // 当前净值
  changePercent: number     // 日涨跌幅 (%)
  changeAmount: number      // 日涨跌额
  sector?: string           // 行业分类
  type?: string             // 基金类型
  company?: string          // 基金公司
  establishDate?: string    // 成立日期
  manager?: string          // 基金经理
  
  // 计算字段（前端生成）
  dailyGain?: number        // 日收益
  holdingGain?: number      // 持有收益
  holdingGainRate?: number  // 持有收益率 (%)
  estimatedGain?: number    // 预计收益
  estimatedChange?: number  // 预计涨幅 (%)
}

// 基金的计算视图（包含所有字段）
export interface FundView extends Fund {
  name?: string
  currentPrice?: number
  changePercent?: number
  changeAmount?: number
  sector?: string
  dailyGain?: number
  holdingGain?: number
  holdingGainRate?: number
  estimatedGain?: number
  estimatedChange?: number
  timestamp?: number
  type?: string
  company?: string
  establishDate?: string
  manager?: string
}

// ==================== 分组相关 ====================

// 分组
export interface Group {
  key: string               // 分组键 (唯一标识，如group_001)
  name: string              // 分组名称
  fundCodes: string[]       // 分组包含的基金代码
  color?: string            // 分组颜色 (可选)
  icon?: string             // 分组图标 (可选)
  createdAt?: number        // 创建时间
  updatedAt?: number        // 更新时间
}

// 分组元数据
export interface GroupMetadata {
  name: string
  color?: string
  icon?: string
}

// ==================== 行情相关 ====================

// 行情信息
export interface MarketInfo {
  code: string              // 行情代码
  name: string              // 行情名称
  price: number             // 当前价格
  changePercent: number     // 涨跌幅 (%)
  changeAmount: number      // 涨跌额
  category: string          // 分类 (如: 'A股', 'H股', '美股')
  timestamp?: number        // 数据时间
}

// 行情分类
export type MarketCategory = 'A股' | 'H股' | '美股' | '其他'

// 行情列表项（带缓存信息）
export interface MarketListItem extends MarketInfo {
  cached?: boolean          // 是否来自缓存
  lastUpdateTime?: number
}

// ==================== 设置相关 ====================

// 用户设置
export interface Settings {
  // JSONBox配置
  jsonboxName: string       // Box名称 (20-64字符)
  
  // 显示设置
  privacyMode: boolean      // 隐私模式
  grayscaleMode: boolean    // 灰色模式
  refreshInterval: number   // 自动刷新间隔(秒)
  theme: 'light' | 'dark'   // 主题
  language: 'zh-CN' | 'en-US' // 语言
  
  // 列表配置
  columnOrder: string[]     // 列顺序
  visibleColumns: string[]  // 可见列
  sortMethod: string        // 默认排序方法 (如: "holdingGainRate_desc")
}

// 列定义
export interface ColumnDefinition {
  key: string               // 列键
  label: string             // 列标签
  width?: number            // 列宽度
  sortable?: boolean        // 是否可排序
  format?: (value: any) => string // 格式化函数
}

// ==================== 同步相关 ====================

// 同步元数据
export interface SyncMetadata {
  lastSyncTime: number      // 最后同步时间
  localVersion: number      // 本地数据版本
  cloudVersion: number      // 云端数据版本
  jsonboxName: string       // JSONBox Box名称
  status: 'idle' | 'syncing' | 'success' | 'error'
  error?: string            // 错误信息
}

// 同步操作
export interface SyncAction {
  id?: string               // 操作ID
  type: 'add' | 'update' | 'delete'
  entity: 'fund' | 'group' | 'setting'
  data: any                 // 操作数据
  timestamp: number         // 操作时间
  synced?: boolean          // 是否已同步
}

// 数据冲突
export interface DataConflict {
  type: 'version_mismatch' | 'data_mismatch'
  localVersion: number
  cloudVersion: number
  localData: any
  cloudData: any
  timestamp: number
}

// ==================== UI状态相关 ====================

// 通知
export interface Notification {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number         // 显示时间(ms)
  closable?: boolean
}

// 操作面板（基金或分组）
export interface OperationMenu {
  type: 'fund' | 'group'
  target: Fund | Group
  actions: MenuAction[]
}

export interface MenuAction {
  id: string
  label: string
  icon?: string
  handler: () => void
}

// 加载状态
export interface LoadingState {
  isLoading: boolean
  isRefreshing: boolean
  error?: string
}

// 排序配置
export interface SortConfig {
  field: string             // 排序字段
  order: 'asc' | 'desc'     // 排序顺序
}

// 页面类型
export type PageType = 'home' | 'market' | 'settings' | 'detail'
