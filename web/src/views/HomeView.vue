<template>
  <div class="home-view">
    <el-container>
      <!-- 顶部资产展示区 -->
      <el-header class="asset-header" @click="toggleAssetVisibility">
        <div class="asset-card">
          <div class="asset-item">
            <div class="asset-label">资产总值</div>
            <div class="asset-value">{{ formatAsset(totalAsset) }}</div>
          </div>
          <div class="asset-item">
            <div class="asset-label">持有收益</div>
            <div class="asset-value" :class="getValueClass(totalHoldingGain)">
              {{ formatAsset(totalHoldingGain) }}
            </div>
          </div>
          <div class="asset-item">
            <div class="asset-label">日收益</div>
            <div class="asset-value" :class="getValueClass(totalDailyGain)">
              {{ formatAsset(totalDailyGain) }}
            </div>
          </div>
        </div>
        <div class="asset-hint">点击切换显示/隐藏</div>
      </el-header>

      <!-- 分组管理区 -->
      <div class="group-tabs">
        <el-scrollbar>
          <div class="group-tabs-inner">
            <el-tag
              :type="selectedGroupKey === 'all' ? 'primary' : 'info'"
              class="group-tag"
              @click="selectGroup('all')"
              @contextmenu.prevent="() => {}"
            >
              全部 ({{ fundStore.fundCount }})
            </el-tag>
            
            <el-tag
              v-for="group in groupList"
              :key="group.key"
              :type="selectedGroupKey === group.key ? 'primary' : 'info'"
              class="group-tag"
              @click="selectGroup(group.key)"
              @contextmenu.prevent="showGroupContextMenu(group)"
            >
              {{ group.name }} ({{ group.fundCodes.length }})
            </el-tag>
            
            <el-button
              type="primary"
              size="small"
              circle
              @click="showAddGroupDialog = true"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
        </el-scrollbar>
      </div>

      <!-- 基金列表区 -->
      <el-main class="fund-list-main" v-loading="loading">
        <div class="fund-list-header">
          <el-input
            v-model="searchQuery"
            placeholder="搜索基金代码或名称"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button type="primary" @click="showAddFundDialog = true">
            <el-icon><Plus /></el-icon>
            <span>添加基金</span>
          </el-button>
          <el-button @click="handleRefresh" :loading="refreshing">
            <el-icon><Refresh /></el-icon>
            <span>刷新</span>
          </el-button>
        </div>

        <el-table
          v-if="displayFunds.length > 0"
          :data="sortedFunds"
          stripe
          style="width: 100%"
          @sort-change="handleSortChange"
          @row-contextmenu="handleRowContextMenu"
        >
          <el-table-column prop="name" label="基金名称" width="200" fixed>
            <template #default="{ row }">
              <div class="fund-name-cell" @click="goToDetail(row.code)">
                <div class="fund-code">{{ row.code }}</div>
                <div class="fund-name">{{ row.name || '加载中...' }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('estimatedGain')"
            prop="estimatedGain"
            label="预计收益"
            width="120"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.estimatedGain)">
                {{ formatValue(row.estimatedGain) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('estimatedChange')"
            prop="estimatedChange"
            label="预计涨幅"
            width="100"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.estimatedChange)">
                {{ formatPercent(row.estimatedChange) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('holdingGainRate')"
            prop="holdingGainRate"
            label="持有收益率"
            width="110"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.holdingGainRate)">
                {{ formatPercent(row.holdingGainRate) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('holdingGain')"
            prop="holdingGain"
            label="持有收益"
            width="120"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.holdingGain)">
                {{ formatValue(row.holdingGain) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('dailyChange')"
            prop="changePercent"
            label="日涨幅"
            width="100"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.changePercent)">
                {{ formatPercent(row.changePercent) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('dailyGain')"
            prop="dailyGain"
            label="日收益"
            width="120"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              <span :class="getValueClass(row.dailyGain)">
                {{ formatValue(row.dailyGain) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('amountShares')"
            prop="num"
            label="持有份额"
            width="120"
            align="right"
          >
            <template #default="{ row }">
              {{ formatNumber(row.num) }}
            </template>
          </el-table-column>

          <el-table-column
            v-if="isColumnVisible('cost')"
            prop="cost"
            label="成本价"
            width="100"
            sortable="custom"
            align="right"
          >
            <template #default="{ row }">
              {{ formatNumber(row.cost, 4) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="editFund(row)">
                编辑
              </el-button>
              <el-button type="danger" size="small" @click="confirmDeleteFund(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-empty v-else description="暂无基金数据，点击上方按钮添加基金" />
      </el-main>

      <!-- 底部导航 -->
      <el-footer class="bottom-nav">
        <el-menu mode="horizontal" :default-active="'/'" router>
          <el-menu-item index="/">
            <el-icon><HomeFilled /></el-icon>
            <span>首页</span>
          </el-menu-item>
          <el-menu-item index="/market">
            <el-icon><TrendCharts /></el-icon>
            <span>行情</span>
          </el-menu-item>
          <el-menu-item index="/settings">
            <el-icon><Setting /></el-icon>
            <span>设置</span>
          </el-menu-item>
        </el-menu>
      </el-footer>
    </el-container>

    <!-- 添加基金对话框 -->
    <el-dialog v-model="showAddFundDialog" title="添加基金" width="90%" :close-on-click-modal="false">
      <el-form :model="fundForm" :rules="fundFormRules" ref="fundFormRef" label-width="100px">
        <el-form-item label="基金代码" prop="code">
          <el-input v-model="fundForm.code" placeholder="请输入6位基金代码" maxlength="6" />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input v-model.number="fundForm.num" type="number" placeholder="请输入持有份额" />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input v-model.number="fundForm.cost" type="number" placeholder="请输入成本价" />
        </el-form-item>
        <el-form-item label="所属分组" prop="groupKey">
          <el-select v-model="fundForm.groupKey" placeholder="请选择分组（可选）" clearable>
            <el-option
              v-for="group in groupList"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddFundDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddFund" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑基金对话框 -->
    <el-dialog v-model="showEditFundDialog" title="编辑基金" width="90%" :close-on-click-modal="false">
      <el-form :model="editFundForm" :rules="fundFormRules" ref="editFundFormRef" label-width="100px">
        <el-form-item label="基金代码">
          <el-input v-model="editFundForm.code" disabled />
        </el-form-item>
        <el-form-item label="基金名称">
          <el-input v-model="editFundForm.name" disabled />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input v-model.number="editFundForm.num" type="number" placeholder="请输入持有份额" />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input v-model.number="editFundForm.cost" type="number" placeholder="请输入成本价" />
        </el-form-item>
        <el-form-item label="所属分组" prop="groupKey">
          <el-select v-model="editFundForm.groupKey" placeholder="请选择分组（可选）" clearable>
            <el-option
              v-for="group in groupList"
              :key="group.key"
              :label="group.name"
              :value="group.key"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditFundDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEditFund" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加分组对话框 -->
    <el-dialog v-model="showAddGroupDialog" title="添加分组" width="90%" :close-on-click-modal="false">
      <el-form :model="groupForm" :rules="groupFormRules" ref="groupFormRef" label-width="100px">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="请输入分组名称" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroupDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAddGroup" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog v-model="showEditGroupDialog" title="编辑分组" width="90%" :close-on-click-modal="false">
      <el-form :model="editGroupForm" :rules="groupFormRules" ref="editGroupFormRef" label-width="100px">
        <el-form-item label="分组名称" prop="name">
          <el-input v-model="editGroupForm.name" placeholder="请输入分组名称" maxlength="50" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditGroupDialog = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteGroup">删除分组</el-button>
        <el-button type="primary" @click="handleEditGroup" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Refresh, HomeFilled, TrendCharts, Setting } from '@element-plus/icons-vue'
import { useFundStore, useGroupStore, useSettingStore } from '@/stores'
import { fundService, groupService } from '@/services'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'
import { validateFundCode, validateGroupName } from '@/utils/validate'
import type { Group, FundView } from '@/types'

const router = useRouter()
const fundStore = useFundStore()
const groupStore = useGroupStore()
const settingStore = useSettingStore()

// 状态
const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const searchQuery = ref('')
const selectedGroupKey = ref('all')

// 对话框显示状态
const showAddFundDialog = ref(false)
const showEditFundDialog = ref(false)
const showAddGroupDialog = ref(false)
const showEditGroupDialog = ref(false)

// 表单数据
const fundForm = ref({ code: '', num: 0, cost: 0, groupKey: '' })
const editFundForm = ref({ code: '', name: '', num: 0, cost: 0, groupKey: '' })
const groupForm = ref({ name: '' })
const editGroupForm = ref({ key: '', name: '' })

// 表单引用
const fundFormRef = ref<FormInstance>()
const editFundFormRef = ref<FormInstance>()
const groupFormRef = ref<FormInstance>()
const editGroupFormRef = ref<FormInstance>()

// 表单验证规则
const fundFormRules: FormRules = {
  code: [
    { required: true, message: '请输入基金代码', trigger: 'blur' },
    { validator: (_rule, value, callback) => {
      if (!validateFundCode(value)) {
        callback(new Error('基金代码必须是6位数字'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ],
  num: [
    { required: true, message: '请输入持有份额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '持有份额必须大于0', trigger: 'blur' }
  ],
  cost: [
    { required: true, message: '请输入成本价', trigger: 'blur' },
    { type: 'number', min: 0.0001, message: '成本价必须大于0', trigger: 'blur' }
  ]
}

const groupFormRules: FormRules = {
  name: [
    { required: true, message: '请输入分组名称', trigger: 'blur' },
    { validator: (_rule, value, callback) => {
      if (!validateGroupName(value)) {
        callback(new Error('分组名称长度为1-50个字符'))
      } else {
        callback()
      }
    }, trigger: 'blur' }
  ]
}

// 计算属性
const totalAsset = computed(() => fundStore.getTotalAsset)
const totalHoldingGain = computed(() => fundStore.getTotalHoldingGain)
const totalDailyGain = computed(() => fundStore.getTotalDailyGain)
const groupList = computed(() => groupStore.getGroupList)

const displayFunds = computed(() => {
  let funds = fundStore.getAllFundViews
  
  // 按分组筛选
  if (selectedGroupKey.value !== 'all') {
    funds = funds.filter(f => f.groupKey === selectedGroupKey.value)
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    funds = funds.filter(f => 
      f.code.includes(query) || 
      (f.name && f.name.toLowerCase().includes(query))
    )
  }
  
  return funds
})

const sortedFunds = computed(() => {
  return fundService.sortFunds(
    displayFunds.value,
    fundStore.sortConfig.field,
    fundStore.sortConfig.order
  )
})

// 方法
const formatAsset = (value: number) => {
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode)
}

const formatValue = (value: number | undefined) => {
  if (value === undefined) return '-'
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode)
}

const formatPercent = (value: number | undefined) => {
  if (value === undefined) return '-'
  const formatted = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  return formatPrivacy(formatted, settingStore.privacyMode)
}

const getValueClass = (value: number | undefined) => {
  if (value === undefined || settingStore.grayscaleMode) return ''
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

const isColumnVisible = (column: string) => {
  return settingStore.visibleColumns.includes(column)
}

const toggleAssetVisibility = () => {
  settingStore.setPrivacyMode(!settingStore.privacyMode)
}

const selectGroup = (key: string) => {
  selectedGroupKey.value = key
  fundStore.setSelectedGroupKey(key)
}

const handleSearch = () => {
  fundStore.setSearchQuery(searchQuery.value)
}

const handleSortChange = ({ prop, order }: any) => {
  if (order) {
    fundStore.setSortConfig(prop, order === 'ascending' ? 'asc' : 'desc')
  }
}

const handleRefresh = async () => {
  refreshing.value = true
  try {
    await fundService.refreshAllFunds()
    ElMessage.success('刷新成功')
  } catch (error: any) {
    ElMessage.error('刷新失败: ' + error.message)
  } finally {
    refreshing.value = false
  }
}

const goToDetail = (code: string) => {
  router.push(`/fund/${code}`)
}

const editFund = (fund: FundView) => {
  editFundForm.value = {
    code: fund.code,
    name: fund.name || '',
    num: fund.num,
    cost: fund.cost,
    groupKey: fund.groupKey || ''
  }
  showEditFundDialog.value = true
}

const confirmDeleteFund = async (fund: FundView) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除基金 ${fund.name || fund.code} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await fundService.deleteFund(fund.code)
    ElMessage.success('删除成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleAddFund = async () => {
  if (!fundFormRef.value) return
  
  await fundFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await fundService.addFund(
        fundForm.value.code,
        fundForm.value.num,
        fundForm.value.cost,
        fundForm.value.groupKey || undefined
      )
      ElMessage.success('添加成功')
      showAddFundDialog.value = false
      fundForm.value = { code: '', num: 0, cost: 0, groupKey: '' }
      fundFormRef.value?.resetFields()
    } catch (error: any) {
      ElMessage.error('添加失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

const handleEditFund = async () => {
  if (!editFundFormRef.value) return
  
  await editFundFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await fundService.updateFund(
        editFundForm.value.code,
        editFundForm.value.num,
        editFundForm.value.cost,
        editFundForm.value.groupKey || undefined
      )
      ElMessage.success('保存成功')
      showEditFundDialog.value = false
    } catch (error: any) {
      ElMessage.error('保存失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

const handleAddGroup = async () => {
  if (!groupFormRef.value) return
  
  await groupFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await groupService.addGroup(groupForm.value.name)
      ElMessage.success('添加成功')
      showAddGroupDialog.value = false
      groupForm.value = { name: '' }
      groupFormRef.value?.resetFields()
    } catch (error: any) {
      ElMessage.error('添加失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

const showGroupContextMenu = (group: Group) => {
  editGroupForm.value = {
    key: group.key,
    name: group.name
  }
  showEditGroupDialog.value = true
}

const handleEditGroup = async () => {
  if (!editGroupFormRef.value) return
  
  await editGroupFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    submitting.value = true
    try {
      await groupService.updateGroup(editGroupForm.value.key, editGroupForm.value.name)
      ElMessage.success('保存成功')
      showEditGroupDialog.value = false
    } catch (error: any) {
      ElMessage.error('保存失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

const confirmDeleteGroup = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除分组 ${editGroupForm.value.name} 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await groupService.deleteGroup(editGroupForm.value.key)
    ElMessage.success('删除成功')
    showEditGroupDialog.value = false
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleRowContextMenu = (row: FundView, _column: any, event: MouseEvent) => {
  event.preventDefault()
  editFund(row)
}

// 生命周期
onMounted(() => {
  selectedGroupKey.value = fundStore.selectedGroupKey
})
</script>

<style scoped>
.home-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.asset-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  cursor: pointer;
  user-select: none;
  --el-header-height: 120px;
}

.asset-card {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.asset-item {
  text-align: center;
}

.asset-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.asset-value {
  font-size: 24px;
  font-weight: bold;
}

.asset-hint {
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
  margin-top: 10px;
}

.group-tabs {
  padding: 10px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.group-tabs-inner {
  display: flex;
  gap: 10px;
  align-items: center;
}

.group-tag {
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.fund-list-main {
  flex: 1;
  overflow: auto;
}

.fund-list-header {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.fund-list-header .el-input {
  flex: 1;
}

.fund-name-cell {
  cursor: pointer;
}

.fund-name-cell:hover {
  color: var(--el-color-primary);
}

.fund-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.fund-name {
  font-size: 14px;
  font-weight: 500;
}

.positive {
  color: #67c23a;
}

.negative {
  color: #f56c6c;
}

.bottom-nav {
  height: 60px;
  padding: 0;
  border-top: 1px solid var(--el-border-color);
}

.bottom-nav :deep(.el-menu) {
  border: none;
}

.bottom-nav :deep(.el-menu-item) {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
}

@media (max-width: 768px) {
  .asset-value {
    font-size: 18px;
  }
  
  .fund-list-header {
    flex-wrap: wrap;
  }
  
  .fund-list-header .el-input {
    flex: 1 1 100%;
  }
}
</style>
