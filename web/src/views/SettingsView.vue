<template>
  <div class="settings-view">
    <el-container>
      <el-header>
        <h2>设置</h2>
      </el-header>

      <el-main>
        <el-form label-width="120px">
          <el-divider content-position="left">显示设置</el-divider>
          
          <el-form-item label="隐私模式">
            <el-switch
              v-model="privacyMode"
              @change="handlePrivacyModeChange"
            />
            <div class="form-item-tip">开启后隐藏所有数值</div>
          </el-form-item>

          <el-form-item label="灰色模式">
            <el-switch
              v-model="grayscaleMode"
              @change="handleGrayscaleModeChange"
            />
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

          <el-divider content-position="left">数据同步</el-divider>
          
          <el-form-item label="JSONBox名称">
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
            <div class="form-item-tip">用于云端数据同步</div>
          </el-form-item>

          <el-form-item label="同步状态">
            <div class="sync-status">
              <el-tag 
                :type="syncStatusType" 
                :icon="syncStatusIcon"
              >
                {{ syncStatusText }}
              </el-tag>
              <span v-if="lastSyncTime" class="sync-time">
                最后同步: {{ formatRelativeTime(lastSyncTime) }}
              </span>
            </div>
            <div v-if="syncError" class="sync-error">
              <el-alert type="error" :closable="false">
                {{ syncError }}
              </el-alert>
            </div>
          </el-form-item>

          <el-form-item label="同步操作">
            <el-space>
              <el-button 
                type="primary" 
                :icon="Upload"
                @click="handleSyncToCloud"
                :loading="isSyncing"
                :disabled="!jsonboxName"
              >
                上传到云端
              </el-button>
              <el-button 
                :icon="Download"
                @click="handleSyncFromCloud"
                :loading="isSyncing"
                :disabled="!jsonboxName"
              >
                从云端下载
              </el-button>
              <el-button 
                :icon="Refresh"
                @click="handleFullSync"
                :loading="isSyncing"
                :disabled="!jsonboxName"
              >
                完整同步
              </el-button>
            </el-space>
          </el-form-item>

          <el-form-item label="危险操作">
            <el-button 
              type="danger" 
              :icon="Delete"
              @click="handleResetBox"
              :disabled="!jsonboxName"
              plain
            >
              重置云端数据
            </el-button>
            <div class="form-item-tip">清空云端所有数据，不可恢复</div>
          </el-form-item>

          <el-divider content-position="left">列表配置</el-divider>

          <el-form-item label="可见列">
            <el-button @click="showColumnSettings = true">
              配置列显示
            </el-button>
          </el-form-item>

          <el-divider content-position="left">关于</el-divider>
          
          <el-form-item label="版本">
            <span>1.0.0</span>
          </el-form-item>

          <el-form-item label="数据来源">
            <span>天天基金</span>
          </el-form-item>
        </el-form>
      </el-main>

      <el-footer class="bottom-nav">
        <el-menu mode="horizontal" :default-active="'/settings'" router>
          <el-menu-item index="/">首页</el-menu-item>
          <el-menu-item index="/market">行情</el-menu-item>
          <el-menu-item index="/settings">设置</el-menu-item>
        </el-menu>
      </el-footer>
    </el-container>

    <!-- 数据冲突对话框 -->
    <el-dialog
      v-model="showConflictDialog"
      title="数据冲突"
      width="90%"
      :close-on-click-modal="false"
    >
      <el-alert type="warning" :closable="false" style="margin-bottom: 20px;">
        检测到本地数据与云端数据不一致，请选择使用哪个版本的数据
      </el-alert>
      
      <el-descriptions :column="1" border>
        <el-descriptions-item label="本地版本">
          {{ dataConflict?.localVersion }}
        </el-descriptions-item>
        <el-descriptions-item label="云端版本">
          {{ dataConflict?.cloudVersion }}
        </el-descriptions-item>
        <el-descriptions-item label="冲突时间">
          {{ dataConflict ? formatDateTime(dataConflict.timestamp) : '' }}
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-space>
          <el-button @click="handleResolveConflict('cloud')">
            使用云端版本
          </el-button>
          <el-button type="primary" @click="handleResolveConflict('local')">
            使用本地版本
          </el-button>
        </el-space>
      </template>
    </el-dialog>

    <!-- 列配置对话框 -->
    <el-dialog
      v-model="showColumnSettings"
      title="列显示配置"
      width="90%"
    >
      <el-checkbox-group v-model="visibleColumns">
        <el-checkbox 
          v-for="col in allColumns" 
          :key="col.key"
          :label="col.key"
          :disabled="col.key === 'name'"
        >
          {{ col.label }}
        </el-checkbox>
      </el-checkbox-group>

      <template #footer>
        <el-space>
          <el-button @click="showColumnSettings = false">取消</el-button>
          <el-button type="primary" @click="handleSaveColumnSettings">
            保存
          </el-button>
        </el-space>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Connection, 
  Upload, 
  Download, 
  Refresh, 
  Delete,
  CircleCheck,
  CircleClose,
  Loading
} from '@element-plus/icons-vue'
import { useSettingStore, useSyncStore } from '@/stores'
import { syncService } from '@/services'
import { formatRelativeTime, formatDateTime } from '@/utils/format'

const settingStore = useSettingStore()
const syncStore = useSyncStore()

// 响应式数据
const privacyMode = ref(false)
const grayscaleMode = ref(false)
const theme = ref<'light' | 'dark'>('light')
const refreshInterval = ref(20)
const jsonboxName = ref('')
const testingConnection = ref(false)
const showConflictDialog = ref(false)
const showColumnSettings = ref(false)
const visibleColumns = ref<string[]>([])

