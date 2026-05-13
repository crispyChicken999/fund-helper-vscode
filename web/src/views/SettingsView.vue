<template>
  <MainLayout>
    <template #header>
      <el-header class="settings-page-header">
        <h2>设置</h2>
      </el-header>
    </template>

    <div class="settings-main">
        <el-form label-width="120px">
          <el-divider content-position="left">显示设置</el-divider>
          
          <el-form-item label="隐私模式">
            <el-switch v-model="privacyMode" @change="handlePrivacyModeChange" />
            <div class="form-item-tip">开启后隐藏所有数值</div>
          </el-form-item>

          <el-form-item label="灰色模式">
            <el-switch v-model="grayscaleMode" @change="handleGrayscaleModeChange" />
            <div class="form-item-tip">移除所有色彩，仅保留黑白灰</div>
          </el-form-item>

          <el-form-item label="主题">
            <el-radio-group v-model="theme" @change="handleThemeChange">
              <el-radio label="light">浅色</el-radio>
              <el-radio label="dark">深色</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="刷新间隔">
            <el-select v-model="refreshInterval" @change="handleRefreshIntervalChange">
              <el-option label="10秒" :value="10" />
              <el-option label="20秒" :value="20" />
              <el-option label="30秒" :value="30" />
              <el-option label="1分钟" :value="60" />
              <el-option label="5分钟" :value="300" />
            </el-select>
          </el-form-item>

          <el-divider content-position="left">列表配置</el-divider>

          <el-form-item label="可见列">
            <el-checkbox-group v-model="visibleColumns" @change="handleVisibleColumnsChange">
              <el-checkbox
                v-for="col in allColumns"
                :key="col.key"
                :label="col.key"
                :disabled="col.key === 'name'"
              >
                {{ col.label }}
              </el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="列顺序">
            <div class="form-item-tip" style="margin-bottom:8px">拖拽 ☰ 调整列顺序（名称列固定首位）</div>
            <ul ref="columnSortRef" class="column-sort-list">
              <li v-for="col in columnOrderDraft" :key="col" :data-key="col" class="column-sort-item">
                <span class="drag-handle">☰</span>
                <span>{{ columnLabel(col) }}</span>
              </li>
            </ul>
          </el-form-item>

          <el-divider content-position="left">数据同步</el-divider>
          
          <el-form-item label="Box Name">
            <el-input
              v-model="jsonboxName"
              placeholder="20-64字符"
              @blur="handleJsonboxNameChange"
            >
              <template #append>
                <el-button
                  :icon="Connection"
                  @click="handleTestConnection"
                  :loading="testingConnection"
                >
                  测试
                </el-button>
              </template>
            </el-input>
            <div class="form-item-tip">用于与 VSCode 版本同步数据</div>
          </el-form-item>

          <el-form-item label="同步操作">
            <el-space wrap>
              <el-button
                type="primary"
                :icon="Upload"
                @click="handleSyncToCloud"
                :loading="isSyncing"
                :disabled="!jsonboxName"
              >
                上传云端
              </el-button>
              <el-button
                :icon="Download"
                @click="handleSyncFromCloud"
                :loading="isSyncing"
                :disabled="!jsonboxName"
              >
                下载云端
              </el-button>
            </el-space>
          </el-form-item>

          <el-divider content-position="left">数据管理</el-divider>

          <el-form-item label="导入导出">
            <el-space wrap>
              <el-button :icon="Download" @click="handleImportJson">
                导入 JSON
              </el-button>
              <el-button :icon="Upload" @click="handleExportJson">
                导出 JSON
              </el-button>
            </el-space>
            <div class="form-item-tip">支持导入 VSCode 版导出的 JSON 文件</div>
          </el-form-item>

          <el-form-item label="危险操作">
            <el-button
              type="danger"
              :icon="Delete"
              @click="handleClearAll"
              plain
            >
              清空本地数据
            </el-button>
          </el-form-item>

          <el-divider content-position="left">关于</el-divider>
          
          <el-form-item label="版本">
            <span>1.0.0</span>
          </el-form-item>

          <el-form-item label="数据来源">
            <span>天天基金 / 东方财富</span>
          </el-form-item>
        </el-form>
    </div>

    <!-- 隐藏的文件输入 -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".json"
      style="display:none"
      @change="onFileSelected"
    />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Upload, Download, Delete } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { useSettingStore, useFundStore, useGroupStore, useSyncStore } from '@/stores'
import { syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { formatRelativeTime } from '@/utils/format'

const settingStore = useSettingStore()
const fundStore = useFundStore()
const groupStore = useGroupStore()
const syncStore = useSyncStore()

// ==================== 响应式数据 ====================

const privacyMode = ref(false)
const grayscaleMode = ref(false)
const theme = ref<'light' | 'dark'>('light')
const refreshInterval = ref(20)
const jsonboxName = ref('')
const testingConnection = ref(false)
const visibleColumns = ref<string[]>([])
const columnOrderDraft = ref<string[]>([])

const fileInputRef = ref<HTMLInputElement | null>(null)
const columnSortRef = ref<HTMLElement | null>(null)
let columnSortable: Sortable | null = null

const allColumns = [
  { key: 'name', label: '基金名称' },
  { key: 'estimatedGain', label: '估算收益' },
  { key: 'estimatedChange', label: '估算涨幅' },
  { key: 'holdingGainRate', label: '总收益率' },
  { key: 'holdingGain', label: '持有收益' },
  { key: 'amountShares', label: '金额/份额' },
  { key: 'dailyChange', label: '当日涨幅' },
  { key: 'dailyGain', label: '当日收益' },
  { key: 'sector', label: '关联板块' },
  { key: 'cost', label: '成本/最新' }
]

// ==================== 计算属性 ====================

const isSyncing = computed(() => syncStore.isSyncing)

// ==================== 初始化 ====================

onMounted(async () => {
  privacyMode.value = settingStore.privacyMode
  grayscaleMode.value = settingStore.grayscaleMode
  theme.value = settingStore.theme
  refreshInterval.value = settingStore.refreshInterval
  jsonboxName.value = settingStore.jsonboxName
  visibleColumns.value = [...settingStore.visibleColumns]
  columnOrderDraft.value = settingStore.columnOrder.filter(k => k !== 'name')

  await nextTick()
  initColumnSortable()
})

onUnmounted(() => {
  columnSortable?.destroy()
})

// ==================== 列排序 Sortable ====================

function initColumnSortable() {
  if (!columnSortRef.value) return
  columnSortable = Sortable.create(columnSortRef.value, {
    handle: '.drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      const item = columnOrderDraft.value.splice(oldIndex, 1)[0]!
      columnOrderDraft.value.splice(newIndex, 0, item)
      // 保存列顺序
      settingStore.setColumnOrder(['name', ...columnOrderDraft.value])
      storageService.saveSettings(settingStore.getSettings())
    }
  })
}

function columnLabel(key: string): string {
  return allColumns.find(c => c.key === key)?.label ?? key
}

// ==================== 显示设置 ====================

async function handlePrivacyModeChange(value: boolean) {
  await settingStore.setPrivacyMode(value)
  storageService.saveSettings(settingStore.getSettings())
}

async function handleGrayscaleModeChange(value: boolean) {
  await settingStore.setGrayscaleMode(value)
  document.documentElement.dataset.grayscale = String(value)
  storageService.saveSettings(settingStore.getSettings())
}

async function handleThemeChange(value: 'light' | 'dark') {
  await settingStore.setTheme(value)
  document.documentElement.dataset.theme = value
  storageService.saveSettings(settingStore.getSettings())
}

async function handleRefreshIntervalChange(value: number) {
  await settingStore.setRefreshInterval(value)
  storageService.saveSettings(settingStore.getSettings())
}

function handleVisibleColumnsChange(cols: string[]) {
  settingStore.setVisibleColumns(cols)
  storageService.saveSettings(settingStore.getSettings())
}

// ==================== 数据同步 ====================

async function handleJsonboxNameChange() {
  if (jsonboxName.value) {
    await settingStore.setJsonboxName(jsonboxName.value)
  }
}

async function handleTestConnection() {
  if (!jsonboxName.value) {
    ElMessage.warning('请先输入 Box Name')
    return
  }
  testingConnection.value = true
  try {
    const ok = await syncService.testConnection()
    ElMessage[ok ? 'success' : 'error'](ok ? '连接成功' : '连接失败')
  } catch (e: any) {
    ElMessage.error('连接失败: ' + e.message)
  } finally {
    testingConnection.value = false
  }
}

