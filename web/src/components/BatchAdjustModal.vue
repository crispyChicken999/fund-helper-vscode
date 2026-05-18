<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="visible" class="batch-modal-overlay" @click.self="$emit('close')">
        <div class="batch-modal-panel">
          <!-- 头部 -->
          <div class="batch-modal-header">
            <span class="batch-modal-title">批量加减仓</span>
            <div class="batch-modal-header-actions">
              <span v-if="pendingCount > 0" class="pending-badge" @click="activeTab = 'pending'">
                进行中 {{ pendingCount }}
              </span>
              <button class="batch-close-btn" @click="$emit('close')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <!-- Tab 切换 -->
          <div class="batch-tabs">
            <button :class="['batch-tab', { active: activeTab === 'buy' }]" @click="activeTab = 'buy'">加仓</button>
            <button :class="['batch-tab', { active: activeTab === 'sell' }]" @click="activeTab = 'sell'">减仓</button>
            <el-badge :value="pendingCount" :hidden="pendingCount === 0" type="danger" class="batch-tab-badge-wrap">
              <button :class="['batch-tab', { active: activeTab === 'pending' }]" @click="activeTab = 'pending'">进行中</button>
            </el-badge>
          </div>

          <!-- 加仓面板 -->
          <div v-show="activeTab === 'buy'" class="batch-panel">
            <div class="search-section">
              <div class="search-input-wrap">
                <input
                  v-model="buySearchQuery"
                  class="batch-search-input"
                  placeholder="搜索基金代码或名称..."
                  @input="onBuySearch"
                />
                <svg v-if="buySearchLoading" class="search-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
              </div>
              <div v-if="buySearchResults.length" class="search-dropdown">
                <el-scrollbar max-height="200px">
                  <div
                    v-for="item in buySearchResults"
                    :key="item.code"
                    class="search-dropdown-item"
                    @click="addBuyItem(item)"
                  >
                    <span class="item-code">{{ item.code }}</span>
                    <span class="item-name">{{ item.name }}</span>
                  </div>
                </el-scrollbar>
              </div>
            </div>

            <div v-if="buyItems.length === 0" class="panel-empty">搜索并点击基金以添加加仓计划</div>

            <div class="fund-items-list">
              <div v-for="item in buyItems" :key="item.code" class="fund-item-card">
                <div class="fund-item-header">
                  <div class="fund-item-info">
                    <span class="fund-item-name">{{ item.name }}</span>
                    <span class="fund-item-code">{{ item.code }}</span>
                  </div>
                  <button class="remove-btn" @click="removeBuyItem(item.code)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <!-- 日期选择 -->
                <div class="fund-item-row">
                  <span class="fund-item-label">买入日期</span>
                  <div class="nav-date-select-wrap">
                    <el-select
                      :model-value="item.selectedDate"
                      @update:model-value="(val: string) => onBuyDateChange(item, val)"
                      :placeholder="item.navLoading ? '加载中...' : item.navError ? '加载失败' : '选择日期'"
                      :loading="item.navLoading"
                      :disabled="item.navLoading"
                      style="flex:1;min-width:0;"
                    >
                      <el-option value="today" :label="`今日 ${todayStr}（待更新）`" />
                      <el-option
                        v-for="nav in item.navList"
                        :key="nav.date"
                        :value="nav.date"
                        :label="`${nav.date}  净值 ${nav.netValue.toFixed(4)}  ${nav.changePercent >= 0 ? '+' : ''}${nav.changePercent.toFixed(2)}%`"
                      />
                    </el-select>
                    <span v-if="item.navError" class="nav-error-tip">
                      加载失败
                      <button class="retry-btn" @click="loadNavForItem(item.code)">重试</button>
                    </span>
                  </div>
                </div>

                <!-- 净值显示 -->
                <div class="fund-item-row" v-if="item.selectedDate">
                  <span class="fund-item-label">买入净值</span>
                  <span class="fund-item-value" :class="{ 'pending-nav': item.selectedDate === 'today' }">
                    {{ item.selectedDate === 'today' ? '待更新' : (item.selectedNav ? item.selectedNav.toFixed(4) : '—') }}
                  </span>
                </div>

                <!-- 买入金额 -->
                <div class="fund-item-row">
                  <span class="fund-item-label">买入金额</span>
                  <div class="amount-input-wrap">
                    <input
                      v-model.number="item.amount"
                      type="number"
                      min="0.01"
                      step="100"
                      class="amount-input"
                      placeholder="输入金额（元）"
                    />
                    <span class="amount-unit">元</span>
                  </div>
                </div>

                <!-- 预览计算结果 -->
                <div
                  v-if="item.selectedDate !== 'today' && item.selectedNav && item.amount > 0"
                  class="calc-preview"
                >
                  <div class="preview-row">
                    <span class="preview-label">新增份额</span>
                    <span class="positive">+{{ (item.amount / item.selectedNav).toFixed(2) }} 份</span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">持有份额</span>
                    <span>{{ calcOldShares(item).toFixed(2) }} → <strong>{{ calcNewShares(item).toFixed(2) }}</strong> 份</span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">成本价</span>
                    <span>{{ calcOldCost(item).toFixed(4) }} → <strong>{{ calcNewCost(item).toFixed(4) }}</strong></span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">持仓总额</span>
                    <span>{{ calcOldAmount(item).toFixed(2) }} → <strong>{{ calcNewAmount(item).toFixed(2) }}</strong> 元</span>
                  </div>
                </div>
                <div v-else-if="item.selectedDate === 'today' && item.amount > 0" class="calc-preview pending-preview">
                  <div class="preview-row">
                    <span>买入金额</span>
                    <span>{{ item.amount.toFixed(2) }} 元</span>
                  </div>
                  <div class="preview-row muted">
                    <span>净值待更新后自动计算</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 减仓面板 -->
          <div v-show="activeTab === 'sell'" class="batch-panel">
            <div class="search-section">
              <div class="search-input-wrap">
                <input
                  v-model="sellSearchQuery"
                  class="batch-search-input"
                  placeholder="从持仓中搜索基金..."
                  @input="onSellSearch"
                />
              </div>
              <div v-if="sellSearchResults.length" class="search-dropdown">
                <el-scrollbar max-height="200px">
                  <div
                    v-for="item in sellSearchResults"
                    :key="item.code"
                    class="search-dropdown-item"
                    @click="addSellItem(item)"
                  >
                    <span class="item-code">{{ item.code }}</span>
                    <span class="item-name">{{ item.name }}</span>
                    <span class="item-shares">{{ item.shares.toFixed(2) }} 份</span>
                  </div>
                </el-scrollbar>
              </div>
            </div>

            <div v-if="sellItems.length === 0" class="panel-empty">搜索持仓基金以添加减仓计划</div>

            <div class="fund-items-list">
              <div v-for="item in sellItems" :key="item.code" class="fund-item-card">
                <div class="fund-item-header">
                  <div class="fund-item-info">
                    <span class="fund-item-name">{{ item.name }}</span>
                    <span class="fund-item-code">{{ item.code }}</span>
                  </div>
                  <button class="remove-btn" @click="removeSellItem(item.code)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div class="fund-item-row">
                  <span class="fund-item-label">减仓份额</span>
                  <div class="amount-input-wrap">
                    <input
                      v-model.number="item.sellShares"
                      type="number"
                      min="0.01"
                      :max="item.maxShares"
                      step="1"
                      class="amount-input"
                      :placeholder="`最多 ${item.maxShares.toFixed(2)} 份`"
                    />
                    <span class="amount-unit">份</span>
                  </div>
                </div>
                <div
                  v-if="item.sellShares > 0 && item.sellShares <= item.maxShares"
                  class="calc-preview"
                >
                  <div class="preview-row">
                    <span class="preview-label">减少份额</span>
                    <span class="negative">-{{ item.sellShares.toFixed(2) }} 份</span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">持有份额</span>
                    <span>{{ item.maxShares.toFixed(2) }} → <strong>{{ (item.maxShares - item.sellShares).toFixed(2) }}</strong> 份</span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">成本价</span>
                    <span>{{ calcSellCost(item).toFixed(4) }}（不变）</span>
                  </div>
                  <div class="preview-row">
                    <span class="preview-label">持仓总额</span>
                    <span>{{ calcSellOldAmount(item).toFixed(2) }} → <strong>{{ calcSellNewAmount(item).toFixed(2) }}</strong> 元</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 进行中面板 -->
          <div v-show="activeTab === 'pending'" class="batch-panel" >
            <div v-if="pendingList.length === 0" class="panel-empty">暂无等待更新净值的加仓记录</div>
            <el-scrollbar max-height="350px">
              <div class="fund-items-list" :style="{ padding: pendingList.length > 1 ? '0 10px 0 0' : '0' }">
                <div v-for="record in pendingList" :key="record.id" class="fund-item-card pending-card">
                  <div class="fund-item-header">
                    <div class="fund-item-info">
                      <span class="fund-item-name">{{ record.name }}</span>
                      <span class="fund-item-code">{{ record.code }}</span>
                    </div>
                    <button class="remove-btn" @click="cancelPending(record.id)" title="取消">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div class="pending-meta">
                    <span class="pending-tag">⏳ 等待 {{ record.buyDate }} 净值更新</span>
                  </div>
                  <div class="fund-item-row">
                    <span class="fund-item-label">买入日期</span>
                    <span class="fund-item-value">{{ record.buyDate }}</span>
                  </div>
                  <div class="fund-item-row">
                    <span class="fund-item-label">买入金额</span>
                    <span class="fund-item-value">{{ record.amount.toFixed(2) }} 元</span>
                  </div>
                  <div class="fund-item-row muted" style="font-size:11px;">
                    创建于 {{ formatTime(record.createdAt) }}
                  </div>
                </div>
              </div>
            </el-scrollbar>
          </div>

          <!-- 底部操作区 -->
          <div class="batch-modal-footer" v-if="activeTab !== 'pending'">
            <button class="batch-btn-cancel" @click="$emit('close')">取消</button>
            <button
              class="batch-btn-confirm"
              :disabled="!canConfirm || confirming"
              @click="handleConfirm"
            >
              <span v-if="confirming">处理中...</span>
              <span v-else>确认操作</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { searchFund } from '@/api/fundEastmoney'
