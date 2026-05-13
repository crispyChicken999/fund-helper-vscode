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
            <span class="g-label">持仓份额</span>
            <span class="g-value">{{ fmtNum(fundView.num) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">持仓成本</span>
            <span class="g-value">{{ fmtPrice(fundView.cost) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">当前金额</span>
            <span class="g-value">{{ fmtMoney(holdingAmount) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">最新净值</span>
            <span class="g-value">{{ fmtPrice(fundView.netValue) }}</span>
          </div>
          <div class="grid-item">
            <span class="g-label">估算净值</span>
            <span class="g-value" :class="pctClass(fundView.estimatedChange)">
              {{ fundView.estimatedValue != null ? fmtPrice(fundView.estimatedValue) : '--' }}
            </span>
          </div>
          <div class="grid-item">
            <span class="g-label">估算涨跌幅</span>
            <span class="g-value" :class="pctClass(fundView.estimatedChange)">
              {{ fmtPct(fundView.estimatedChange) }}
            </span>
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
            <span class="g-value" :class="pctClass(fundView.dailyGain)">
              {{ fmtMoney(fundView.dailyGain) }}
            </span>
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

      <!-- 基金概况 -->
      <div v-show="activeTab === 'overview'" class="tab-panel">
        <div v-if="overview" class="info-list">
          <div class="info-row"><span>基金类型</span><span>{{ overview.ftype || '--' }}</span></div>
          <div class="info-row"><span>风险等级</span><span>{{ riskLabel(overview.riskLevel) }}</span></div>
          <div class="info-row"><span>成立日期</span><span>{{ overview.estabDate || '--' }}</span></div>
          <div class="info-row"><span>基金规模</span><span>{{ overview.endNav ? overview.endNav + ' 亿元' : '--' }}</span></div>
          <div class="info-row"><span>基金公司</span><span>{{ overview.company || '--' }}</span></div>
          <div class="info-row" v-if="overview.indexName"><span>跟踪指数</span><span>{{ overview.indexName }}</span></div>
          <div class="info-row" v-if="overview.trkError"><span>跟踪误差</span><span>{{ overview.trkError }}</span></div>
          <div class="info-row" v-if="overview.bench"><span>基准指数</span><span class="bench-text">{{ overview.bench }}</span></div>
          <div class="info-row"><span>近1年收益</span><span :class="pctClass(parseFloat(overview.syl1n))">{{ overview.syl1n ? overview.syl1n + '%' : '--' }}</span></div>
          <div class="info-row"><span>近3年收益</span><span :class="pctClass(parseFloat(overview.sylLn))">{{ overview.sylLn ? overview.sylLn + '%' : '--' }}</span></div>
          <div class="info-row"><span>成立来收益</span><span :class="pctClass(parseFloat(overview.sylZ))">{{ overview.sylZ ? overview.sylZ + '%' : '--' }}</span></div>
          <div class="info-row"><span>申购费率</span><span>{{ overview.sourceRate || '--' }}</span></div>
          <div class="info-row"><span>管理费率</span><span>{{ overview.rate || '--' }}</span></div>
          <div class="info-row"><span>夏普比率(1年)</span><span>{{ overview.sharp1 || '--' }}</span></div>
          <div class="info-row"><span>最大回撤(1年)</span><span class="negative">{{ overview.maxRetra1 ? overview.maxRetra1 + '%' : '--' }}</span></div>
        </div>
        <el-empty v-else-if="!tabLoading" description="暂无概况数据" />
        <div v-else class="loading-hint">加载中...</div>
      </div>

      <!-- 基金经理 -->
      <div v-show="activeTab === 'manager'" class="tab-panel">
        <div v-if="managers.length" class="manager-list">
          <div v-for="m in managers" :key="m.name" class="manager-card">
            <div class="manager-name">{{ m.name }}</div>
            <div class="manager-meta">
              <span>任职时间：{{ m.startDate }} 至今</span>
              <span v-if="m.returnRate">任职回报：<strong :class="pctClass(parseFloat(m.returnRate))">{{ m.returnRate }}%</strong></span>
            </div>
            <div class="manager-meta">
              <span v-if="m.years">从业年限：{{ m.years }}</span>
              <span v-if="m.fundCount">管理基金：{{ m.fundCount }} 只</span>
            </div>
            <div v-if="m.description" class="manager-desc">{{ m.description }}</div>
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
            <span class="theme-corr">相关性：{{ t.corr1y.toFixed(2) }}</span>
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
    <el-dialog v-model="showEditDialog" title="编辑基金" width="90%" :close-on-click-modal="false">
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
import { useFundStore, useGroupStore, useSettingStore } from '@/stores'
import { fundService } from '@/services'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'
import { loadEcharts } from '@/utils/echarts'
import {
  fetchFundDetailInfo,
  fetchRelateThemes,
  fetchNetValueHistory,
  getPageSize,
  type FundOverview,
  type FundManager,
  type RelateThemeItem,
  type NetValueRecord
} from '@/api/fundDetail'

// ==================== Props ====================

interface Props { code: string }
const props = defineProps<Props>()

// ==================== 常量 ====================

const tabs = [
  { key: 'holding', label: '持仓信息' },
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

// ==================== 格式化 ====================

function fmtNum(v: number) { return formatPrivacy(formatNumber(v, 2), settingStore.privacyMode) }
function fmtPrice(v: number | undefined | null) { return v != null ? formatPrivacy(v.toFixed(4), settingStore.privacyMode) : '--' }
function fmtMoney(v: number | undefined) { return v != null ? formatPrivacy(formatCurrency(v), settingStore.privacyMode) : '--' }
function fmtPct(v: number | undefined) {
  if (v == null) return '--'
  return formatPrivacy(`${v > 0 ? '+' : ''}${v.toFixed(2)}%`, settingStore.privacyMode)
}
function pctClass(v: number | undefined | null) {
  if (v == null || settingStore.grayscaleMode) return ''
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return ''
}
function riskLabel(level: string) {
  const map: Record<string, string> = { '1': '低风险', '2': '中低风险', '3': '中风险', '4': '中高风险', '5': '高风险' }
  return map[level] || level || '--'
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
    case 'overview':
    case 'manager': {
      const result = await fetchFundDetailInfo(props.code)
      overview.value = result.overview
      managers.value = result.managers
      loadedTabs.add('overview')
      loadedTabs.add('manager')
      break
    }
    case 'theme': {
      themes.value = await fetchRelateThemes(props.code)
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
  const pageSize = getPageSize(netValueRange.value)
  const records = await fetchNetValueHistory(props.code, pageSize)
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

  const dates = records.map(r => r.date)
  const values = records.map(r => r.netValue)

  netValueChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 16, top: 16, bottom: 50, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10 } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 4, height: 18 }],
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#3b82f6' },
      areaStyle: { opacity: 0.08, color: '#3b82f6' }
    }]
  }, true)
}

// ==================== 累计收益图表 ====================

async function loadProfitChart() {
  const pageSize = getPageSize(profitRange.value)
  const records = await fetchNetValueHistory(props.code, pageSize)
  await renderProfitChart(records)
}

async function switchProfitRange(range: string) {
  profitRange.value = range
  await loadProfitChart()
}

async function renderProfitChart(records: NetValueRecord[]) {
  const echarts = await loadEcharts()
  await nextTick()
  if (!profitChartRef.value) return
  if (!profitChart) profitChart = echarts.init(profitChartRef.value)

  const cost = fundView.value?.cost || 1
  const dates = records.map(r => r.date)
  const profits = records.map(r => parseFloat((((r.netValue - cost) / cost) * 100).toFixed(2)))

  profitChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        const p = params[0]
        if (!p) return ''
        const color = p.value >= 0 ? '#ef4444' : '#22c55e'
        return `${p.axisValue}<br/><span style="color:${color}">收益率: ${p.value > 0 ? '+' : ''}${p.value}%</span>`
      }
    },
    grid: { left: 50, right: 16, top: 16, bottom: 50, containLabel: false },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', scale: true, axisLabel: { fontSize: 10, formatter: '{value}%' } },
    dataZoom: [{ type: 'inside' }, { type: 'slider', bottom: 4, height: 18 }],
    series: [{
      type: 'line',
      data: profits,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: '#8b5cf6' },
      areaStyle: { opacity: 0.08, color: '#8b5cf6' }
    }]
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
  padding: 12px 16px;
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
  gap: 16px;
}

.grid-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  gap: 6px;
}

.manager-name {
  font-size: 15px;
  font-weight: 600;
}

.manager-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.manager-desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
  margin-top: 4px;
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
  height: 280px;
}

/* 操作按钮 */
.action-row {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.action-row .el-button {
  flex: 1;
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

@media (max-width: 768px) {
  .info-grid-2col {
    gap: 12px;
  }

  .g-value {
    font-size: 14px;
  }
}
</style>
