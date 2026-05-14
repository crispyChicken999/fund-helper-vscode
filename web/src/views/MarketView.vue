<template>
  <MainLayout>
    <template #header>
      <div class="market-header">
        <div class="header-top">
          <h2>行情中心</h2>
          <div class="header-actions">
            <span class="update-hint">{{ updateHint }}</span>
            <el-button size="small" :loading="refreshing" @click="handleRefresh">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
        <!-- 主 Tab 栏 -->
        <div class="main-tabs">
          <el-scrollbar>
            <div class="main-tabs-inner">
              <span
                v-for="tab in mainTabs"
                :key="tab.key"
                class="main-tab-item"
                :class="{ active: activeMainTab === tab.key }"
                @click="switchMainTab(tab.key)"
              >
                {{ tab.label }}
              </span>
            </div>
          </el-scrollbar>
        </div>
      </div>
    </template>

    <!-- Tab 内容区 -->
    <div class="market-content" ref="contentRef">
      <!-- 大盘资金 Tab -->
      <div v-show="activeMainTab === 'market'" class="tab-panel">
        <!-- 两市统计条 -->
        <div v-if="marketStat" class="market-stat-bar">
          <span>两市合计成交额：<strong>{{ marketStat.totalVolume.toFixed(2) }}</strong> 亿元</span>
          <span class="stat-up">上涨：<strong>{{ marketStat.rising }}</strong></span>
          <span class="stat-flat">平盘：<strong>{{ marketStat.flat }}</strong></span>
          <span class="stat-down">下跌：<strong>{{ marketStat.falling }}</strong></span>
        </div>

        <!-- 大盘指数卡片 -->
        <div class="index-cards">
          <div
            v-for="card in indexCards"
            :key="card.code"
            class="index-card"
            :class="cardBorderClass(card.changePercent)"
          >
            <div class="card-name">{{ card.name }}</div>
            <div class="card-price">{{ card.price.toFixed(2) }}</div>
            <div class="card-change" :class="changeColorClass(card.changePercent)">
              {{ fmtPct(card.changePercent) }}
            </div>
            <div class="card-amount" :class="changeColorClass(card.changeAmount)">
              {{ fmtChange(card.changeAmount) }}
            </div>
          </div>
        </div>

        <!-- 全球指数子 Tab -->
        <div class="sub-section">
          <div class="sub-tabs">
            <span
              v-for="g in globalIndexGroups"
              :key="g"
              class="sub-tab-item"
              :class="{ active: activeGlobalTab === g }"
              @click="activeGlobalTab = g"
            >
              {{ g }}指数
            </span>
          </div>
          <div class="index-images">
            <div v-for="item in currentGlobalIndexItems" :key="item.nid" class="index-img-wrap">
              <img :src="getStableImageUrl(item.nid)" :alt="item.name" loading="lazy" />
              <span class="img-label">{{ item.name }}</span>
            </div>
          </div>
        </div>

        <!-- 资金流向折线图 -->
        <div class="sub-section">
          <h4>沪深资金流向</h4>
          <div ref="flowChartRef" class="chart-container"></div>
        </div>
      </div>

      <!-- 板块 Tab（行业/风格/概念/地域） -->
      <div v-for="pt in plateTabs" :key="pt.key" v-show="activeMainTab === pt.key" class="tab-panel">
        <div class="sub-tabs">
          <span
            v-for="rf in plateRankFields"
            :key="rf.field"
            class="sub-tab-item"
            :class="{ active: activePlateRank[pt.key] === rf.field }"
            @click="switchPlateRank(pt.key, rf.field)"
          >
            {{ rf.label }}
          </span>
        </div>
        <div :ref="el => setPlateChartRef(pt.key, el as HTMLElement)" class="chart-container chart-plate"></div>
      </div>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import MainLayout from '@/layouts/MainLayout.vue'
import {
  fetchIndexCards,
  fetchMarketStat,
  fetchFlowLine,
  fetchPlateData,
  GLOBAL_INDEX_GROUPS,
  type IndexCardData,
  type MarketStatData,
  type PlateRankField
} from '@/api/market'
import { loadEcharts } from '@/utils/echarts'

