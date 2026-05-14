<template>
  <DetailLayout>
    <template #header>
      <div class="detail-header">
        <div class="header-left">
          <el-button text :icon="ArrowLeft" @click="goBack">返回</el-button>
          <div class="header-info">
            <span class="fund-name">{{ displayName }}</span>
            <span class="fund-code">{{ code }}</span>
          </div>
        </div>
        <el-button size="small" :loading="refreshing" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </div>
      <!-- Tab 栏 -->
      <div class="detail-tabs">
        <el-scrollbar>
          <div class="detail-tabs-inner">
            <span
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-item"
              :class="{ active: activeTab === tab.key }"
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
            </span>
          </div>
        </el-scrollbar>
      </div>
    </template>

    <div class="detail-main">
      <!-- 持仓信息 -->
      <div v-show="activeTab === 'holding'" class="tab-panel">
        <div class="info-grid-2col" v-if="fundView">
          <div class="grid-item">
            <span class="g-label">持有金额</span>
            <span class="g-value">{{ fmtMoney(holdingAmount) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">持有份额</span>
            <span class="g-value">{{ fmtNum(fundView.num) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">成本价</span>
            <span class="g-value">{{ fmtPrice(fundView.cost) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">持有收益</span>
            <span class="g-value" :class="pctClass(fundView.holdingGain)">
              {{ fmtMoney(fundView.holdingGain) }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">持有收益率</span>
            <span class="g-value" :class="pctClass(fundView.holdingGainRate)">
              {{ fmtPct(fundView.holdingGainRate) }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">日收益（估）</span>
            <span class="g-value" :class="pctClass(estimatedDailyGain)">
              {{ fmtMoney(estimatedDailyGain) }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">当日收益</span>
            <span class="g-value" :class="pctClass(actualDailyGain)">
              {{ fmtMoney(actualDailyGain) }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">估算净值</span>
            <span class="g-value" :class="pctClass(fundView.estimatedChange)">
              {{ fundView.estimatedValue != null ? fmtPrice(fundView.estimatedValue) : '--' }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">单位净值</span>
            <span class="g-value">{{ fmtPrice(fundView.netValue) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">更新时间</span>
            <span class="g-value">{{ fundView.updateTime || '--' }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="action-row" v-if="fundView">
          <el-button type="primary" @click="showEditDialog = true">编辑持仓</el-button>
          <el-button type="danger" plain @click="confirmDelete">删除基金</el-button>
        </div>
      </div>

      <!-- 持仓明细 -->
      <div v-show="activeTab === 'position'" class="tab-panel">
        <div v-if="tabLoading && !positionData" class="loading-hint">加载中...</div>
        <template v-else-if="positionData">
          <div class="position-header">
            <span class="position-date">截止日期：{{ positionData.expansion }}</span>
          </div>

          <!-- 股票持仓 -->
          <div v-if="positionData.stocks.length" class="position-section">
            <div class="position-section-title">股票持仓</div>
            <el-table :data="positionData.stocks" stripe size="small">
              <el-table-column prop="name" label="股票名称（代码）" min-width="100">
                <template #default="{ row: s }">
                  <div class="stock-name">{{ s.name }}</div>
                  <div class="stock-code">{{ s.code }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="price" label="价格" min-width="60" align="right">
                <template #default="{ row: s }">
                  {{ s.price != null ? safeNum(s.price).toFixed(2) : '--' }}
                </template>
              </el-table-column>
              <el-table-column prop="changePercent" label="涨跌幅" min-width="60" align="right">
                <template #default="{ row: s }">
                  <span :class="stockChangeClass(s.changePercent)">
                    {{ s.changePercent != null ? (safeNum(s.changePercent) > 0 ? '+' : '') + safeNum(s.changePercent).toFixed(2) + '%' : '--' }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="ratio" label="持仓占比" min-width="60" align="right">
                <template #default="{ row: s }">
                  {{ safeNum(s.ratio).toFixed(2) }}%
                </template>
              </el-table-column>
              <el-table-column prop="compared" label="较上期" min-width="60" align="right">
                <template #default="{ row: s }">
                  <span :class="comparedClass(s)">{{ comparedText(s) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 债券持仓 -->
          <div v-if="positionData.bonds.length" class="position-section">
            <div class="position-section-title">债券持仓</div>
            <el-table :data="positionData.bonds" stripe size="small">
              <el-table-column prop="name" label="债券名称（代码）" min-width="100">
                <template #default="{ row: b }">
                  <div class="stock-name">{{ b.name }}</div>
                  <div class="stock-code">{{ b.code }}</div>
                </template>
              </el-table-column>
              <el-table-column prop="ratio" label="占净值比" min-width="60" align="right">
                <template #default="{ row: b }">
                  {{ safeNum(b.ratio).toFixed(2) }}%
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>
        <el-empty v-else-if="!tabLoading" description="暂无持仓数据" />
      </div>

      <!-- 基金概况 -->
      <div v-show="activeTab === 'overview'" class="tab-panel">        <div v-if="overview" class="info-list">
          <div class="info-row"><span>基金类型</span><span>{{ overview.ftype || '--' }}</span></div>
          <div class="info-row"><span>风险等级</span><span>{{ riskLabel(overview.riskLevel || '') }}</span></div>
          <div class="info-row"><span>成立日期</span><span>{{ overview.estabDate || '--' }}</span></div>
          <div class="info-row"><span>基金规模</span><span>{{ overview.endNav ? overview.endNav + ' 亿元' : '--' }}</span></div>
          <div class="info-row"><span>基金公司</span><span>{{ overview.company || '--' }}</span></div>
          <div class="info-row"><span>基金经理</span><span>{{ overview.managerName || managers[0]?.name || '--' }}</span></div>
          <div class="info-row"><span>单位净值</span><span>{{ overview.nav ? overview.nav + ' (' + overview.navDate + ')' : '--' }}</span></div>
          <div class="info-row"><span>累计净值</span><span>{{ overview.accNav || '--' }}</span></div>
          <div class="info-row" v-if="overview.buyStatus || overview.sellStatus"><span>交易状态</span><span>{{ overview.buyStatus }} / {{ overview.sellStatus }}</span></div>
          <div class="info-row" v-if="overview.indexName"><span>跟踪指数</span><span>{{ overview.indexName }}</span></div>
          <div class="info-row" v-if="overview.bench"><span>基准指数</span><span class="bench-text">{{ overview.bench }}</span></div>
        </div>

        <!-- 阶段收益率 -->
        <div v-if="periodIncrease" class="info-list" style="margin-top: 12px;">
          <div class="info-row section-title"><span>阶段收益率</span><span></span></div>
          <div class="info-row"><span>近1周</span><span :class="pctClass(calcWeekRate)">{{ calcWeekRate !== null ? (safeNum(calcWeekRate) > 0 ? '+' : '') + safeNum(calcWeekRate).toFixed(2) + '%' : '--' }}</span></div>
          <div class="info-row"><span>近1月</span><span :class="pctClass(parseFloat(periodIncrease.monthRate))">{{ periodIncrease.monthRate ? periodIncrease.monthRate + '%' : '--' }}{{ periodIncrease.monthRank ? ' (' + periodIncrease.monthRank + ')' : '' }}</span></div>
          <div class="info-row"><span>近3月</span><span :class="pctClass(parseFloat(periodIncrease.threeMonthRate))">{{ periodIncrease.threeMonthRate ? periodIncrease.threeMonthRate + '%' : '--' }}{{ periodIncrease.threeMonthRank ? ' (' + periodIncrease.threeMonthRank + ')' : '' }}</span></div>
          <div class="info-row"><span>近6月</span><span :class="pctClass(parseFloat(periodIncrease.sixMonthRate))">{{ periodIncrease.sixMonthRate ? periodIncrease.sixMonthRate + '%' : '--' }}{{ periodIncrease.sixMonthRank ? ' (' + periodIncrease.sixMonthRank + ')' : '' }}</span></div>
          <div class="info-row"><span>近1年</span><span :class="pctClass(parseFloat(periodIncrease.yearRate))">{{ periodIncrease.yearRate ? periodIncrease.yearRate + '%' : '--' }}{{ periodIncrease.yearRank ? ' (' + periodIncrease.yearRank + ')' : '' }}</span></div>
          <div class="info-row"><span>近3年</span><span :class="pctClass(parseFloat(periodIncrease.threeYearRate))">{{ periodIncrease.threeYearRate ? periodIncrease.threeYearRate + '%' : '--' }}{{ periodIncrease.threeYearRank ? ' (' + periodIncrease.threeYearRank + ')' : '' }}</span></div>
          <div class="info-row"><span>近5年</span><span :class="pctClass(parseFloat(periodIncrease.fiveYearRate))">{{ periodIncrease.fiveYearRate ? periodIncrease.fiveYearRate + '%' : '--' }}{{ periodIncrease.fiveYearRank ? ' (' + periodIncrease.fiveYearRank + ')' : '' }}</span></div>
          <div class="info-row"><span>成立以来</span><span :class="pctClass(parseFloat(periodIncrease.sinceEstablishRate))">{{ periodIncrease.sinceEstablishRate ? periodIncrease.sinceEstablishRate + '%' : '--' }}</span></div>
        </div>

        <el-empty v-if="!overview && !tabLoading" description="暂无概况数据" />
        <div v-if="tabLoading && !overview" class="loading-hint">加载中...</div>
      </div>

      <!-- 基金经理 -->
      <div v-show="activeTab === 'manager'" class="tab-panel">
        <div v-if="managers.length" class="manager-list">
          <div v-for="m in managers" :key="m.name" class="manager-card">
            <div class="manager-header">
              <img v-if="m.avatar" class="manager-avatar" :src="m.avatar" :alt="m.name" @error="($event.target as HTMLImageElement).style.display='none'" />
              <div class="manager-info">
                <div class="manager-name">{{ m.name }}</div>
                <div class="manager-tags">
                  <span class="manager-tag">任职 {{ m.years }}</span>
                  <span class="manager-tag" :class="pctClass(parseFloat(m.returnRate))">任职回报 {{ parseFloat(m.returnRate) > 0 ? '+' : '' }}{{ m.returnRate }}%</span>
                </div>
              </div>
            </div>
            <div class="manager-stats-row">
              <div class="manager-stat">
                <div class="stat-label">任职天数</div>
                <div class="stat-value">{{ m.totalDays }}天</div>
              </div>
              <div class="manager-stat">
                <div class="stat-label">年化收益</div>
                <div class="stat-value" :class="pctClass(parseFloat(m.yieldSe))">{{ parseFloat(m.yieldSe) > 0 ? '+' : '' }}{{ m.yieldSe }}%</div>
              </div>
            </div>
            <div v-if="m.investmentIdea" class="manager-desc"><strong>投资理念：</strong>{{ m.investmentIdea }}</div>
            <div v-if="m.resume" class="manager-resume"><strong>个人简历：</strong>{{ m.resume }}</div>
          </div>
        </div>
        <el-empty v-else-if="!tabLoading" description="暂无经理信息" />
        <div v-else class="loading-hint">加载中...</div>
      </div>

      <!-- 关联板块 -->
      <div v-show="activeTab === 'theme'" class="tab-panel">
        <div v-if="themes.length" class="theme-list">
          <div v-for="t in themes" :key="t.secName" class="theme-item">
            <span class="theme-name">{{ t.secName }}</span>
            <span class="theme-corr">相关性：{{ safeNum(t.corr1y).toFixed(2) }}</span>
          </div>
        </div>
        <el-empty v-else-if="!tabLoading" description="暂无关联板块数据" />
        <div v-else class="loading-hint">加载中...</div>
      </div>

      <!-- 历史净值 -->
      <div v-show="activeTab === 'netValue'" class="tab-panel">
        <div class="range-tabs">
          <span
            v-for="r in rangeOptions"
            :key="r.key"
            class="range-item"
            :class="{ active: netValueRange === r.key }"
            @click="switchNetValueRange(r.key)"
          >
            {{ r.label }}
          </span>
        </div>
        <div ref="netValueChartRef" class="chart-container"></div>
      </div>

      <!-- 累计收益 -->
      <div v-show="activeTab === 'profit'" class="tab-panel">
        <div class="range-tabs">
          <span
            v-for="r in rangeOptions"
            :key="r.key"
            class="range-item"
            :class="{ active: profitRange === r.key }"
            @click="switchProfitRange(r.key)"
          >
            {{ r.label }}
          </span>
        </div>
        <div ref="profitChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 编辑基金对话框 -->
    <el-dialog v-model="showEditDialog" title="编辑基金" width="90%" :close-on-click-modal="true">
      <el-form :model="editForm" :rules="editFormRules" ref="editFormRef" label-width="100px">
        <el-form-item label="基金代码">
          <el-input :model-value="code" disabled />
        </el-form-item>
        <el-form-item label="持有份额" prop="num">
          <el-input v-model.number="editForm.num" type="number" placeholder="持有份额" />
        </el-form-item>
        <el-form-item label="成本价" prop="cost">
          <el-input v-model.number="editForm.cost" type="number" placeholder="成本价" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="handleEdit" :loading="submitting">保存</el-button>
      </template>
    </el-dialog>
  </DetailLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft, Refresh } from '@element-plus/icons-vue'
import DetailLayout from '@/layouts/DetailLayout.vue'
import { useFundStore, useSettingStore } from '@/stores'
import { fundService } from '@/services'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'
import { loadEcharts } from '@/utils/echarts'
import {
  fetchFundOverview,
  fetchManagerAndThemes,
  fetchNetValueHistory,
  fetchHistoryYield,
  fetchInvestmentPosition,
  type FundOverview,
  type PeriodIncreaseData,
  type FundManager,
  type RelateThemeItem,
  type NetValueRecord,
  type YieldRecord,
  type PositionData
} from '@/api/fundDetail'

// ==================== Props ====================

interface Props { code: string }
const props = defineProps<Props>()

// ==================== 常量 ====================

const tabs = [
  { key: 'holding', label: '持仓信息' },
  { key: 'position', label: '持仓明细' },
  { key: 'overview', label: '基金概况' },
  { key: 'manager', label: '基金经理' },
  { key: 'theme', label: '关联板块' },
  { key: 'netValue', label: '历史净值' },
  { key: 'profit', label: '累计收益' }
]

const rangeOptions = [
  { key: '1w', label: '近1周' },
  { key: '1m', label: '近1月' },
  { key: '3m', label: '近3月' },
  { key: '6m', label: '近6月' },
  { key: '1y', label: '近1年' },
  { key: '3y', label: '近3年' },
  { key: '5y', label: '近5年' }
]

// ==================== 状态 ====================

const router = useRouter()
const fundStore = useFundStore()
const settingStore = useSettingStore()

const activeTab = ref('holding')
const refreshing = ref(false)
const tabLoading = ref(false)
const submitting = ref(false)
const showEditDialog = ref(false)

const overview = ref<FundOverview | null>(null)
const managers = ref<FundManager[]>([])
const themes = ref<RelateThemeItem[]>([])
const periodIncrease = ref<PeriodIncreaseData | null>(null)
const weekNavRecords = ref<NetValueRecord[]>([])
const positionData = ref<PositionData | null>(null)

const netValueRange = ref('1m')
const profitRange = ref('1m')

const netValueChartRef = ref<HTMLElement | null>(null)
const profitChartRef = ref<HTMLElement | null>(null)
let netValueChart: any = null
let profitChart: any = null

const loadedTabs = new Set<string>()

const editForm = ref({ num: 0, cost: 0 })
const editFormRef = ref<FormInstance>()
const editFormRules: FormRules = {
  num: [{ required: true, message: '请输入份额', trigger: 'blur' }, { type: 'number', min: 0.01, message: '份额>0', trigger: 'blur' }],
  cost: [{ required: true, message: '请输入成本价', trigger: 'blur' }, { type: 'number', min: 0.0001, message: '成本价>0', trigger: 'blur' }]
}

// ==================== 计算属性 ====================

const fundView = computed(() => fundStore.getFundView(props.code))
const displayName = computed(() => fundView.value?.name || props.code)
const holdingAmount = computed(() => {
  const fv = fundView.value
  if (!fv) return 0
  return (fv.num || 0) * (fv.netValue || 0)
})

// 日收益（估）= 份额 × 净值 × 估算涨幅%
const estimatedDailyGain = computed(() => {
  const fv = fundView.value
  if (!fv) return 0
  const gszzl = fv.estimatedChange || fv.changePercent || 0
  if (!gszzl) return 0
  return (fv.num || 0) * (fv.netValue || 0) * gszzl / 100
})

// 当日收益 = 份额 × 净值 × 当日涨幅%
const actualDailyGain = computed(() => {
  const fv = fundView.value
  if (!fv) return 0
  const navChgRt = fv.changePercent || 0
  if (!navChgRt) return 0
  return (fv.num || 0) * (fv.netValue || 0) * navChgRt / 100
})

// 近一周收益率 = (最新净值 - 5个交易日前净值) / 5个交易日前净值 * 100
const calcWeekRate = computed((): number | null => {
  const records = weekNavRecords.value
  if (records.length < 2) return null
  const latest = records[records.length - 1]!
  // 取倒数第6个（即5个交易日前），如果不够就取第一个
  const idx = Math.max(0, records.length - 6)
  const older = records[idx]!
  if (!older.netValue || older.netValue === 0) return null
  return ((latest.netValue - older.netValue) / older.netValue) * 100
})

// ==================== 格式化 ====================

function safeNum(v: unknown): number {
  const n = Number(v)
  return isFinite(n) ? n : 0
}
function fmtNum(v: unknown) { return formatPrivacy(formatNumber(safeNum(v), 2), settingStore.privacyMode) }
function fmtPrice(v: unknown) { return v != null && v !== '' ? formatPrivacy(safeNum(v).toFixed(4), settingStore.privacyMode) : '--' }
function fmtMoney(v: unknown) { return v != null ? formatPrivacy(formatCurrency(safeNum(v)), settingStore.privacyMode) : '--' }
function fmtPct(v: unknown) {
  if (v == null) return '--'
  const n = safeNum(v)
  return formatPrivacy(`${n > 0 ? '+' : ''}${n.toFixed(2)}%`, settingStore.privacyMode)
}
function pctClass(v: unknown) {
  const n = safeNum(v)
  if (!n || settingStore.grayscaleMode) return ''
  if (n > 0) return 'positive'
  if (n < 0) return 'negative'
  return ''
}
function riskLabel(level: string) {
  const map: Record<string, string> = { '1': '低风险', '2': '中低风险', '3': '中风险', '4': '中高风险', '5': '高风险' }
  return map[level] || level || '--'
}

// ==================== 持仓明细辅助 ====================

function stockChangeClass(changePercent: number | null) {
  if (changePercent == null || settingStore.grayscaleMode) return ''
  if (changePercent > 0) return 'positive'
  if (changePercent < 0) return 'negative'
  return ''
}

function comparedText(s: { changeType: string; changeRatio: number }) {
  if (s.changeType === '新增') return '新增'
  if (isNaN(s.changeRatio)) return '--'
  const icon = s.changeRatio > 0 ? '↑' : '↓'
  return `${icon} ${Math.abs(s.changeRatio).toFixed(2)}%`
}

function comparedClass(s: { changeType: string; changeRatio: number }) {
  if (settingStore.grayscaleMode) return ''
  if (s.changeType === '新增') return 'positive'
  if (s.changeRatio > 0) return 'positive'
  if (s.changeRatio < 0) return 'negative'
  return ''
}

// ==================== Tab 切换 & 数据加载 ====================

async function switchTab(tab: string) {
  activeTab.value = tab
  await loadTabOnce(tab)
}

async function loadTabOnce(tab: string) {
  if (loadedTabs.has(tab)) return
  loadedTabs.add(tab)
  tabLoading.value = true
  try {
    await loadTabData(tab)
  } finally {
    tabLoading.value = false
  }
}

async function loadTabData(tab: string) {
  switch (tab) {
    case 'holding':
      // 本地数据，无需请求
      break
    case 'position': {
      const result = await fetchInvestmentPosition(props.code)
      positionData.value = result
      break
    }
    case 'overview':
    case 'manager': {
      const [overviewResult, managerResult, weekNav] = await Promise.all([
        fetchFundOverview(props.code),
        fetchManagerAndThemes(props.code),
        fetchNetValueHistory(props.code, '1w')
      ])
      overview.value = overviewResult.overview
      periodIncrease.value = overviewResult.periodIncrease
      managers.value = managerResult.managers
      themes.value = managerResult.themes
      weekNavRecords.value = weekNav
      loadedTabs.add('overview')
      loadedTabs.add('manager')
      loadedTabs.add('theme')
      break
    }
    case 'theme': {
      if (!themes.value.length) {
        const result = await fetchManagerAndThemes(props.code)
        themes.value = result.themes
      }
      break
    }
    case 'netValue': {
      await loadNetValueChart()
      break
    }
    case 'profit': {
      await loadProfitChart()
      break
    }
  }
}

async function handleRefresh() {
  refreshing.value = true
  try {
    loadedTabs.clear()
    await fundService.fetchFundDetail(props.code)
    await loadTabOnce(activeTab.value)
  } finally {
    refreshing.value = false
  }
}

// ==================== 历史净值图表 ====================

async function loadNetValueChart() {
  const records = await fetchNetValueHistory(props.code, netValueRange.value)
  await renderNetValueChart(records)
}

async function switchNetValueRange(range: string) {
  netValueRange.value = range
  await loadNetValueChart()
}

async function renderNetValueChart(records: NetValueRecord[]) {
  const echarts = await loadEcharts()
  await nextTick()
  if (!netValueChartRef.value) return
  if (!netValueChart) netValueChart = echarts.init(netValueChartRef.value)

  if (!records.length) {
    netValueChart.clear()
    netValueChart.setOption({ title: { text: '暂无净值数据', left: 'center', top: 'center', textStyle: { fontSize: 13, fontWeight: 'normal' } } })
    return
  }

  const dates = records.map(r => r.date)
  const dwjz = records.map(r => r.netValue)
  const ljjz = records.map(r => r.accNetValue)
  const jzzzl = records.map(r => r.changePercent)

  netValueChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        let html = `<div style="font-size:12px">时间: ${params[0]?.axisValue}<br/>`
        params.forEach((p: any) => {
          html += `${p.marker}${p.seriesName}: ${Number(p.value).toFixed(4)}<br/>`
        })
        const idx = params[0]?.dataIndex
        const rate = jzzzl[idx]
        if (rate != null && rate !== 0) {
          const color = rate > 0 ? '#f56c6c' : rate < 0 ? '#4eb61b' : 'inherit'
          html += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#909399;"></span>日增长率: <span style="color:${color};font-weight:bold;">${rate}%</span><br/>`
        }
        return html + '</div>'
      }
    },
    legend: { data: ['单位净值', '累计净值'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 50, right: 16, top: 16, bottom: 60, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: (v: number) => v.toFixed(4) } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 20, height: 18 }],
    series: [
      { name: '单位净值', type: 'line', data: dwjz, smooth: false, showSymbol: false, lineStyle: { width: 2, color: '#409EFF' } },
      { name: '累计净值', type: 'line', data: ljjz, smooth: false, showSymbol: false, lineStyle: { width: 2, color: '#E6A23C' } }
    ]
  }, true)
}

// ==================== 累计收益图表 ====================

async function loadProfitChart() {
  const records = await fetchHistoryYield(props.code, profitRange.value)
  await renderProfitChart(records)
}

async function switchProfitRange(range: string) {
  profitRange.value = range
  await loadProfitChart()
}

async function renderProfitChart(records: YieldRecord[]) {
  const echarts = await loadEcharts()
  await nextTick()
  if (!profitChartRef.value) return
  if (!profitChart) profitChart = echarts.init(profitChartRef.value)

  if (!records.length) {
    profitChart.clear()
    profitChart.setOption({ title: { text: '暂无累计收益数据', left: 'center', top: 'center', textStyle: { fontSize: 13, fontWeight: 'normal' } } })
    return
  }

  const dates = records.map(r => r.date)
  const yieldData = records.map(r => r.yield)
  const indexYieldData = records.map(r => r.indexYield)
  const fundTypeYieldData = records.map(r => r.fundTypeYield)

  profitChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        let html = `<div style="font-size:12px">时间: ${params[0]?.axisValue}<br/>`
        params.forEach((p: any) => {
          html += `${p.marker}${p.seriesName}: ${Number(p.value).toFixed(2)}%<br/>`
        })
        return html + '</div>'
      }
    },
    legend: { data: ['涨幅', '沪深300', '同类平均'], bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 50, right: 16, top: 16, bottom: 60, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}%' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 20, height: 18 }],
    series: [
      { name: '涨幅', type: 'line', data: yieldData, smooth: false, showSymbol: false, lineStyle: { width: 2, color: '#F56C6C' } },
      { name: '沪深300', type: 'line', data: indexYieldData, smooth: false, showSymbol: false, lineStyle: { width: 2, color: '#67C23A' } },
      { name: '同类平均', type: 'line', data: fundTypeYieldData, smooth: false, showSymbol: false, lineStyle: { width: 2, color: '#E6A23C' } }
    ]
  }, true)
}

// ==================== 编辑 & 删除 ====================

async function handleEdit() {
  if (!editFormRef.value) return
  await editFormRef.value.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      await fundService.updateFund(props.code, editForm.value.num, editForm.value.cost, fundView.value?.groupKey)
      await fundService.fetchFundDetail(props.code)
      ElMessage.success('已保存')
      showEditDialog.value = false
    } catch (e: any) {
      ElMessage.error(e?.message || '保存失败')
    } finally {
      submitting.value = false
    }
  })
}

async function confirmDelete() {
  try {
    await ElMessageBox.confirm(`确定删除基金 ${displayName.value}？`, '确认', { type: 'warning' })
    await fundService.deleteFund(props.code)
    ElMessage.success('已删除')
    router.push('/')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

function goBack() { router.back() }

// ==================== ResizeObserver ====================

let resizeObs: ResizeObserver | null = null

// ==================== 生命周期 ====================

onMounted(async () => {
  // 确保基金数据已加载
  if (!fundStore.fundDetails.has(props.code)) {
    await fundService.fetchFundDetail(props.code)
  }
  // 初始化编辑表单
  if (fundView.value) {
    editForm.value = { num: fundView.value.num, cost: fundView.value.cost }
  }
  // 持仓 Tab 无需网络请求
  loadedTabs.add('holding')

  // 图表 resize
  resizeObs = new ResizeObserver(() => {
    netValueChart?.resize()
    profitChart?.resize()
  })
  if (netValueChartRef.value) resizeObs.observe(netValueChartRef.value)
  if (profitChartRef.value) resizeObs.observe(profitChartRef.value)
})

onUnmounted(() => {
  resizeObs?.disconnect()
  netValueChart?.dispose()
  profitChart?.dispose()
})
</script>

<style scoped>
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.fund-name {
  font-size: 15px;
  font-weight: 600;
  text-align: left;
  padding-right: 10px;
  color: var(--text-primary);
}

.fund-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.detail-tabs {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0 16px;
}

.detail-tabs-inner {
  display: flex;
  gap: 4px;
}

.tab-item {
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  color: var(--el-text-color-regular);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.tab-item.active {
  color: var(--el-color-primary);
  border-bottom-color: var(--el-color-primary);
  font-weight: 500;
}

.detail-main {
  padding: 16px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 持仓信息网格 */
.info-grid-2col {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.g-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.g-value {
  font-size: 16px;
  font-weight: 500;
}

/* 概况列表 */
.info-list {
  display: flex;
  flex-direction: column;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-row.section-title span:first-child {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.info-row span:first-child {
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.info-row span:last-child {
  text-align: right;
  max-width: 60%;
  word-break: break-all;
}

.bench-text {
  font-size: 11px;
}

/* 经理卡片 */
.manager-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.manager-card {
  padding: 14px;
  border: 1px solid var(--el-border-color);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.manager-header {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: center;
}

.manager-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--el-border-color);
}

.manager-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.manager-name {
  font-size: 15px;
  font-weight: 600;
}

.manager-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.manager-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
}

.manager-stats-row {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}

.manager-stat {
  flex: 1;
  text-align: center;
}

.manager-stat .stat-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.manager-stat .stat-value {
  font-size: 14px;
  font-weight: 600;
}

.manager-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.manager-resume {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  max-height: 220px;
  overflow-y: auto;
}

/* 关联板块 */
.theme-list {
  display: flex;
  flex-direction: column;
}

.theme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-size: 13px;
}

.theme-item:last-child {
  border-bottom: none;
}

.theme-name {
  font-weight: 500;
}

.theme-corr {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

/* 时间范围选择 */
.range-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.range-item {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  background: var(--el-fill-color-lighter);
  color: var(--el-text-color-secondary);
  transition: all 0.2s;
}

.range-item.active {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 图表 */
.chart-container {
  width: 100%;
  height: 300px;
  padding-bottom: 16px;
}

/* 操作按钮 */
.action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.action-row .el-button {
  flex: 1;
  margin: 0;
}

/* 颜色 */
.positive { color: var(--color-up); }
.negative { color: var(--color-down); }

.loading-hint {
  text-align: center;
  padding: 40px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

/* 持仓明细 */
.position-header {
  padding: 4px 0 8px;
}

.position-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.position-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.position-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  padding: 4px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 8px;
}

.stock-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.stock-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 1px;
}

@media (max-width: 768px) {
  .info-grid-2col {
    gap: 12px;
  }

  .g-value {
    font-size: 14px;
  }
}
</style>