import { fetchNetValueHistory } from '@/api/fundDetail'
import { useFundStore } from '@/stores'
import {
  loadPendingBuys,
  addPendingBuy,
  cancelPendingBuy,
  executeImmediateBuys,
  executeSells,
  type BuyRecord
} from '@/services/pendingBuyService'
import { fundService } from '@/services'

// ---- props / emits ----
const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirmed'): void
}>()

// ---- types ----
interface BuyItem {
  code: string
  name: string
  navList: { date: string; netValue: number; changePercent: number }[]
  navLoading: boolean
  navError: boolean
  selectedDate: string
  selectedNav: number | null
  amount: number
}

interface SellItem {
  code: string
  name: string
  maxShares: number
  sellShares: number
}

// ---- state ----
const activeTab = ref<'buy' | 'sell' | 'pending'>('buy')
const confirming = ref(false)

// buy
const buySearchQuery = ref('')
const buySearchResults = ref<{ code: string; name: string }[]>([])
const buySearchLoading = ref(false)
const buyItems = ref<BuyItem[]>([])

// sell
const sellSearchQuery = ref('')
const sellSearchResults = ref<{ code: string; name: string; shares: number }[]>([])
const sellItems = ref<SellItem[]>([])

// pending
const pendingList = ref<BuyRecord[]>([])
const pendingCount = computed(() => pendingList.value.length)