// ==================== 常量 ====================

const mainTabs = [
  { key: 'market', label: '大盘资金' },
  { key: 'industry', label: '行业板块' },
  { key: 'style', label: '风格板块' },
  { key: 'concept', label: '概念板块' },
  { key: 'region', label: '地域板块' }
]

const plateTabs = mainTabs.filter(t => t.key !== 'market')

const plateRankFields: { field: PlateRankField; label: string }[] = [
  { field: 'f62', label: '今日排行' },
  { field: 'f164', label: '5日排行' },
  { field: 'f174', label: '10日排行' }
]

const globalIndexGroups = Object.keys(GLOBAL_INDEX_GROUPS)

// ==================== 状态 ====================

const activeMainTab = ref('market')
const activeGlobalTab = ref('A股')
const refreshing = ref(false)
const contentRef = ref<HTMLElement | null>(null)

const indexCards = ref<IndexCardData[]>([])
const marketStat = ref<MarketStatData | null>(null)

// Stable timestamp for image URLs — only changes on manual refresh
const imageTimestamp = ref(Date.now())

const loadedTabs = new Set<string>()
const activePlateRank = reactive<Record<string, PlateRankField>>({
  industry: 'f62',
  style: 'f62',
  concept: 'f62',
  region: 'f62'
})

// ECharts
const flowChartRef = ref<HTMLElement | null>(null)
let flowChartInstance: any = null
const plateChartRefs: Record<string, HTMLElement | null> = {}
const plateChartInstances: Record<string, any> = {}

// Auto-refresh
let refreshTimer: ReturnType<typeof setTimeout> | null = null
const countdown = ref(0)
let countdownInterval: ReturnType<typeof setInterval> | null = null

// ==================== 计算属性 ====================

const currentGlobalIndexItems = computed(() =>
  GLOBAL_INDEX_GROUPS[activeGlobalTab.value] ?? []
)

const updateHint = computed(() => {
  if (countdown.value > 0) return `${countdown.value}s 后刷新`
  return ''
})

// ==================== 方法 ====================

function setPlateChartRef(key: string, el: HTMLElement | null) {
  plateChartRefs[key] = el
}

function cardBorderClass(pct: number) {
  if (pct > 0) return 'border-up'
  if (pct < 0) return 'border-down'
  return 'border-flat'
}

function changeColorClass(v: number) {
  if (v > 0) return 'color-up'
  if (v < 0) return 'color-down'
  return 'color-flat'
}

function fmtPct(v: number) {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

function fmtChange(v: number) {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}`
}

function getStableImageUrl(nid: string) {
  return `https://webquotepic.eastmoney.com/GetPic.aspx?imageType=WAPINDEX2&nid=${nid}&rnd=${imageTimestamp.value}`
}

// --- 数据加载 ---

async function loadMarketTab() {
  const [cards, stat, flowData] = await Promise.all([
    fetchIndexCards(),
    fetchMarketStat(),
    fetchFlowLine()
  ])
  indexCards.value = cards
  marketStat.value = stat
  await renderFlowChart(flowData)
}

async function loadPlateTab(tab: string) {
  const field = activePlateRank[tab] ?? 'f62'
  const data = await fetchPlateData(tab, field)
  await renderPlateChart(tab, data)
}

async function loadTabOnce(tab: string) {
  if (loadedTabs.has(tab)) return
  loadedTabs.add(tab)
  if (tab === 'market') {
    await loadMarketTab()
  } else {
    await loadPlateTab(tab)
  }
}

function switchMainTab(tab: string) {
  activeMainTab.value = tab
  loadTabOnce(tab)
  // Resize charts after tab switch (DOM visibility change)
  nextTick(() => {
    flowChartInstance?.resize()
    Object.values(plateChartInstances).forEach((c: any) => c?.resize())
  })
}

async function switchPlateRank(tab: string, field: PlateRankField) {
  activePlateRank[tab] = field
  const data = await fetchPlateData(tab, field)
  await renderPlateChart(tab, data)
}

