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

          <el-form-item label="列配置">
            <div class="form-item-tip" style="margin-bottom:8px">勾选显示，取消隐藏；拖动 ☰ 或点击箭头调整顺序</div>
            <ul ref="columnSortRef" class="column-settings-list">
              <li
                v-for="(col, index) in columnOrderDraft"
                :key="col.key"
                :data-key="col.key"
                class="column-settings-item"
                :class="{ fixed: col.key === 'name' }"
                @click="col.key !== 'name' && toggleColVisible(index, !col.visible)"
              >
                <span class="drag-handle" :class="{ disabled: col.key === 'name' }">☰</span>
                <el-checkbox
                  :model-value="col.visible"
                  :disabled="col.key === 'name'"
                  @click.stop
                  @update:model-value="toggleColVisible(index, $event as boolean)"
                />
                <span class="col-label">{{ col.label }}</span>
                <template v-if="col.key === 'name'">
                  <span class="col-fixed-tag">(固定)</span>
                </template>
                <template v-else>
                  <el-button size="small" link :disabled="index <= 1" @click.stop="moveColUp(index)">↑</el-button>
                  <el-button size="small" link :disabled="index >= columnOrderDraft.length - 1" @click.stop="moveColDown(index)">↓</el-button>
                </template>
              </li>
            </ul>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <el-button @click="resetColumnSettings">恢复默认</el-button>
              <el-button type="primary" @click="saveColumnSettings">保存</el-button>
            </div>
          </el-form-item>

          <el-divider content-position="left">数据同步</el-divider>
          
          <el-form-item label="Box Name">
            <el-input
              v-model="jsonboxName"
              placeholder="fundhelper_xxxxxxxx"
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
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <div class="form-item-tip">字母数字下划线，至少20字符</div>
              <el-button size="small" link type="primary" @click="handleRegenerateBoxName">重新生成</el-button>
            </div>
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
              <el-button @click="showSyncDialog = true">
                📱 扫码/二维码
              </el-button>
              <el-button
                @click="handleOpenJsonLink"
                :disabled="!jsonboxName"
              >
                🔗 查看JSON
              </el-button>
              <el-button
                type="danger"
                plain
                @click="handleClearRemote"
                :disabled="!jsonboxName"
              >
                清空远程
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

    <!-- 同步对话框 -->
    <SyncDialog v-model:visible="showSyncDialog" @synced="onSyncCompleted" />

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
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import SyncDialog from '@/components/SyncDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Upload, Download, Delete } from '@element-plus/icons-vue'
import Sortable from 'sortablejs'
import { useSettingStore, useFundStore, useGroupStore, useSyncStore } from '@/stores'
import { syncService } from '@/services'
import { storageService } from '@/services/storageService'
import { generateJsonboxName } from '@/utils/validate'

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
const showSyncDialog = ref(false)
const visibleColumns = ref<string[]>([])
const columnOrderDraft = ref<{ key: string; label: string; visible: boolean }[]>([])

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
  buildColumnDraft()

  await nextTick()
  initColumnSortable()
})

onUnmounted(() => {
  columnSortable?.destroy()
})

// ==================== 列排序 Sortable ====================

function buildColumnDraft() {
  const order = settingStore.columnOrder
  const vis = new Set(settingStore.visibleColumns)
  const seen = new Set<string>()
  const result: { key: string; label: string; visible: boolean }[] = []

  for (const key of order) {
    const meta = allColumns.find(c => c.key === key)
    if (meta) {
      result.push({ key, label: meta.label, visible: key === 'name' || vis.has(key) })
      seen.add(key)
    }
  }
  for (const col of allColumns) {
    if (!seen.has(col.key)) {
      result.push({ key: col.key, label: col.label, visible: col.key === 'name' || vis.has(col.key) })
    }
  }
  columnOrderDraft.value = result
}