// ---- computed ----
const fundStore = useFundStore()

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const canConfirm = computed(() => {
  if (activeTab.value === 'buy') {
    return buyItems.value.some(item => item.amount > 0 && item.selectedDate)
  }
  if (activeTab.value === 'sell') {
    return sellItems.value.some(item => item.sellShares > 0 && item.sellShares <= item.maxShares)
  }
  return false
})

// ---- watchers ----
watch(() => props.visible, (val) => {
  if (val) {
    refreshPendingList()
    // 清空上次的搜索状态
    buySearchQuery.value = ''
    buySearchResults.value = []
    sellSearchQuery.value = ''
    sellSearchResults.value = []
  }
})

// ---- pending ----
function refreshPendingList() {
  pendingList.value = loadPendingBuys().filter(r => r.status === 'pending')
}

async function cancelPending(id: string) {
  try {
    await ElMessageBox.confirm('确认取消该笔待加仓记录？', '取消确认', { type: 'warning' })
    cancelPendingBuy(id)
    refreshPendingList()
    ElMessage.success('已取消')
  } catch { /* user cancel */ }
}

// ---- buy ----
const debouncedBuySearch = useDebounceFn(async (q: string) => {
  if (!q.trim()) { buySearchResults.value = []; return }
  buySearchLoading.value = true
  try {
    buySearchResults.value = await searchFund(q.trim())
  } finally {
    buySearchLoading.value = false
  }
}, 300)

