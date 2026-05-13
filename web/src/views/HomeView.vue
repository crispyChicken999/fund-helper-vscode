<template>
  <MainLayout>
    <template #header>
      <!-- 顶部资产展示区 -->
      <div class="account-summary">
        <div class="account-stats">
          <!-- 第一栏：账户资产 -->
          <div class="stat-item stat-item-main">
            <div class="stat-label">
              <span>账户资产</span>
              <button class="btn-icon" @click="togglePrivacy" :title="settingStore.privacyMode ? '显示金额' : '隐藏金额'">
                <el-icon v-if="!settingStore.privacyMode"><View /></el-icon>
                <el-icon v-else><Hide /></el-icon>
              </button>
              <button class="btn-icon" :class="{ active: settingStore.grayscaleMode }" @click="toggleGrayscale" title="灰色模式">
                <el-icon><MoonNight /></el-icon>
              </button>
            </div>
            <div class="stat-value-large">{{ formatAsset(totalAsset) }}</div>
          </div>
          <!-- 第二栏 + 第三栏 -->
          <div class="stat-item-wrapper">
            <div class="stat-item">
              <div class="stat-label">持有收益</div>
              <div class="stat-value" :class="getValueClass(totalHoldingGain)">{{ formatAsset(totalHoldingGain) }}</div>
              <div class="stat-rate" :class="getValueClass(holdingGainRate)">{{ formatPercent(holdingGainRate) }}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">日收益</div>
              <div class="stat-value" :class="getValueClass(totalDailyGain)">{{ formatAsset(totalDailyGain) }}</div>
              <div class="stat-rate" :class="getValueClass(dailyGainRate)">{{ formatPercent(dailyGainRate) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分组管理区 -->
      <div class="group-tags-wrapper">
        <div class="group-tags-container">
          <div
            class="group-tag-item"
            :class="{ active: selectedGroupKey === 'all' }"
            @click="selectGroup('all')"
          >
            全部
          </div>
          <div
            v-for="group in groupList"
            :key="group.key"
            class="group-tag-item"
            :class="{ active: selectedGroupKey === group.key }"
            @click="selectGroup(group.key)"
            @pointerdown="onGroupPointerDown(group, $event)"
            @pointerup="onGroupPointerUp"
            @pointerleave="onGroupPointerUp"
          >
            {{ group.name }}
          </div>
        </div>
        <button class="group-tag-settings" @click="showGroupManageDialog = true" title="分组管理">
          ⚙
        </button>
      </div>
    </template>

    <!-- 基金列表区 -->
    <div class="fund-list-main" v-loading="loading">
        <div class="fund-toolbar">
          <div class="search-box">
            <el-input
              v-model="searchQuery"
              placeholder="搜索基金代码或名称"
              clearable
              size="small"
              @input="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <el-button type="primary" size="small" @click="showAddFundDialog = true">
            <el-icon><Plus /></el-icon>
            <span>添加</span>
          </el-button>
          <el-button size="small" @click="handleRefresh" :loading="refreshing">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button size="small" @click="showColumnSettings = true" title="列设置">
            <el-icon><Operation /></el-icon>
          </el-button>
          <div class="market-status">
            <span class="status-dot" :class="marketOpen ? 'status-open' : 'status-closed'"></span>
            <span class="status-text">{{ marketOpen ? '开市' : '休市' }}</span>
          </div>
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

        <!-- 分组统计弹窗 -->
        <GroupTooltip
          :visible="groupTooltipVisible"
          :stats="groupTooltipStats"
          @close="groupTooltipVisible = false"
        />

        <!-- 分组管理弹窗 -->
        <GroupManageDialog
          v-model:visible="showGroupManageDialog"
          :fund-rows="enrichedRows"
          @saved="onGroupManageSaved"
        />
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

    <!-- 列设置对话框 -->
    <ColumnSettingsDialog v-model:visible="showColumnSettings" />
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Refresh, View, Hide, MoonNight, Operation } from '@element-plus/icons-vue'
import { useDebounceFn } from '@vueuse/core'
import Sortable from 'sortablejs'
import MainLayout from '@/layouts/MainLayout.vue'
import FundTooltip from '@/components/FundTooltip.vue'
import ColumnSettingsDialog from '@/components/ColumnSettingsDialog.vue'
import GroupTooltip from '@/components/GroupTooltip.vue'
import GroupManageDialog from '@/components/GroupManageDialog.vue'
import type { GroupStats } from '@/components/GroupTooltip.vue'
import { useFundStore, useGroupStore, useSettingStore } from '@/stores'
import { fundService, groupService } from '@/services'
import { searchFund } from '@/api/fundEastmoney'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'
import { validateFundCode, validateGroupName } from '@/utils/validate'
import { getChinaMarketStatus } from '@/utils/marketChina'
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
const showColumnSettings = ref(false)
const groupTooltipVisible = ref(false)
const groupTooltipStats = ref<GroupStats>({
  groupName: '',
  fundCount: 0,
  estimatedGain: 0,
  estimatedChangePercent: 0,
  estimatedUpCount: 0,
  estimatedDownCount: 0,
  estimatedDate: '',
  dailyGain: 0,
  dailyChangePercent: 0,
  dailyUpCount: 0,
  dailyDownCount: 0,
  dailyDate: '',
  holdingGain: 0,
  holdingGainRate: 0,
  holdingProfitCount: 0,
  holdingLossCount: 0,
  holdingDate: '',
  totalAsset: 0,
  totalCost: 0
})

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

const holdingGainRate = computed(() => {
  const asset = totalAsset.value
  const gain = totalHoldingGain.value
  const costTotal = asset - gain
  return costTotal === 0 ? 0 : (gain / costTotal) * 100
})

const dailyGainRate = computed(() => {
  const asset = totalAsset.value
  const daily = totalDailyGain.value
  const prevAsset = asset - daily
  return prevAsset === 0 ? 0 : (daily / prevAsset) * 100
})

const marketOpen = computed(() => getChinaMarketStatus().isOpen)

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
    case 'sector':
      return ''
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

function togglePrivacy() {
  settingStore.setPrivacyMode(!settingStore.privacyMode)
}

function toggleGrayscale() {
  settingStore.setGrayscaleMode(!settingStore.grayscaleMode)
  document.documentElement.dataset.grayscale = String(settingStore.grayscaleMode)
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
    showGroupStats(group)
  }, LONG_PRESS_MS)
}