function initColumnSortable() {
  if (!columnSortRef.value) return
  columnSortable = Sortable.create(columnSortRef.value, {
    handle: '.drag-handle:not(.disabled)',
    animation: 200,
    ghostClass: 'sortable-ghost',
    filter: '.fixed',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      if (newIndex === 0) {
        // Revert: can't move to position 0 (name is fixed)
        const item = columnOrderDraft.value.splice(newIndex, 1)[0]!
        columnOrderDraft.value.splice(oldIndex, 0, item)
        return
      }
      const item = columnOrderDraft.value.splice(oldIndex, 1)[0]!
      columnOrderDraft.value.splice(newIndex, 0, item)
    }
  })
}

function toggleColVisible(index: number, value: boolean) {
  const item = columnOrderDraft.value[index]
  if (item && item.key !== 'name') {
    item.visible = value
  }
}

function moveColUp(index: number) {
  if (index <= 1) return
  const arr = columnOrderDraft.value
  const item = arr.splice(index, 1)[0]!
  arr.splice(index - 1, 0, item)
}

function moveColDown(index: number) {
  if (index >= columnOrderDraft.value.length - 1) return
  const arr = columnOrderDraft.value
  const item = arr.splice(index, 1)[0]!
  arr.splice(index + 1, 0, item)
}

function resetColumnSettings() {
  const defaultVisible = ['name', 'estimatedGain', 'estimatedChange', 'holdingGainRate', 'holdingGain', 'amountShares', 'dailyChange', 'dailyGain', 'sector', 'cost']
  columnOrderDraft.value = allColumns.map(col => ({
    key: col.key,
    label: col.label,
    visible: defaultVisible.includes(col.key)
  }))
}