function onBuySearch() {
  debouncedBuySearch(buySearchQuery.value)
}

function addBuyItem(fund: { code: string; name: string }) {
  if (buyItems.value.find(i => i.code === fund.code)) {
    ElMessage.warning('该基金已添加')
    buySearchResults.value = []
    buySearchQuery.value = ''
    return
  }
  const item: BuyItem = {
    code: fund.code,
    name: fund.name,
    navList: [],
    navLoading: true,
    navError: false,
    selectedDate: '',
    selectedNav: null,
    amount: 0
  }
  buyItems.value.push(item)
  buySearchResults.value = []
  buySearchQuery.value = ''
  loadNavForItem(fund.code)
}

async function loadNavForItem(code: string) {
  const idx = buyItems.value.findIndex(i => i.code === code)
  if (idx === -1) return

  // 用对象替换强制触发响应式更新
  buyItems.value[idx] = { ...buyItems.value[idx]!, navLoading: true, navError: false }

  try {
    const records = await fetchNetValueHistory(code, '1m')
    const navList = records.slice(-15).reverse()
    const idx2 = buyItems.value.findIndex(i => i.code === code)
    if (idx2 !== -1) {
      buyItems.value[idx2] = { ...buyItems.value[idx2]!, navList, navLoading: false }
    }
  } catch {
    const idx3 = buyItems.value.findIndex(i => i.code === code)
    if (idx3 !== -1) {
      buyItems.value[idx3] = { ...buyItems.value[idx3]!, navLoading: false, navError: true }
    }
  }
}

function removeBuyItem(code: string) {
  buyItems.value = buyItems.value.filter(i => i.code !== code)
}

function onBuyDateChange(item: BuyItem, val: string) {
  const idx = buyItems.value.findIndex(i => i.code === item.code)
  if (idx === -1) return
  const selectedNav = val === 'today' ? null : (item.navList.find(n => n.date === val)?.netValue ?? null)
  buyItems.value[idx] = { ...buyItems.value[idx]!, selectedDate: val, selectedNav }
}

function calcOldShares(item: BuyItem): number {
  return Number(fundStore.getFund(item.code)?.num) ?? 0
}

function calcOldCost(item: BuyItem): number {
  return Number(fundStore.getFund(item.code)?.cost) ?? 0
}

function calcNewShares(item: BuyItem): number {
  const oldNum = calcOldShares(item)
  if (!item.selectedNav || item.amount <= 0) return oldNum
  return oldNum + item.amount / item.selectedNav
}

function calcNewCost(item: BuyItem): number {
  const oldNum = calcOldShares(item)
  const oldCost = calcOldCost(item)
  if (!item.selectedNav || item.amount <= 0) return oldCost
  const addNum = item.amount / item.selectedNav
  const newNum = oldNum + addNum
  if (newNum <= 0) return item.selectedNav
  return (oldCost * oldNum + item.selectedNav * addNum) / newNum
}

function calcOldAmount(item: BuyItem): number {
  return calcOldShares(item) * calcOldCost(item)
}

function calcNewAmount(item: BuyItem): number {
  return calcNewShares(item) * calcNewCost(item)
}

function calcSellCost(item: SellItem): number {
  return fundStore.getFund(item.code)?.cost ?? 0
}

function calcSellOldAmount(item: SellItem): number {
  return item.maxShares * calcSellCost(item)
}

function calcSellNewAmount(item: SellItem): number {
  return (item.maxShares - item.sellShares) * calcSellCost(item)
}

// ---- sell ----
function onSellSearch() {
  const q = sellSearchQuery.value.trim().toLowerCase()
  if (!q) { sellSearchResults.value = []; return }
  const allFunds = fundStore.funds
  const results: { code: string; name: string; shares: number }[] = []
  for (const fund of allFunds) {
    const detail = fundStore.fundDetails.get(fund.code)
    const name = detail?.name ?? fund.code
    if (fund.code.includes(q) || name.toLowerCase().includes(q)) {
      results.push({ code: fund.code, name, shares: fund.num })
    }
  }
  sellSearchResults.value = results.slice(0, 10)
}