async function handleSyncToCloud() {
  try {
    await syncService.syncToCloud()
    ElMessage.success('已上传到云端')
  } catch (e: any) {
    ElMessage.error('上传失败: ' + e.message)
  }
}

async function handleSyncFromCloud() {
  try {
    await syncService.syncFromCloud()
    ElMessage.success('已从云端下载')
  } catch (e: any) {
    ElMessage.error('下载失败: ' + e.message)
  }
}

// ==================== JSON 导入导出 ====================

function handleImportJson() {
  fileInputRef.value?.click()
}

async function onFileSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = '' // reset

  try {
    const text = await file.text()
    const raw = JSON.parse(text)
    const payload = normalizeImportData(raw)

    const fundCount = payload.funds?.length ?? 0
    const groupCount = payload.groups ? Object.keys(payload.groups).length : 0

    const action = await ElMessageBox.confirm(
      `检测到 ${fundCount} 个基金，${groupCount} 个分组。\n选择「覆盖」将清空当前数据后导入，选择「合并」仅追加不存在的基金。`,
      '导入确认',
      {
        distinguishCancelAndClose: true,
        confirmButtonText: '覆盖导入',
        cancelButtonText: '合并导入'
      }
    ).then(() => 'overwrite' as const).catch((action) => {
      if (action === 'cancel') return 'merge' as const
      return null
    })

    if (!action) return

    if (action === 'overwrite') {
      fundStore.clearFunds()
      groupStore.clearGroups()
    }

    // 导入基金
    if (Array.isArray(payload.funds)) {
      for (const f of payload.funds) {
        if (!f.code) continue
        const exists = fundStore.getFund(f.code)
        if (!exists) {
          fundStore.funds.push({ code: f.code, num: f.num || 0, cost: f.cost || 0, groupKey: f.groupKey })
        }
      }
    }

    // 导入分组
    if (payload.groups && typeof payload.groups === 'object' && !Array.isArray(payload.groups)) {
      groupStore.initGroupsFromObject(payload.groups, payload.groupOrder || [])
    }

    // 持久化
    storageService.saveFunds(fundStore.funds)
    const exported = groupStore.exportGroupsToObject()
    storageService.saveGroups(exported.groups, exported.groupOrder)

    ElMessage.success(`导入完成（${action === 'overwrite' ? '覆盖' : '合并'}模式）`)
  } catch (e: any) {
    if (e?.message) ElMessage.error('导入失败: ' + e.message)
  }
}

function normalizeImportData(raw: any): any {
  // 兼容旧格式：直接是 funds 数组
  if (Array.isArray(raw)) {
    return { funds: raw, groups: {}, groupOrder: [], settings: {} }
  }
  return raw
}

function handleExportJson() {
  const payload = {
    funds: fundStore.funds.map(f => ({ code: f.code, num: f.num, cost: f.cost, groupKey: f.groupKey })),
    groups: groupStore.exportGroupsToObject().groups,
    groupOrder: groupStore.exportGroupsToObject().groupOrder,
    settings: settingStore.getSettings(),
    version: 1,
    lastModified: Date.now(),
    clientId: 'web'
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  a.download = `fund-helper-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('已导出')
}

// ==================== 清空数据 ====================

async function handleClearAll() {
  try {
    await ElMessageBox.confirm('此操作将清空本地所有基金和分组数据，不可恢复。', '确认清空', { type: 'warning' })
    fundStore.clearFunds()
    groupStore.clearGroups()
    storageService.saveFunds([])
    storageService.saveGroups({}, [])
    ElMessage.success('已清空')
  } catch { /* cancel */ }
}
</script>

<style scoped>
.settings-page-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
}

.settings-page-header h2 {
  margin: 0;
  font-size: 18px;
}

.settings-main {
  padding: 16px;
  box-sizing: border-box;
}

.form-item-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.column-sort-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.column-sort-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin-bottom: 6px;
  background: var(--el-bg-color);
  font-size: 13px;
}

.column-sort-item .drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  user-select: none;
}

.column-sort-item .drag-handle:active {
  cursor: grabbing;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
}

:deep(.el-checkbox) {
  display: block;
  margin: 6px 0;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