function saveColumnSettings() {
  const newOrder = columnOrderDraft.value.map(d => d.key)
  const newVisible = columnOrderDraft.value.filter(d => d.visible).map(d => d.key)
  settingStore.setColumnOrder(newOrder)
  settingStore.setVisibleColumns(newVisible)
  storageService.saveSettings(settingStore.getSettings())
  ElMessage.success('列配置已保存')
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

// ==================== 数据同步 ====================

async function handleJsonboxNameChange() {
  if (jsonboxName.value) {
    await settingStore.setJsonboxName(jsonboxName.value)
  }
}

function handleRegenerateBoxName() {
  const name = generateJsonboxName()
  jsonboxName.value = name
  settingStore.setJsonboxName(name)
  storageService.saveSettings(settingStore.getSettings())
  ElMessage.success('已重新生成 Box Name')
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

function handleOpenJsonLink() {
  if (!jsonboxName.value) {
    ElMessage.warning('请先配置 Box Name')
    return
  }
  const url = `https://jsonbox.cloud.exo-imaging.com/${jsonboxName.value}`
  window.open(url, '_blank')
}

async function handleClearRemote() {
  if (!jsonboxName.value) return
  try {
    await ElMessageBox.confirm('确定清空远程配置？此操作不可恢复。', '确认', { type: 'warning' })
    await syncService.resetBox()
    ElMessage.success('远程配置已清空')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

function onSyncCompleted() {
  // Refresh local state after sync
  jsonboxName.value = settingStore.jsonboxName
  privacyMode.value = settingStore.privacyMode
  grayscaleMode.value = settingStore.grayscaleMode
  refreshInterval.value = settingStore.refreshInterval
  buildColumnDraft()
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
      // Map fund groupKey based on imported groups
      for (const [groupName, codes] of Object.entries(payload.groups as Record<string, string[]>)) {
        const group = groupStore.getGroupList.find(g => g.name === groupName)
        if (group) {
          for (const code of codes) {
            const fund = fundStore.getFund(code)
            if (fund) fund.groupKey = group.key
          }
        }
      }
    }

    // 导入列设置（VSCode 格式）
    if (payload.columnSettings) {
      if (payload.columnSettings.columnOrder) {
        settingStore.setColumnOrder(payload.columnSettings.columnOrder)
      }
      if (payload.columnSettings.visibleColumns) {
        settingStore.setVisibleColumns(payload.columnSettings.visibleColumns)
      }
    }

    // 导入其他设置
    if (payload.privacyMode !== undefined) {
      settingStore.setPrivacyMode(payload.privacyMode)
      privacyMode.value = payload.privacyMode
    }
    if (payload.grayscaleMode !== undefined) {
      settingStore.setGrayscaleMode(payload.grayscaleMode)
      grayscaleMode.value = payload.grayscaleMode
      document.documentElement.dataset.grayscale = String(payload.grayscaleMode)
    }
    if (payload.refreshInterval !== undefined) {
      settingStore.setRefreshInterval(payload.refreshInterval)
      refreshInterval.value = payload.refreshInterval
    }
    if (payload.sortMethod && typeof payload.sortMethod === 'string') {
      // Map VSCode sortMethod format to web format
      const sortMethodMap: Record<string, string> = {
        'default': 'holdingGainRate_desc',
        'changePercent_desc': 'estimatedChange_desc',
        'changePercent_asc': 'estimatedChange_asc',
        'dailyGain_desc': 'dailyGain_desc',
        'dailyGain_asc': 'dailyGain_asc',
        'holdingAmount_desc': 'amountShares_desc',
        'holdingAmount_asc': 'amountShares_asc',
        'holdingGain_desc': 'holdingGain_desc',
        'holdingGain_asc': 'holdingGain_asc',
        'holdingGainRate_desc': 'holdingGainRate_desc',
        'holdingGainRate_asc': 'holdingGainRate_asc'
      }
      const mapped = sortMethodMap[payload.sortMethod] || payload.sortMethod
      const parts = mapped.split('_')
      if (parts.length >= 2) {
        fundStore.setSortConfig(parts[0]!, parts[1] as 'asc' | 'desc')
      }
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
    return { funds: raw, groups: {}, groupOrder: [], columnSettings: null }
  }

  // Normalize funds: VSCode version uses string num/cost
  if (Array.isArray(raw.funds)) {
    raw.funds = raw.funds.map((f: any) => ({
      code: f.code,
      num: parseFloat(f.num) || 0,
      cost: parseFloat(f.cost) || 0
    }))
  }

  return raw
}

function handleExportJson() {
  const payload = {
    funds: fundStore.funds.map(f => ({
      code: f.code,
      num: String(f.num),
      cost: String(f.cost)
    })),
    groups: groupStore.exportGroupsToObject().groups,
    groupOrder: groupStore.getGroupList.map(g => g.name),
    columnSettings: {
      columnOrder: settingStore.columnOrder,
      visibleColumns: settingStore.visibleColumns
    },
    sortMethod: `${fundStore.sortConfig.field}_${fundStore.sortConfig.order}`,
    refreshInterval: settingStore.refreshInterval,
    hideStatusBar: false,
    defaultViewMode: 'webview',
    privacyMode: settingStore.privacyMode,
    grayscaleMode: settingStore.grayscaleMode
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  a.download = `fund-helper-config-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
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
  color: var(--text-primary);
  font-weight: 600;
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

.column-settings-list {
  list-style: none;
  padding: 0;
  margin: 0;
  width: 100%;
}

.column-settings-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  margin-bottom: 6px;
  background: var(--el-bg-color);
  font-size: 13px;
  transition: background 0.15s;
  cursor: pointer;
  user-select: none;
}

.column-settings-item.fixed {
  background: var(--el-fill-color-light);
}

.column-settings-item .drag-handle {
  cursor: grab;
  color: var(--el-text-color-secondary);
  user-select: none;
  font-size: 14px;
}

.column-settings-item .drag-handle.disabled {
  cursor: default;
  opacity: 0.3;
}

.column-settings-item .drag-handle:not(.disabled):active {
  cursor: grabbing;
}

.column-settings-item .col-label {
  flex: 1;
}

.column-settings-item .col-fixed-tag {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
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