function onGroupPointerUp() {
  if (groupPressTimer) {
    clearTimeout(groupPressTimer)
    groupPressTimer = null
  }
}

function showGroupStats(group: Group) {
  const rows = enrichedRows.value.filter(r => r.fund.groupKey === group.key)
  let estimatedGain = 0, dailyGain = 0, holdingGain = 0
  let totalAsset = 0, totalCost = 0
  let estUp = 0, estDown = 0, dailyUp = 0, dailyDown = 0
  let holdProfit = 0, holdLoss = 0

  for (const row of rows) {
    estimatedGain += row.estimatedGain
    if (row.gszzl > 0) estUp++
    else if (row.gszzl < 0) estDown++

    dailyGain += row.dailyGain
    if (row.navChgRt > 0) dailyUp++
    else if (row.navChgRt < 0) dailyDown++

    holdingGain += row.holdingGain
    if (row.holdingGain > 0) holdProfit++
    else if (row.holdingGain < 0) holdLoss++

    totalAsset += row.holdingAmount
    totalCost += row.costAmount
  }

  const sample = rows[0]
  const estimatedDate = sample?.estimatedDateLabel || ''
  const dailyDate = sample?.navDateLabel || ''

  groupTooltipStats.value = {
    groupName: group.name,
    fundCount: rows.length,
    estimatedGain,
    estimatedChangePercent: totalAsset > 0 ? (estimatedGain / totalAsset) * 100 : 0,
    estimatedUpCount: estUp,
    estimatedDownCount: estDown,
    estimatedDate,
    dailyGain,
    dailyChangePercent: totalAsset > 0 ? (dailyGain / totalAsset) * 100 : 0,
    dailyUpCount: dailyUp,
    dailyDownCount: dailyDown,
    dailyDate,
    holdingGain,
    holdingGainRate: totalCost > 0 ? (holdingGain / totalCost) * 100 : 0,
    holdingProfitCount: holdProfit,
    holdingLossCount: holdLoss,
    holdingDate: dailyDate,
    totalAsset,
    totalCost
  }
  groupTooltipVisible.value = true
}

function onGroupManageSaved() {
  // Refresh data after group management changes
  fundService.refreshAllFunds().catch(() => {})
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
  destroyFundTableSortable()
})
</script>

<style scoped>
.account-summary {
  padding: 12px 16px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-color);
}

.account-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item-main .stat-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item-main .stat-value-large {
  font-size: 24px;
  font-weight: 700;
  margin-top: 4px;
  color: var(--text-primary);
}

.stat-item-wrapper {
  display: flex;
  gap: 16px;
}

.stat-item-wrapper .stat-item {
  flex: 1;
}

.stat-item .stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.stat-item .stat-value {
  font-size: 16px;
  font-weight: 600;
  margin-top: 2px;
}

.stat-item .stat-rate {
  font-size: 12px;
  margin-top: 2px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
  font-size: 14px;
}

.btn-icon:hover {
  background: var(--bg-secondary);
}

.btn-icon.active {
  color: var(--color-primary);
}

.group-tags-wrapper {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-card);
}

.group-tags-container {
  flex: 1;
  display: flex;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 8px 12px;
}

.group-tags-container::-webkit-scrollbar {
  display: none;
}

.group-tag-item {
  flex-shrink: 0;
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-secondary);
  white-space: nowrap;
  transition: all 0.2s;
  user-select: none;
}

.group-tag-item:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.group-tag-item.active {
  background: var(--color-primary);
  color: #fff;
  font-weight: 500;
}

.group-tag-settings {
  flex-shrink: 0;
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-left: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  font-size: 16px;
  color: var(--text-secondary);
  transition: background 0.2s;
}

.group-tag-settings:hover {
  background: var(--bg-secondary);
}

.fund-list-main {
  padding: 0 12px 12px;
  box-sizing: border-box;
}

.fund-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.fund-toolbar .search-box {
  flex: 1;
}

.market-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-dot.status-open {
  background: #22c55e;
  box-shadow: 0 0 4px #22c55e;
}

.status-dot.status-closed {
  background: #9ca3af;
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
  .stat-item-main .stat-value-large {
    font-size: 20px;
  }

  .fund-toolbar {
    flex-wrap: wrap;
  }

  .fund-toolbar .search-box {
    flex: 1 1 100%;
  }

  .fund-el-table {
    font-size: 12px;
  }
}
</style>