function addSellItem(fund: { code: string; name: string; shares: number }) {
  if (sellItems.value.find(i => i.code === fund.code)) {
    ElMessage.warning('该基金已添加')
    sellSearchResults.value = []
    sellSearchQuery.value = ''
    return
  }
  sellItems.value.push({ code: fund.code, name: fund.name, maxShares: fund.shares, sellShares: 0 })
  sellSearchResults.value = []
  sellSearchQuery.value = ''
}

function removeSellItem(code: string) {
  sellItems.value = sellItems.value.filter(i => i.code !== code)
}

// ---- confirm ----
async function handleConfirm() {
  confirming.value = true
  try {
    if (activeTab.value === 'buy') {
      await handleBuyConfirm()
    } else if (activeTab.value === 'sell') {
      await handleSellConfirm()
    }
  } finally {
    confirming.value = false
  }
}

async function handleBuyConfirm() {
  const validItems = buyItems.value.filter(i => i.amount > 0 && i.selectedDate)
  if (validItems.length === 0) { ElMessage.warning('请填写有效的加仓信息'); return }

  // 分离即时项和 pending 项
  const immediateItems = validItems
    .filter(i => i.selectedDate !== 'today' && i.selectedNav)
    .map(i => ({ code: i.code, name: i.name, buyDate: i.selectedDate, amount: i.amount, nav: i.selectedNav! }))

  const pendingItems = validItems.filter(i => i.selectedDate === 'today')

  if (immediateItems.length > 0) {
    await executeImmediateBuys(immediateItems)
  }

  let pendingAdded = 0
  for (const item of pendingItems) {
    addPendingBuy({
      code: item.code,
      name: item.name,
      buyDate: todayStr.value,
      amount: item.amount,
      navOnBuyDate: null,
      status: 'pending'
    })
    pendingAdded++
  }

  await fundService.refreshAllFunds()

  const msgs: string[] = []
  if (immediateItems.length > 0) msgs.push(`${immediateItems.length} 笔加仓已完成`)
  if (pendingAdded > 0) msgs.push(`${pendingAdded} 笔已记录，等待净值更新后确认`)
  ElMessage.success(msgs.join('，'))

  buyItems.value = []
  refreshPendingList()
  emit('confirmed')
  emit('close')
}

async function handleSellConfirm() {
  const validItems = sellItems.value.filter(i => i.sellShares > 0 && i.sellShares <= i.maxShares)
  if (validItems.length === 0) { ElMessage.warning('请填写有效的减仓信息'); return }

  await executeSells(validItems.map(i => ({ code: i.code, name: i.name, sellShares: i.sellShares })))
  await fundService.refreshAllFunds()

  ElMessage.success(`${validItems.length} 笔减仓已完成`)
  sellItems.value = []
  emit('confirmed')
  emit('close')
}

// ---- utils ----
function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.batch-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.batch-modal-panel {
  background: var(--el-bg-color);
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* PC 端居中显示 */
@media (min-width: 600px) {
  .batch-modal-overlay {
    align-items: center;
  }
  .batch-modal-panel {
    border-radius: 12px;
    max-height: 80vh;
  }
}

/* ---- header ---- */
.batch-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 0;
  flex-shrink: 0;
}

.batch-modal-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.batch-modal-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pending-badge {
  font-size: 11px;
  background: var(--el-color-warning-light-7);
  color: var(--el-color-warning);
  border-radius: 10px;
  padding: 2px 8px;
  cursor: pointer;
  font-weight: 500;
}

.batch-close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-secondary);
  padding: 4px;
  display: flex;
  align-items: center;
  border-radius: 4px;
}
.batch-close-btn:hover { background: var(--el-fill-color-light); }

/* ---- tabs ---- */
.batch-tabs {
  display: flex;
  padding: 12px 16px 0;
  gap: 4px;
  flex-shrink: 0;
}

.batch-tab {
  flex: 1;
  padding: 7px 0;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  font-size: 13px;
  cursor: pointer;
  position: relative;
  transition: all 0.15s;
  width: 100%;
}
.batch-tab:hover { background: var(--el-fill-color-light); }
.batch-tab.active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 500;
}

/* el-badge wrapper 需要 flex:1 才能和其他 tab 等宽 */
.batch-tab-badge-wrap {
  flex: 1;
  display: flex;
}
:deep(.batch-tab-badge-wrap .el-badge) {
  flex: 1;
  display: flex;
}