async function handleRefresh() {
  refreshing.value = true
  try {
    loadedTabs.clear()
    imageTimestamp.value = Date.now()
    await loadTabOnce(activeMainTab.value)
  } finally {
    refreshing.value = false
  }
}

// --- ECharts 渲染 ---

async function renderFlowChart(data: { time: string; main: number; superLarge: number; large: number; medium: number; small: number }[]) {
  const echarts = await loadEcharts()
  if (!flowChartRef.value) return

  if (!flowChartInstance) {
    flowChartInstance = echarts.init(flowChartRef.value)
  }

  const times = data.map(d => d.time.split(' ').pop() ?? d.time)
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        let html = `<div style="font-size:12px">${params[0]?.axisValue}<br/>`
        params.forEach((p: any) => {
          const color = p.value >= 0 ? 'var(--color-up)' : 'var(--color-down)'
          html += `<span style="color:${color}">${p.seriesName}: ${p.value.toFixed(2)} 亿</span><br/>`
        })
        return html + '</div>'
      }
    },
    legend: {
      data: ['主力', '超大单', '大单', '中单', '小单'],
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    grid: { left: 50, right: 16, top: 12, bottom: 40 },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: { fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: '{value}亿' }
    },
    series: [
      { name: '主力', type: 'line', data: data.map(d => parseFloat(d.main.toFixed(2))), smooth: false, lineStyle: { width: 2 }, symbol: 'none', color: '#3b82f6' },
      { name: '超大单', type: 'line', data: data.map(d => parseFloat(d.superLarge.toFixed(2))), smooth: false, lineStyle: { width: 1.5 }, symbol: 'none', color: '#ef4444' },
      { name: '大单', type: 'line', data: data.map(d => parseFloat(d.large.toFixed(2))), smooth: false, lineStyle: { width: 1.5 }, symbol: 'none', color: '#06b6d4' },
      { name: '中单', type: 'line', data: data.map(d => parseFloat(d.medium.toFixed(2))), smooth: false, lineStyle: { width: 1.5 }, symbol: 'none', color: '#22c55e' },
      { name: '小单', type: 'line', data: data.map(d => parseFloat(d.small.toFixed(2))), smooth: false, lineStyle: { width: 1.5 }, symbol: 'none', color: '#f97316' }
    ]
  }
  flowChartInstance.setOption(option, true)
}

async function renderPlateChart(tab: string, data: { name: string; value: number }[]) {
  const echarts = await loadEcharts()
  await nextTick()
  const el = plateChartRefs[tab]
  if (!el || !data.length) return

  // Ensure the container is visible and has dimensions
  if (el.offsetWidth === 0 || el.offsetHeight === 0) {
    // Retry after a short delay (tab might still be transitioning)
    setTimeout(() => renderPlateChart(tab, data), 100)
    return
  }

  if (!plateChartInstances[tab]) {
    plateChartInstances[tab] = echarts.init(el)
  }

  const names = data.map(d => d.name.split('').join('\n'))
  const values = data.map(d => parseFloat(d.value.toFixed(2)))
  const colors = values.map(v => (v >= 0 ? '#ef4444' : '#22c55e'))

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter(params: any[]) {
        const p = params[0]
        if (!p) return ''
        const name = data[p.dataIndex]?.name ?? ''
        const color = p.value >= 0 ? '#ef4444' : '#22c55e'
        const sign = p.value >= 0 ? '+' : ''
        return `${name}<br/>净流入: <span style="color:${color};font-weight:600;">${sign}${p.value.toFixed(2)}</span> 亿`
      }
    },
    grid: { left: 50, right: 20, top: 20, bottom: 80 },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { fontSize: 9, interval: 0, color: 'var(--text-secondary)' },
      axisLine: { lineStyle: { color: 'var(--border-color)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10, formatter: '{value}亿', color: 'var(--text-secondary)' },
      splitLine: { lineStyle: { color: 'var(--border-color)', type: 'dashed' } }
    },
    dataZoom: [
      { type: 'slider', start: 0, end: Math.min(100, (30 / Math.max(data.length, 1)) * 100), bottom: 16, height: 18 },
      { type: 'inside' }
    ],
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({ value: v, itemStyle: { color: colors[i] } })),
      barMaxWidth: 30
    }]
  }
  plateChartInstances[tab].setOption(option, true)
}

