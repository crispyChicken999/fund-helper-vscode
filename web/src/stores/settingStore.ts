// 用户设置管理 Store

import { defineStore } from 'pinia'
import type { Settings, ColumnDefinition } from '@/types'
import { generateJsonboxName } from '@/utils/validate'
import {
  storageService,
  ensureBoxName,
  FUND_HELPER_BOX_NAME_KEY
} from '@/services/storageService'

interface SettingStoreState {
  settings: Settings
  columns: Map<string, ColumnDefinition>
}

// 默认设置（jsonboxName 由 ensureBoxName / loadFromStorage 填入）
const defaultSettings: Settings = {
  jsonboxName: '',
  privacyMode: false,
  grayscaleMode: false,
  refreshInterval: 20,
  theme: 'light',
  themeMode: 'auto',
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
    'amountShares',
    'dailyChange',
    'dailyGain',
    'sector',
    'cost'
  ],
  sortMethod: 'holdingGainRate_desc',
  maxContentWidthMode: 'preset',
  maxContentWidth: 1024
}

// 列定义
const defaultColumns: ColumnDefinition[] = [
  { key: 'name', label: '基金名称', width: 200, sortable: true },
  { key: 'estimatedGain', label: '估算收益', width: 120, sortable: true },
  { key: 'estimatedChange', label: '估算涨幅', width: 100, sortable: true },
  { key: 'holdingGainRate', label: '持有收益率', width: 100, sortable: true },
  { key: 'holdingGain', label: '持有收益', width: 120, sortable: true },
  { key: 'amountShares', label: '金额/份额', width: 120, sortable: false },
  { key: 'dailyChange', label: '当日涨幅', width: 100, sortable: true },
  { key: 'dailyGain', label: '当日收益', width: 120, sortable: true },
  { key: 'sector', label: '关联板块', width: 100, sortable: true },
  { key: 'cost', label: '成本/最新', width: 100, sortable: true }
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

    // 主题模式
    themeMode(): 'light' | 'dark' | 'auto' {
      return (this.settings as any).themeMode
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
    },

    // 最大宽度模式
    maxContentWidthMode(): 'full' | 'preset' | 'custom' {
      return this.settings.maxContentWidthMode
    },

    // 最大内容宽度
    maxContentWidth(): number {
      return this.settings.maxContentWidth
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
      localStorage.setItem(FUND_HELPER_BOX_NAME_KEY, name)
      storageService.saveSettings(this.getSettings())
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
      storageService.saveSettings(this.getSettings())
    },

    // 设置隐私模式
    async setPrivacyMode(enabled: boolean) {
      this.settings.privacyMode = enabled
      storageService.saveSettings(this.getSettings())
    },

    // 设置灰色模式
    async setGrayscaleMode(enabled: boolean) {
      this.settings.grayscaleMode = enabled
      storageService.saveSettings(this.getSettings())
    },

    // 设置刷新间隔
    async setRefreshInterval(seconds: number) {
      this.settings.refreshInterval = seconds
      storageService.saveSettings(this.getSettings())
    },

    // 设置主题（应用的实际主题：light/dark）
    async setTheme(theme: 'light' | 'dark') {
      this.settings.theme = theme
      storageService.saveSettings(this.getSettings())
    },

    // 设置主题模式（用户选择：light/dark/auto）
    async setThemeMode(mode: 'light' | 'dark' | 'auto') {
      ;(this.settings as any).themeMode = mode

      // 计算应应用的实际主题
      let applied: 'light' | 'dark' = 'light'
      if (mode === 'auto') {
        try {
          applied = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        } catch (e) {
          applied = 'light'
        }
      } else {
        applied = mode
      }

      // 设置实际主题
      this.settings.theme = applied
      storageService.saveSettings(this.getSettings())
    },

    // 设置最大宽度模式
    async setMaxContentWidthMode(mode: 'full' | 'preset' | 'custom') {
      this.settings.maxContentWidthMode = mode
      storageService.saveSettings(this.getSettings())
    },

    // 设置最大内容宽度
    async setMaxContentWidth(width: number) {
      this.settings.maxContentWidth = width
      storageService.saveSettings(this.getSettings())
    },

    // 从本地存储加载并与 canonical box 名对齐
    async loadFromStorage() {
      const saved = storageService.loadSettings()
      if (saved) {
        // Merge column settings: if a column exists in defaultSettings but is
        // completely absent from the saved columnOrder, it's a newly added column
        // — append it to both columnOrder and visibleColumns.
        // If it's already in columnOrder but not visibleColumns, the user hid it
        // intentionally, so leave it alone.
        const savedOrder: string[] = saved.columnOrder ?? []
        const savedVisible: string[] = saved.visibleColumns ?? []

        const newCols = defaultSettings.columnOrder.filter(col => !savedOrder.includes(col))

        await this.updateSettings({
          ...saved,
          columnOrder: [...savedOrder, ...newCols],
          visibleColumns: [...savedVisible, ...newCols]
        })
      }
      const box = ensureBoxName()
      this.settings.jsonboxName = box

      // 如果用户选择了跟随系统模式，计算并设置实际主题
      if ((this.settings as any).themeMode === 'auto') {
        try {
          const applied = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          this.settings.theme = applied
        } catch (e) {
          // ignore
        }
      }
    },

    // 重置设置
    async resetSettings() {
      this.settings = {
        ...defaultSettings,
        jsonboxName: generateJsonboxName()
      }
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
