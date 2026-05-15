<template>
  <Teleport to="body">
    <Transition name="tooltip-slide">
      <div v-if="visible" class="group-tooltip-overlay" @click.self="$emit('close')">
        <Transition name="tooltip-slide">
          <div v-if="visible" class="group-tooltip-panel">
            <header class="group-tooltip-head">
              <div class="group-tooltip-title">{{ stats.groupName }}</div>
              <div class="head-actions">
                <button class="action-btn" @click="handleCopy" title="复制">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="action-btn" @click="$emit('close')" title="关闭">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </header>

            <section class="group-tooltip-body">
              <div class="info-row">
                <span class="info-label">基金数量</span>
                <span>{{ stats.fundCount }} 只</span>
              </div>

              <!-- 估算数据 -->
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">估算收益 ({{ stats.estimatedDate }})</span>
                  <span :class="moneyClass(stats.estimatedGain)">{{ fmtMoney(stats.estimatedGain) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">估算涨幅 ({{ stats.estimatedDate }})</span>
                  <span :class="pctClass(stats.estimatedChangePercent)">{{ fmtPct(stats.estimatedChangePercent) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">估算上涨/下跌 ({{ stats.estimatedDate }})</span>
                  <span><span class="positive">{{ stats.estimatedUpCount }}</span> / <span class="negative">{{ stats.estimatedDownCount }}</span></span>
                </div>
              </div>

              <!-- 当日数据 -->
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">当日收益 ({{ stats.dailyDate }})</span>
                  <span :class="moneyClass(stats.dailyGain)">{{ fmtMoney(stats.dailyGain) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">当日涨幅 ({{ stats.dailyDate }})</span>
                  <span :class="pctClass(stats.dailyChangePercent)">{{ fmtPct(stats.dailyChangePercent) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">当日上涨/下跌 ({{ stats.dailyDate }})</span>
                  <span><span class="positive">{{ stats.dailyUpCount }}</span> / <span class="negative">{{ stats.dailyDownCount }}</span></span>
                </div>
              </div>

              <!-- 持有数据 -->
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">持有收益 ({{ stats.holdingDate }})</span>
                  <span :class="moneyClass(stats.holdingGain)">{{ fmtMoney(stats.holdingGain) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">持有收益率 ({{ stats.holdingDate }})</span>
                  <span :class="pctClass(stats.holdingGainRate)">{{ fmtPct(stats.holdingGainRate) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">持有盈利/亏损 ({{ stats.holdingDate }})</span>
                  <span><span class="positive">{{ stats.holdingProfitCount }}</span> / <span class="negative">{{ stats.holdingLossCount }}</span></span>
                </div>
              </div>

              <!-- 总计 -->
              <div class="info-group">
                <div class="info-row">
                  <span class="info-label">总资产</span>
                  <span>{{ fmtMoney(stats.totalAsset) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">总成本</span>
                  <span>{{ fmtMoney(stats.totalCost) }}</span>
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { formatCurrency } from '@/utils/format'
import { ElMessage } from 'element-plus'

export interface GroupStats {
  groupName: string
  fundCount: number
  estimatedGain: number
  estimatedChangePercent: number
  estimatedUpCount: number
  estimatedDownCount: number
  estimatedDate: string
  dailyGain: number
  dailyChangePercent: number
  dailyUpCount: number
  dailyDownCount: number
  dailyDate: string
  holdingGain: number
  holdingGainRate: number
  holdingProfitCount: number
  holdingLossCount: number
  holdingDate: string
  totalAsset: number
  totalCost: number
}

const props = defineProps<{
  visible: boolean
  stats: GroupStats
}>()

defineEmits<{
  close: []
}>()

// 不受隐私模式影响，始终显示真实数据
function safeNum(v: unknown): number {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

function fmtMoney(v: unknown) {
  return formatCurrency(safeNum(v))
}

function fmtPct(v: unknown) {
  const n = safeNum(v)
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
}

function pctClass(v: unknown) {
  const n = safeNum(v)
  if (n > 0) return 'positive'
  if (n < 0) return 'negative'
  return ''
}

function moneyClass(v: unknown) {
  return pctClass(v)
}

function handleCopy() {
  const s = props.stats
  const SEP = '━━━━━━━━━━━━━━━━'

  const lines = [
    `分组名称：${s.groupName}`,
    `基金数量：${s.fundCount} 只`,
    SEP,
    `估算收益 (${s.estimatedDate})：${fmtMoney(s.estimatedGain)}`,
    `估算涨幅 (${s.estimatedDate})：${fmtPct(s.estimatedChangePercent)}`,
    `估算上涨/下跌 (${s.estimatedDate})：${s.estimatedUpCount} / ${s.estimatedDownCount}`,
    SEP,
    `当日收益 (${s.dailyDate})：${fmtMoney(s.dailyGain)}`,
    `当日涨幅 (${s.dailyDate})：${fmtPct(s.dailyChangePercent)}`,
    `当日上涨/下跌 (${s.dailyDate})：${s.dailyUpCount} / ${s.dailyDownCount}`,
    SEP,
    `持有收益 (${s.holdingDate})：${fmtMoney(s.holdingGain)}`,
    `持有收益率 (${s.holdingDate})：${fmtPct(s.holdingGainRate)}`,
    `持有盈利/亏损 (${s.holdingDate})：${s.holdingProfitCount} / ${s.holdingLossCount}`,
    SEP,
    `总资产：${fmtMoney(s.totalAsset)}`,
    `总成本：${fmtMoney(s.totalCost)}`
  ]
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>

<style scoped>
.group-tooltip-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  backdrop-filter: blur(6px);
}

.group-tooltip-panel {
  width: 100%;
  max-width: 380px;
  max-height: 85vh;
  overflow: auto;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.group-tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--el-fill-color);
  color: var(--el-text-color-primary);
}

.group-tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-tooltip-body {
  display: flex;
  flex-direction: column;
}

.info-group {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
}

.info-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0;
  font-size: 13px;
  line-height: 1.4;
}

.info-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.info-row > span:last-child {
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.positive {
  color: var(--color-up);
}
.negative {
  color: var(--color-down);
}

/* 面板从下滑入 */
.tooltip-slide-enter-active {
  transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), opacity 0.22s ease;
}
.tooltip-slide-leave-active {
  transition: transform 0.2s ease, opacity 0.18s ease;
}
.tooltip-slide-enter-from {
  transform: translateY(24px);
  opacity: 0;
}
.tooltip-slide-leave-to {
  transform: translateY(16px);
  opacity: 0;
}
</style>
