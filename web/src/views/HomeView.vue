<template>
  <MainLayout>
    <template #header>
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
            >
              全部 ({{ fundStore.fundCount }})
            </el-tag>

            <el-tag
              v-for="group in groupList"
              :key="group.key"
              :type="selectedGroupKey === group.key ? 'primary' : 'info'"
              class="group-tag"
              @click="selectGroup(group.key)"
              @pointerdown="onGroupPointerDown(group, $event)"
              @pointerup="onGroupPointerUp"
              @pointerleave="onGroupPointerUp"
            >
              {{ group.name }} ({{ group.fundCodes.length }})
            </el-tag>
            
            <el-button size="small" @click="openGroupManage">
              管理分组
            </el-button>
            <el-button
              type="primary"
              size="small"
              circle
              title="新建分组"
              @click="showAddGroupDialog = true"
            >
              <el-icon><Plus /></el-icon>
            </el-button>
          </div>
        </el-scrollbar>
      </div>
    </template>

    <!-- 基金列表区 -->
    <div class="fund-list-main" v-loading="loading">
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

        <div v-if="sortedRows.length > 0" class="fund-table-wrap">
          <el-table
            class="fund-el-table"
            :data="sortedRows"
            row-key="code"
            border
            stripe
            table-layout="auto"
            :max-height="tableMaxHeight"
            :default-sort="defaultTableSort"
            @sort-change="handleTableSort"
            @row-contextmenu="onRowContextMenu"
          >
            <el-table-column
              v-if="isColumnVisible('name')"
              fixed="left"
              min-width="176"
              :resizable="false"
            >
              <template #header>
                <div class="col-head">
                  <span>基金名称</span>
                  <span class="col-head-sub">—</span>
                </div>
              </template>
              <template #default="{ row }">
                <div class="fund-name-cell">
                  <div class="fund-name-row" @click="openTooltip(row)">
                    <span v-if="row.showRealValueIcon" class="real-value-icon" title="已更新实际净值">✓</span>
                    <span class="fund-name">{{ row.name }}</span>
                  </div>
                  <div class="fund-code-row">
                    <span class="fund-code">{{ row.code }}</span>
                    <span v-if="showGroupTag && row.groupName" class="group-label">{{ row.groupName }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>

            <el-table-column
              v-for="col in tableBodyColumns"
              :key="col.key"
              :prop="col.sortProp"
              :sortable="col.sortProp ? 'custom' : false"
              :align="col.align || 'right'"
              :min-width="col.minWidth"
            >
              <template #header>
                <div class="col-head">
                  <span>{{ col.title }}</span>
                  <span class="col-head-sub">{{ headerSubLabel(col.key) }}</span>
                </div>
              </template>
              <template #default="{ row }">
                <template v-if="col.key === 'estimatedChange'">
                  <div class="cell-stack">
                    <div :class="estGainClass(row, row.gszzl)">{{ fmtPctRow(row.gszzl, row.shouldShowEstimated) }}</div>
                    <div class="td-sub">{{ row.fullUpdateTime || row.updateTime || '—' }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'estimatedGain'">
                  <div class="cell-stack">
                    <div :class="estGainClass(row, row.estimatedGain)">{{ fmtVal(row.estimatedGain, row.shouldShowEstimated) }}</div>
                    <div class="td-sub" :class="pctClass(row.gszzl)">{{ fmtPctRow(row.gszzl, row.shouldShowEstimated) }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'dailyChange'">
                  <div class="cell-stack">
                    <div :class="pctClass(row.navChgRt)">{{ fmtPctRow(row.navChgRt, true) }}</div>
                    <div class="td-sub muted">{{ row.navDateLabel }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'dailyGain'">
                  <div class="cell-stack">
                    <div :class="moneyClass(row.dailyGain)">{{ formatValue(row.dailyGain) }}</div>
                    <div class="td-sub muted">{{ row.navDateLabel }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'holdingGain'">
                  <div class="cell-stack">
                    <div :class="moneyClass(row.holdingGain)">{{ formatValue(row.holdingGain) }}</div>
                    <div class="td-sub" :class="pctClass(row.holdingGainRate)">{{ formatPercent(row.holdingGainRate) }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'holdingGainRate'">
                  <div class="cell-stack">
                    <div :class="pctClass(row.holdingGainRate)">{{ formatPercent(row.holdingGainRate) }}</div>
                    <div class="td-sub" :class="moneyClass(row.holdingGain)">{{ formatValue(row.holdingGain) }}</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'sector'">
                  <span>{{ row.relateTheme }}</span>
                </template>
                <template v-else-if="col.key === 'amountShares'">
                  <div class="cell-stack">
                    <div>{{ formatValue(row.holdingAmount) }}</div>
                    <div class="td-sub muted">{{ formatShares(row.fund.num) }} 份</div>
                  </div>
                </template>
                <template v-else-if="col.key === 'cost'">
                  <div class="cell-stack">
                    <div>{{ formatNumber(row.fund.cost, 4) }}</div>
                    <div class="td-sub muted">{{ formatNumber(row.dwjz, 4) }}</div>
                  </div>
                </template>
              </template>
            </el-table-column>

            <el-table-column fixed="right" label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button type="primary" size="small" link @click="editFundByRow(row)">编辑</el-button>
                <el-button type="danger" size="small" link @click="confirmDeleteByRow(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <el-empty v-else description="暂无基金数据，点击上方按钮添加基金" />

        <FundTooltip
          :visible="tooltipVisible"
          :row="tooltipRow"
          :privacy-mode="settingStore.privacyMode"
          @close="tooltipVisible = false"
          @detail="onTooltipDetail"
          @add-shares="onTooltipAdjust(true)"
          @reduce-shares="onTooltipAdjust(false)"
          @edit="onTooltipEdit"
          @set-group="onTooltipSetGroup"
          @delete="onTooltipDelete"
        />

        <el-dialog v-model="groupMenuVisible" title="分组操作" width="86%">
          <p>{{ groupMenuTarget?.name }}</p>
          <el-space direction="vertical" fill style="width:100%">
            <el-button @click="renameGroupFromMenu">重命名</el-button>
            <el-button type="danger" plain @click="deleteGroupFromMenu">删除分组</el-button>
            <el-button @click="openGroupManage">管理分组…</el-button>
          </el-space>
        </el-dialog>

        <el-dialog v-model="showGroupManageDialog" title="分组管理" width="90%">
          <p class="hint-text">
            拖拽 <strong>☰</strong> 手柄可排序分组；「重命名」修改名称后需点<strong>保存</strong>。删除立即生效。
          </p>
          <el-empty v-if="manageGroupDraft.length === 0" description="暂无自定义分组，点击右侧 + 新建" />
          <ul v-else ref="groupSortableRef" class="group-manage-list">
            <li v-for="g in manageGroupDraft" :key="g.key" :data-key="g.key" class="group-manage-item">
              <span class="drag-handle" title="拖拽排序">☰</span>
              <span class="g-name">{{ g.name }}</span>
              <span class="g-meta muted">{{ groupFundCount(g.key) }} 只基金</span>
              <el-button size="small" link type="primary" @click="renameDraftGroup(g)">重命名</el-button>
              <el-button size="small" link type="danger" @click="deleteDraftGroup(g)">删除</el-button>
            </li>
          </ul>
          <template #footer>
            <el-button @click="showGroupManageDialog = false">关闭</el-button>
            <el-button type="primary" :disabled="manageGroupDraft.length === 0" @click="saveGroupManage">
              保存
            </el-button>
          </template>
        </el-dialog>
    </div>

    <!-- 添加基金对话框 -->
    <el-dialog v-model="showAddFundDialog" title="添加基金" width="90%" :close-on-click-modal="false">
      <el-form :model="fundForm" :rules="fundFormRules" ref="fundFormRef" label-width="100px">
        <el-form-item label="搜索基金" prop="code">
          <div class="fund-search-field">
            <el-input
              v-model="fundForm.code"
              placeholder="输入代码或名称"
              maxlength="32"
              clearable
              @input="onFundSearchInput"
            />
            <div v-if="fundSearchResults.length" class="fund-search-dropdown">
              <div
                v-for="item in fundSearchResults"
                :key="item.code"
                class="fund-search-item"
                @click="pickSearchFund(item)"
              >
                <span class="code">{{ item.code }}</span>
                <span class="nm">{{ item.name }}</span>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item v-if="fundPickName" label="已选基金">
          <span>{{ fundPickName }}</span>
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
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import Sortable from 'sortablejs'
import MainLayout from '@/layouts/MainLayout.vue'
import FundTooltip from '@/components/FundTooltip.vue'
import { useFundStore, useGroupStore, useSettingStore } from '@/stores'
import { fundService, groupService } from '@/services'
import { searchFund } from '@/api/fundEastmoney'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'
import { validateFundCode, validateGroupName } from '@/utils/validate'
import type { Group, FundView } from '@/types'
import type { FundRowDisplay } from '@/utils/fundDisplay'

type TableColMeta = {
  title: string
  sortProp?: string
  minWidth: number
  align?: 'left' | 'right' | 'center'
}

const TABLE_COL_META: Record<string, TableColMeta> = {
  estimatedChange: { title: '估算涨幅', sortProp: 'estimatedChange', minWidth: 112, align: 'right' },
  estimatedGain: { title: '估算收益', sortProp: 'estimatedGain', minWidth: 116, align: 'right' },
  dailyChange: { title: '当日涨幅', sortProp: 'dailyChange', minWidth: 104, align: 'right' },
  dailyGain: { title: '当日收益', sortProp: 'dailyGain', minWidth: 116, align: 'right' },
  holdingGain: { title: '持有收益', sortProp: 'holdingGain', minWidth: 116, align: 'right' },
  holdingGainRate: { title: '总收益率', sortProp: 'holdingGainRate', minWidth: 108, align: 'right' },
  sector: { title: '关联板块', minWidth: 104, align: 'left' },
  amountShares: { title: '金额/份额', sortProp: 'amountShares', minWidth: 116, align: 'right' },
  cost: { title: '成本/最新', sortProp: 'cost', minWidth: 108, align: 'right' }
}

const tableMaxHeight = 'min(70vh, calc(100dvh - 260px))'

const router = useRouter()
const fundStore = useFundStore()
const groupStore = useGroupStore()
const settingStore = useSettingStore()

const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const searchQuery = ref('')
const selectedGroupKey = ref<'all' | string>('all')

const showAddFundDialog = ref(false)
const showEditFundDialog = ref(false)
const showAddGroupDialog = ref(false)
const showEditGroupDialog = ref(false)
const showGroupManageDialog = ref(false)
const groupMenuVisible = ref(false)
const groupMenuTarget = ref<Group | null>(null)
const manageGroupDraft = ref<{ key: string; name: string }[]>([])

const fundForm = ref({ code: '', num: 0, cost: 0, groupKey: '' })
const editFundForm = ref({ code: '', name: '', num: 0, cost: 0, groupKey: '' })
const groupForm = ref({ name: '' })
const editGroupForm = ref({ key: '', name: '' })

const fundFormRef = ref<FormInstance>()
const editFundFormRef = ref<FormInstance>()
const groupFormRef = ref<FormInstance>()
const editGroupFormRef = ref<FormInstance>()

const fundSearchResults = ref<{ code: string; name: string }[]>([])
const fundPickName = ref('')

const tooltipVisible = ref(false)
const tooltipRow = ref<FundRowDisplay | null>(null)

const groupSortableRef = ref<HTMLElement | null>(null)
let groupSortableInstance: Sortable | null = null

let groupPressTimer: ReturnType<typeof setTimeout> | null = null
const LONG_PRESS_MS = 520

const fundFormRules: FormRules = {
  code: [
    { required: true, message: '请选择或输入6位基金代码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (!validateFundCode(String(value).trim())) {
          callback(new Error('基金代码必须是6位数字'))
        } else callback()
      },
      trigger: 'blur'
    }
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
    {
      validator: (_rule, value, callback) => {
        if (!validateGroupName(value)) callback(new Error('分组名称长度为1-50个字符'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

const totalAsset = computed(() => fundStore.getTotalAsset)
const totalHoldingGain = computed(() => fundStore.getTotalHoldingGain)
const totalDailyGain = computed(() => fundStore.getTotalDailyGain)
const groupList = computed(() => groupStore.getGroupList)

const orderedVisibleColumns = computed(() => {
  const vis = new Set(settingStore.visibleColumns)
  const tail = settingStore.columnOrder.filter(k => k !== 'name' && vis.has(k))
  return ['name', ...tail]
})

const tableBodyColumns = computed(() =>
  orderedVisibleColumns.value
    .filter(k => k !== 'name')
    .map(key => {
      const meta = TABLE_COL_META[key]
      if (!meta) return null
      return { key, ...meta }
    })
    .filter((x): x is { key: string } & TableColMeta => x !== null)
)

const defaultTableSort = computed(() => ({
  prop: fundStore.sortConfig.field,
  order: fundStore.sortConfig.order === 'asc' ? ('ascending' as const) : ('descending' as const)
}))

const enrichedRows = computed(() => {
  return fundService.buildRowsForHome().map(row => ({
    ...row,
    groupName: row.fund.groupKey ? groupStore.getGroup(row.fund.groupKey)?.name : undefined
  }))
})

const filteredRows = computed(() => {
  let rows = enrichedRows.value
  if (selectedGroupKey.value !== 'all') {
    rows = rows.filter(r => r.fund.groupKey === selectedGroupKey.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(
      r => r.code.includes(q) || r.name.toLowerCase().includes(q)
    )
  }
  return rows
})

const sortedRows = computed(() =>
  fundService.sortFundRows(
    filteredRows.value,
    fundStore.sortConfig.field,
    fundStore.sortConfig.order
  )
)

const showGroupTag = computed(() => selectedGroupKey.value === 'all')

function headerSubLabel(col: string): string {
  const sample = sortedRows.value[0]
  if (!sample) return '—'
  switch (col) {
    case 'estimatedChange':
    case 'estimatedGain':
      return sample.estimatedDateLabel
    case 'dailyChange':
    case 'dailyGain':
    case 'holdingGain':
    case 'holdingGainRate':
    case 'amountShares':
    case 'cost':
      return sample.navDateLabel
    default:
      return '—'
  }
}

function handleTableSort(payload: { prop: string | null; order: string | null }) {
  const { prop, order } = payload
  if (!prop || order === null) {
    fundStore.setSortConfig('holdingGainRate', 'desc')
    return
  }
  fundStore.setSortConfig(prop, order === 'ascending' ? 'asc' : 'desc')
}

function onRowContextMenu(row: FundRowDisplay, _column: unknown, e: MouseEvent) {
  e.preventDefault()
  openTooltip(row)
}

function formatAsset(value: number) {
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode)
}

function formatValue(value: number | undefined) {
  if (value === undefined) return '-'
  return formatPrivacy(formatCurrency(value), settingStore.privacyMode)
}

function formatPercent(value: number | undefined) {
  if (value === undefined) return '-'
  const formatted = `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
  return formatPrivacy(formatted, settingStore.privacyMode)
}

function formatShares(n: number) {
  return formatPrivacy(formatNumber(n, 2), settingStore.privacyMode)
}

function getValueClass(value: number | undefined) {
  if (value === undefined || settingStore.grayscaleMode) return ''
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

function pctClass(v: number) {
  if (settingStore.grayscaleMode) return ''
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return 'muted'
}

function moneyClass(v: number) {
  return pctClass(v)
}

function estGainClass(row: FundRowDisplay, v: number) {
  if (!row.shouldShowEstimated || settingStore.grayscaleMode) return 'muted'
  return pctClass(v)
}

function fmtVal(v: number, show: boolean) {
  if (!show) return '—'
  return formatValue(v)
}

function fmtPctRow(v: number, show: boolean) {
  if (!show) return '—'
  return formatPercent(v)
}

const isColumnVisible = (column: string) =>
  column === 'name' || settingStore.visibleColumns.includes(column)

function toggleAssetVisibility() {
  settingStore.setPrivacyMode(!settingStore.privacyMode)
}

function selectGroup(key: string) {
  selectedGroupKey.value = key
  fundStore.setSelectedGroupKey(key)
}

function handleSearch() {
  fundStore.setSearchQuery(searchQuery.value)
}

async function handleRefresh() {
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

function editFund(fund: FundView) {
  editFundForm.value = {
    code: fund.code,
    name: fund.name || '',
    num: fund.num,
    cost: fund.cost,
    groupKey: fund.groupKey || ''
  }
  showEditFundDialog.value = true
}

function editFundByRow(row: FundRowDisplay) {
  editFund({ ...row.fund, name: row.name } as FundView)
}

async function confirmDeleteFund(fund: FundView) {
  try {
    await ElMessageBox.confirm(`确定要删除基金 ${fund.name || fund.code} 吗？`, '确认删除', {
      type: 'warning'
    })
    await fundService.deleteFund(fund.code)
    ElMessage.success('删除成功')
    tooltipVisible.value = false
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败: ' + error.message)
  }
}

function confirmDeleteByRow(row: FundRowDisplay) {
  confirmDeleteFund({ ...row.fund, name: row.name } as FundView)
}

function openTooltip(row: FundRowDisplay) {
  tooltipRow.value = row
  tooltipVisible.value = true
}

function onTooltipDetail() {
  if (!tooltipRow.value) return
  tooltipVisible.value = false
  router.push(`/fund/${tooltipRow.value.code}`)
}

async function onTooltipAdjust(isAdd: boolean) {
  const row = tooltipRow.value
  if (!row) return
  try {
    const { value } = await ElMessageBox.prompt(
      isAdd ? '买入份额（将增加持仓）' : '卖出份额（将减少持仓）',
      isAdd ? '加仓' : '减仓',
      { inputPattern: /^\d+(\.\d{1,2})?$/, inputErrorMessage: '请输入有效份额' }
    )
    const delta = parseFloat(value)
    const next = isAdd ? row.fund.num + delta : row.fund.num - delta
    if (next <= 0) {
      ElMessage.warning('卖出后份额必须大于0')
      return
    }
    await fundService.updateFund(row.code, next, row.fund.cost, row.fund.groupKey)
    await fundService.refreshAllFunds()
    ElMessage.success('已更新份额')
    tooltipVisible.value = false
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

function onTooltipEdit() {
  if (!tooltipRow.value) return
  editFundByRow(tooltipRow.value)
  tooltipVisible.value = false
}

async function onTooltipSetGroup() {
  const row = tooltipRow.value
  if (!row) return
  try {
    const { value } = await ElMessageBox.prompt(
      '输入分组名称（须已存在）或与下拉一致',
      '设置分组',
      {
        inputPlaceholder: groupList.value.map(g => g.name).join(' / ') || '无分组'
      }
    )
    const name = String(value).trim()
    const hit = groupList.value.find(g => g.name === name)
    if (!hit) {
      ElMessage.warning('未找到该分组，请先在分组区新建')
      return
    }
    await fundService.moveFundToGroup(row.code, hit.key)
    ElMessage.success('已更新分组')
    tooltipVisible.value = false
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '失败')
  }
}

function onTooltipDelete() {
  if (!tooltipRow.value) return
  confirmDeleteByRow(tooltipRow.value)
}

const debouncedSearchSuggest = useDebounceFn(async (q: string) => {
  if (!q.trim()) {
    fundSearchResults.value = []
    return
  }
  fundSearchResults.value = await searchFund(q.trim())
}, 300)

function onFundSearchInput() {
  fundPickName.value = ''
  debouncedSearchSuggest(fundForm.value.code)
}

function pickSearchFund(item: { code: string; name: string }) {
  fundForm.value.code = item.code
  fundPickName.value = `${item.code} ${item.name}`
  fundSearchResults.value = []
}

async function handleAddFund() {
  if (!fundFormRef.value) return
  fundForm.value.code = String(fundForm.value.code).trim()
  await fundFormRef.value.validate(async valid => {
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
      fundPickName.value = ''
      fundSearchResults.value = []
      fundFormRef.value?.resetFields()
    } catch (error: any) {
      ElMessage.error('添加失败: ' + error.message)
    } finally {
      submitting.value = false
    }
  })
}

async function handleEditFund() {
  if (!editFundFormRef.value) return
  await editFundFormRef.value.validate(async valid => {
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

async function handleAddGroup() {
  if (!groupFormRef.value) return
  await groupFormRef.value.validate(async valid => {
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

async function handleEditGroup() {
  if (!editGroupFormRef.value) return
  await editGroupFormRef.value.validate(async valid => {
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

async function confirmDeleteGroup() {
  try {
    await ElMessageBox.confirm(`确定要删除分组 ${editGroupForm.value.name} 吗？`, '确认删除', {
      type: 'warning'
    })
    await groupService.deleteGroup(editGroupForm.value.key)
    ElMessage.success('删除成功')
    showEditGroupDialog.value = false
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败: ' + error.message)
  }
}

function onGroupPointerDown(group: Group, e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  onGroupPointerUp()
  groupPressTimer = setTimeout(() => {
    groupPressTimer = null
    groupMenuTarget.value = group
    groupMenuVisible.value = true
  }, LONG_PRESS_MS)
}

function onGroupPointerUp() {
  if (groupPressTimer) {
    clearTimeout(groupPressTimer)
    groupPressTimer = null
  }
}

async function renameGroupFromMenu() {
  const g = groupMenuTarget.value
  if (!g) return
  try {
    const { value } = await ElMessageBox.prompt('新名称', '重命名分组', {
      inputValue: g.name
    })
    await groupService.updateGroup(g.key, value)
    groupMenuVisible.value = false
    ElMessage.success('已更新')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '失败')
  }
}

async function deleteGroupFromMenu() {
  const g = groupMenuTarget.value
  if (!g) return
  try {
    await ElMessageBox.confirm(`删除分组「${g.name}」？`, '确认', { type: 'warning' })
    await groupService.deleteGroup(g.key)
    groupMenuVisible.value = false
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '失败')
  }
}

function groupFundCount(groupKey: string): number {
  return groupStore.getGroup(groupKey)?.fundCodes.length ?? 0
}

function openGroupManage() {
  manageGroupDraft.value = groupList.value.map(x => ({ key: x.key, name: x.name }))
  showGroupManageDialog.value = true
  groupMenuVisible.value = false
}

async function renameDraftGroup(g: { key: string; name: string }) {
  try {
    const { value } = await ElMessageBox.prompt('新名称', '重命名分组', { inputValue: g.name })
    const name = String(value).trim()
    if (!validateGroupName(name)) {
      ElMessage.warning('分组名称长度为 1–50 个字符')
      return
    }
    const item = manageGroupDraft.value.find(x => x.key === g.key)
    if (item) item.name = name
  } catch {
    /* cancel */
  }
}

async function deleteDraftGroup(g: { key: string; name: string }) {
  try {
    await ElMessageBox.confirm(`删除分组「${g.name}」？`, '确认', { type: 'warning' })
    await groupService.deleteGroup(g.key)
    manageGroupDraft.value = groupList.value.map(x => ({ key: x.key, name: x.name }))
    ElMessage.success('已删除')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '失败')
  }
}

async function saveGroupManage() {
  try {
    // Save reordered group order
    const newOrder = manageGroupDraft.value.map(g => g.key)
    await groupService.reorderGroups(newOrder)

    // Save renamed groups
    for (const g of manageGroupDraft.value) {
      const live = groupStore.getGroup(g.key)
      if (live && live.name !== g.name) {
        await groupService.updateGroup(g.key, g.name)
      }
    }
    showGroupManageDialog.value = false
    ElMessage.success('已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  }
}

// --- Sortable: group management dialog drag-and-drop ---
watch(showGroupManageDialog, async (visible) => {
  if (visible) {
    await nextTick()
    initGroupSortable()
  } else {
    destroyGroupSortable()
  }
})

function initGroupSortable() {
  destroyGroupSortable()
  const el = groupSortableRef.value
  if (!el) return
  groupSortableInstance = Sortable.create(el, {
    handle: '.drag-handle',
    animation: 200,
    ghostClass: 'sortable-ghost',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      const item = manageGroupDraft.value.splice(oldIndex, 1)[0]!
      manageGroupDraft.value.splice(newIndex, 0, item)
    }
  })
}

function destroyGroupSortable() {
  if (groupSortableInstance) {
    groupSortableInstance.destroy()
    groupSortableInstance = null
  }
}

// --- Sortable: fund table row drag-and-drop (only in "all" group with default sort) ---
const canDragFundRows = computed(() =>
  selectedGroupKey.value === 'all' &&
  !searchQuery.value.trim() &&
  fundStore.sortConfig.field === 'holdingGainRate' &&
  fundStore.sortConfig.order === 'desc'
)

let fundTableSortable: Sortable | null = null

watch(canDragFundRows, async (can) => {
  await nextTick()
  if (can) {
    initFundTableSortable()
  } else {
    destroyFundTableSortable()
  }
})

function initFundTableSortable() {
  destroyFundTableSortable()
  const tableEl = document.querySelector('.fund-el-table .el-table__body tbody')
  if (!tableEl) return
  fundTableSortable = Sortable.create(tableEl as HTMLElement, {
    animation: 200,
    ghostClass: 'sortable-ghost',
    handle: '.fund-name-cell',
    onEnd(evt) {
      const { oldIndex, newIndex } = evt
      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return
      const codes = sortedRows.value.map(r => r.code)
      const [moved] = codes.splice(oldIndex, 1)
      codes.splice(newIndex, 0, moved!)
      fundService.reorderFundsGlobally(codes)
    }
  })
}

function destroyFundTableSortable() {
  if (fundTableSortable) {
    fundTableSortable.destroy()
    fundTableSortable = null
  }
}

onMounted(async () => {
  selectedGroupKey.value = fundStore.selectedGroupKey
  await nextTick()
  if (canDragFundRows.value) {
    initFundTableSortable()
  }
})

onUnmounted(() => {
  onGroupPointerUp()
  destroyGroupSortable()
  destroyFundTableSortable()
})
</script>

<style scoped>
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
  padding: 0 12px 12px;
  box-sizing: border-box;
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
  color: var(--color-up);
}

.negative {
  color: var(--color-down);
}

.fund-table-wrap {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.fund-el-table {
  width: 100%;
  font-size: 13px;
}

.fund-el-table :deep(.el-table__cell) {
  padding: 6px 8px;
}

.fund-el-table :deep(th.el-table__cell) {
  vertical-align: bottom;
}

.col-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  line-height: 1.25;
}

.fund-el-table :deep(th.is-right .col-head) {
  align-items: flex-end;
  text-align: right;
}

.col-head-sub {
  font-size: 10px;
  font-weight: normal;
  color: var(--el-text-color-secondary);
}

.cell-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fund-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  color: var(--text-primary);
}

.fund-name-row:hover {
  color: var(--color-primary);
}

.fund-code-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 2px;
}

.group-label {
  font-size: 10px;
  padding: 1px 5px;
  background: var(--color-primary);
  color: #fff;
  border-radius: 3px;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.real-value-icon {
  color: var(--color-primary);
  flex-shrink: 0;
  font-size: 11px;
}

.td-sub {
  font-size: 11px;
  margin-top: 2px;
}

.td-sub.muted {
  color: var(--el-text-color-secondary);
}

.muted {
  color: var(--el-text-color-secondary);
}

.hint-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
}

.group-manage-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.group-manage-item {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  margin-bottom: 8px;
}

.group-manage-item .drag-handle {
  cursor: grab;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  user-select: none;
  flex-shrink: 0;
  padding: 0 4px;
}

.group-manage-item .drag-handle:active {
  cursor: grabbing;
}

.group-manage-item .g-name {
  flex: 1;
  min-width: 100px;
  font-weight: 500;
}

.group-manage-item .g-meta {
  font-size: 12px;
}

:deep(.sortable-ghost) {
  opacity: 0.4;
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.fund-search-field {
  position: relative;
  width: 100%;
}

.fund-search-dropdown {
  position: absolute;
  z-index: 20;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  max-height: 220px;
  overflow: auto;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
}

.fund-search-item {
  padding: 8px 10px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.fund-search-item:hover {
  background: var(--el-fill-color-light);
}

.fund-search-item .code {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
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

  .fund-el-table {
    font-size: 12px;
  }
}
</style>