// --- 自动刷新 ---

function setupAutoRefresh() {
  clearAutoRefresh()
  scheduleNext()
}

function scheduleNext() {
  const now = new Date()
  const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds()
  countdown.value = Math.ceil(delay / 1000)

  // 倒计时
  countdownInterval = setInterval(() => {
    countdown.value = Math.max(0, countdown.value - 1)
  }, 1000)

  refreshTimer = setTimeout(async () => {
    if (countdownInterval) clearInterval(countdownInterval)
    const h = new Date().getHours()
    const d = new Date().getDay()
    if (d >= 1 && d <= 5 && h >= 9 && h < 15) {
      loadedTabs.clear()
      imageTimestamp.value = Date.now()
      await loadTabOnce(activeMainTab.value)
    }
    scheduleNext()
  }, delay)
}

function clearAutoRefresh() {
  if (refreshTimer) { clearTimeout(refreshTimer); refreshTimer = null }
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null }
}

// --- ResizeObserver ---

let resizeObserver: ResizeObserver | null = null

function setupResize() {
  resizeObserver = new ResizeObserver(() => {
    flowChartInstance?.resize()
    Object.values(plateChartInstances).forEach((c: any) => c?.resize())
  })
  if (contentRef.value) resizeObserver.observe(contentRef.value)
}

// ==================== 生命周期 ====================

onMounted(async () => {
  await loadTabOnce('market')
  setupAutoRefresh()
  setupResize()
})

onUnmounted(() => {
  clearAutoRefresh()
  resizeObserver?.disconnect()
  flowChartInstance?.dispose()
  Object.values(plateChartInstances).forEach((c: any) => c?.dispose())
})
</script>

<style scoped>
.market-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
}

.header-top h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.main-tabs {
  padding: 10px 16px 0;
}

.main-tabs-inner {
  display: flex;
  gap: 4px;
}

.main-tab-item {
  padding: 6px 14px;
  font-size: 13px;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
  color: var(--el-text-color-regular);
  transition: all 0.2s;
}

.main-tab-item:hover {
  background: var(--el-fill-color-light);
}

.main-tab-item.active {
  background: var(--el-color-primary);
  color: #fff;
}

/* Tab 内容 */
.market-content {
  padding: 12px 16px;
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 两市统计条 */
.market-stat-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 13px;
  padding: 10px 12px;
  background: var(--el-fill-color);
  border-radius: 8px;
}

.stat-up { color: var(--color-up); }
.stat-down { color: var(--color-down); }
.stat-flat { color: var(--color-flat); }

/* 指数卡片 */
.index-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}

.index-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--el-border-color);
  border-left: 4px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.index-card.border-up { border-left-color: var(--color-up); }
.index-card.border-down { border-left-color: var(--color-down); }
.index-card.border-flat { border-left-color: var(--color-flat); }

.card-name {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.card-price {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
}

.card-change, .card-amount {
  font-size: 13px;
}

.color-up { color: var(--color-up); }
.color-down { color: var(--color-down); }
.color-flat { color: var(--color-flat); }

/* 子 Tab */
.sub-section {
  margin-top: 4px;
}

.sub-section h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
}

.sub-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}

.sub-tab-item {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: 12px;
  cursor: pointer;
  user-select: none;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  transition: all 0.2s;
}

.sub-tab-item.active {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-weight: 500;
}

/* 全球指数图片 */
.index-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.index-img-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.index-img-wrap img {
  width: 90px;
  height: 106px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: box-shadow 0.2s;
}

.index-img-wrap img:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.img-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

/* 图表容器 */
.chart-container {
  width: 100%;
  height: 280px;
  min-height: 280px;
}

.chart-plate {
  height: 320px;
  min-height: 320px;
}

@media (max-width: 768px) {
  .index-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .market-stat-bar {
    font-size: 12px;
    gap: 8px;
  }

  .card-price {
    font-size: 16px;
  }
}
</style>
