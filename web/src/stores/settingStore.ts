// 用户设置管理 Store

import { defineStore } from 'pinia'
import type { Settings, ColumnDefinition } from '@/types'
import { generateJsonboxName } from '@/utils/validate'

interface SettingStoreState {
  settings: Settings
  columns: Map<string, ColumnDefinition>
}

// 默认设置
const defaultSettings: Settings = {
  jsonboxName: generateJsonboxName(),
  privacyMode: false,
  grayscaleMode: false,
  refreshInterval: 20,
  theme: 'light',
  language: 'zh-CN',
  columnOrder: [
    'name',
    'estimatedGain',
    'estimatedChange',
    'holdingGainRate',
    'holdingGain',
    'amountShares',
    'dailyChange',
    'dailyGain',
    'sector',
    'cost'
  ],
  visibleColumns: [
    'name',
    'estimatedGain',
    'estimatedChange',
    'holdingGainRate',
    'holdingGain',
    'dailyChange',
    'dailyGain'
  ],
  sortMethod: 'holdingGainRate_desc'
}

// 列定义
const defaultColumns: ColumnDefinition[] = [
  { key: 'name', label: '基金名称', width: 200, sortable: true },
  { key: 'estimatedGain', label: '预计收益', width: 120, sortable: true },
  { key: 'estimatedChange', label: '预计涨幅', width: 100, sortable: true },
  { key: 'holdingGainRate', label: '持有收益率', width: 100, sortable: true },
  { key: 'holdingGain', label: '持有收益', width: 120, sortable: true },
  { key: 'amountShares', label: '持有份额', width: 120, sortable: false },
  { key: 'dailyChange', label: '日涨幅', width: 100, sortable: true },
  { key: 'dailyGain', label: '日收益', width: 120, sortable: true },
  { key: 'sector', label: '所属分类', width: 100, sortable: true },
  { key: 'cost', label: '成本价', width: 100, sortable: true }
]

export const useSettingStore = defineStore('setting', {
  state: (): SettingStoreState => ({
    settings: { ...defaultSettings },
    columns: new Map(defaultColumns.map(col => [col.key, col]))
  }),

  getters: {
    // 隐私模式
    privacyMode(): boolean {
      return this.settings.privacyMode
    },

    // 灰色模式
    grayscaleMode(): boolean {
      return this.settings.grayscaleMode
    },

    // 刷新间隔
    refreshInterval(): number {
      return this.settings.refreshInterval
    },

    // 主题
    theme(): 'light' | 'dark' {
      return this.settings.theme
    },

    // JSONBox名称
    jsonboxName(): string {
      return this.settings.jsonboxName
    },

    // 可见列
    visibleColumns(): string[] {
      return this.settings.visibleColumns
    },

    // 列顺序
    columnOrder(): string[] {
      return this.settings.columnOrder
    },

    // 排序方法
    sortMethod(): string {
      return this.settings.sortMethod
    }
  },

  actions: {
    // 更新单个设置
    async updateSetting(key: keyof Settings, value: any) {
      (this.settings as any)[key] = value
    },

    // 批量更新设置
    async updateSettings(partial: Partial<Settings>) {
      this.settings = { ...this.settings, ...partial }
    },

    // 获取所有设置
    getSettings(): Settings {
      return { ...this.settings }
    },

    // 设置JSONBox名称
    async setJsonboxName(name: string) {
      this.settings.jsonboxName = name
    },

    // 获取JSONBox名称
    getJsonboxName(): string {
      return this.settings.jsonboxName
    },

    // 设置列顺序
    async setColumnOrder(order: string[]) {
      this.settings.columnOrder = order
    },

    // 设置可见列
    async setVisibleColumns(columns: string[]) {
      this.settings.visibleColumns = columns
    },

    // 设置排序方法
    async setSortMethod(method: string) {
      this.settings.sortMethod = method
    },

    // 设置隐私模式
    async setPrivacyMode(enabled: boolean) {
      this.settings.privacyMode = enabled
    },

    // 设置灰色模式
    async setGrayscaleMode(enabled: boolean) {
      this.settings.grayscaleMode = enabled
    },

    // 设置刷新间隔
    async setRefreshInterval(seconds: number) {
      this.settings.refreshInterval = seconds
    },

    // 设置主题
    async setTheme(theme: 'light' | 'dark') {
      this.settings.theme = theme
    },

    // 重置设置
    async resetSettings() {
      this.settings = { ...defaultSettings }
    },

    // 获取列定义
    getColumnDefinition(key: string): ColumnDefinition | undefined {
      return this.columns.get(key)
    },

    // 获取所有列定义
    getAllColumnDefinitions(): ColumnDefinition[] {
      return Array.from(this.columns.values())
    }
  }
})