.tab-badge {
  position: absolute;
  top: -6px;
  right: -8px;
  background: var(--el-color-danger);
  color: #fff;
  border-radius: 8px;
  font-size: 10px;
  padding: 0 5px;
  min-width: 16px;
  line-height: 16px;
}
/* ---- panel ---- */
.batch-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 300px;
}

.panel-empty {
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  padding: 32px 0;
}

/* ---- search ---- */
.search-section {
  position: relative;
  flex-shrink: 0;
}

.search-input-wrap {
  position: relative;
}

.batch-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  font-size: 13px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-primary);
  outline: none;
  transition: border-color 0.15s;
}
.batch-search-input:focus { border-color: var(--el-color-primary); }

.search-spin {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--el-text-color-placeholder);
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }

.search-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
}

.search-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 13px;
  transition: background 0.1s;
}
.search-dropdown-item:hover { background: var(--el-fill-color-light); }
.item-code { color: var(--el-text-color-secondary); font-size: 12px; min-width: 54px; }
.item-name { flex: 1; color: var(--el-text-color-primary); }
.item-shares { color: var(--el-text-color-secondary); font-size: 12px; }

/* ---- fund item card ---- */
.fund-items-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fund-item-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 10px;
  padding: 12px;
  background: var(--el-fill-color-blank);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pending-card {
  border-color: var(--el-color-warning-light-5);
  background: var(--el-color-warning-light-9);
}

.fund-item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.fund-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fund-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.fund-item-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--el-text-color-placeholder);
  padding: 2px;
  display: flex;
  align-items: center;
  border-radius: 4px;
  flex-shrink: 0;
}
.remove-btn:hover { color: var(--el-color-danger); background: var(--el-color-danger-light-9); }

/* ---- fund item row ---- */
.fund-item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fund-item-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  min-width: 58px;
  flex-shrink: 0;
}

.fund-item-value {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.pending-nav {
  color: var(--el-color-warning);
  font-style: italic;
}

/* ---- nav date select ---- */
.nav-date-select-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-loading-tip, .nav-error-tip {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
}
.nav-error-tip { color: var(--el-color-danger); }
.retry-btn {
  background: none;
  border: none;
  color: var(--el-color-primary);
  cursor: pointer;
  font-size: 11px;
  padding: 0 2px;
}

/* ---- amount input ---- */
.amount-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  background: var(--el-fill-color-blank);
}
.amount-input-wrap:focus-within { border-color: var(--el-color-primary); }

.amount-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  padding: 6px 8px;
  font-size: 13px;
  color: var(--el-text-color-primary);
  min-width: 0;
}
/* 隐藏 number input spinner */
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }
.amount-input[type=number] { -moz-appearance: textfield; appearance: textfield; }

.amount-unit {
  padding: 0 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-left: 1px solid var(--el-border-color-light);
  background: var(--el-fill-color-light);
  line-height: 30px;
  flex-shrink: 0;
}

/* ---- calc preview ---- */
.calc-preview {
  background: var(--el-fill-color-light);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pending-preview {
  background: var(--el-color-warning-light-9);
  border: 1px dashed var(--el-color-warning-light-5);
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--el-text-color-regular);
}
.preview-row.muted { color: var(--el-text-color-placeholder); }

.preview-label {
  color: var(--el-text-color-secondary);
  min-width: 58px;
}

.positive { color: var(--el-color-danger); }
.negative { color: var(--el-color-success); }

/* ---- pending meta ---- */
.pending-meta { display: flex; align-items: center; gap: 6px; }
.pending-tag {
  font-size: 12px;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-8);
  border-radius: 4px;
  padding: 2px 7px;
}

/* ---- footer ---- */
.batch-modal-footer {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.batch-btn-cancel {
  flex: 1;
  padding: 9px 0;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}
.batch-btn-cancel:hover { background: var(--el-fill-color-light); }

.batch-btn-confirm {
  flex: 2;
  padding: 9px 0;
  border: none;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.batch-btn-confirm:hover:not(:disabled) { background: var(--el-color-primary-dark-2); }
.batch-btn-confirm:disabled {
  background: var(--el-color-primary-light-5);
  cursor: not-allowed;
}

/* ---- muted ---- */
.muted { color: var(--el-text-color-placeholder); }

/* ---- transitions ---- */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-active .batch-modal-panel,
.modal-fade-leave-active .batch-modal-panel {
  transition: transform 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .batch-modal-panel {
  transform: translateY(40px);
}
</style>