// 所有可用列
const allColumns = [
  { key: 'name', label: '基金名称' },
  { key: 'estimatedGain', label: '预计收益' },
  { key: 'estimatedChange', label: '预计涨幅' },
  { key: 'holdingGainRate', label: '持有收益率' },
  { key: 'holdingGain', label: '持有收益' },
  { key: 'amountShares', label: '持有份额' },
  { key: 'dailyChange', label: '日涨幅' },
  { key: 'dailyGain', label: '日收益' },
  { key: 'sector', label: '所属分类' },
  { key: 'cost', label: '成本价' }
]

// 计算属性
const isSyncing = computed(() => syncStore.isSyncing)
const lastSyncTime = computed(() => syncStore.lastSyncTime)
const syncError = computed(() => syncStore.syncError)
const dataConflict = computed(() => syncStore.dataConflict)

const syncStatusType = computed(() => {
  switch (syncStore.syncStatus) {
    case 'success':
      return 'success'
    case 'error':
      return 'danger'
    case 'syncing':
      return 'info'
    default:
      return 'info'
  }
})

const syncStatusIcon = computed(() => {
  switch (syncStore.syncStatus) {
    case 'success':
      return CircleCheck
    case 'error':
      return CircleClose
    case 'syncing':
      return Loading
    default:
      return undefined
  }
})

const syncStatusText = computed(() => {
  switch (syncStore.syncStatus) {
    case 'success':
      return '同步成功'
    case 'error':
      return '同步失败'
    case 'syncing':
      return '同步中...'
    default:
      return '未同步'
  }
})

// 初始化
onMounted(() => {
  privacyMode.value = settingStore.privacyMode
  grayscaleMode.value = settingStore.grayscaleMode
  theme.value = settingStore.theme
  refreshInterval.value = settingStore.refreshInterval
  jsonboxName.value = settingStore.jsonboxName
  visibleColumns.value = settingStore.settings.visibleColumns
  
  // 检查是否有数据冲突
  if (syncStore.hasConflict) {
    showConflictDialog.value = true
  }
})

// 处理函数
const handlePrivacyModeChange = async (value: boolean) => {
  await settingStore.setPrivacyMode(value)
  ElMessage.success('隐私模式已' + (value ? '开启' : '关闭'))
}

const handleGrayscaleModeChange = async (value: boolean) => {
  await settingStore.setGrayscaleMode(value)
  ElMessage.success('灰色模式已' + (value ? '开启' : '关闭'))
}

const handleThemeChange = async (value: 'light' | 'dark') => {
  await settingStore.setTheme(value)
  ElMessage.success('主题已切换')
}

const handleRefreshIntervalChange = async (value: number) => {
  await settingStore.setRefreshInterval(value)
  ElMessage.success('刷新间隔已更新')
}

const handleJsonboxNameChange = async () => {
  if (jsonboxName.value) {
    await settingStore.setJsonboxName(jsonboxName.value)
    ElMessage.success('JSONBox名称已更新')
  }
}

// 测试连接
const handleTestConnection = async () => {
  if (!jsonboxName.value) {
    ElMessage.warning('请先输入JSONBox名称')
    return
  }
  
  testingConnection.value = true
  try {
    const result = await syncService.testConnection()
    if (result) {
      ElMessage.success('连接成功')
    } else {
      ElMessage.error('连接失败')
    }
  } catch (error: any) {
    ElMessage.error('连接失败: ' + error.message)
  } finally {
    testingConnection.value = false
  }
}

// 上传到云端
const handleSyncToCloud = async () => {
  try {
    await syncService.syncToCloud()
    ElMessage.success('数据已上传到云端')
  } catch (error: any) {
    ElMessage.error('上传失败: ' + error.message)
  }
}

// 从云端下载
const handleSyncFromCloud = async () => {
  try {
    await syncService.syncFromCloud()
    
    // 检查是否有冲突
    if (syncStore.hasConflict) {
      showConflictDialog.value = true
    } else {
      ElMessage.success('数据已从云端下载')
    }
  } catch (error: any) {
    ElMessage.error('下载失败: ' + error.message)
  }
}

// 完整同步
const handleFullSync = async () => {
  try {
    await syncService.fullSync()
    
    // 检查是否有冲突
    if (syncStore.hasConflict) {
      showConflictDialog.value = true
    } else {
      ElMessage.success('同步完成')
    }
  } catch (error: any) {
    ElMessage.error('同步失败: ' + error.message)
  }
}

// 重置云端数据
const handleResetBox = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将清空云端所有数据，不可恢复。是否继续？',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await syncService.resetBox()
    ElMessage.success('云端数据已重置')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('重置失败: ' + error.message)
    }
  }
}

// 解决冲突
const handleResolveConflict = async (strategy: 'local' | 'cloud') => {
  try {
    await syncService.resolveConflict(strategy)
    showConflictDialog.value = false
    ElMessage.success(`已使用${strategy === 'local' ? '本地' : '云端'}版本`)
  } catch (error: any) {
    ElMessage.error('解决冲突失败: ' + error.message)
  }
}

// 保存列配置
const handleSaveColumnSettings = async () => {
  try {
    await settingStore.setVisibleColumns(visibleColumns.value)
    showColumnSettings.value = false
    ElMessage.success('列配置已保存')
  } catch (error: any) {
    ElMessage.error('保存失败: ' + error.message)
  }
}
</script>

<style scoped>
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.form-item-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
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

.sync-error {
  margin-top: 8px;
}

.bottom-nav {
  height: 60px;
  padding: 0;
  border-top: 1px solid var(--el-border-color);
}

:deep(.el-checkbox) {
  display: block;
  margin: 8px 0;
}
</style>
