<template>
  <Teleport to="body">
    <Transition name="tooltip-slide">
      <div v-if="visible" class="group-tooltip-overlay" @click.self="$emit('close')">
        <Transition name="tooltip-slide">
          <div v-if="visible" class="group-tooltip-panel">
            <header class="group-tooltip-head">
              <div class="group-tooltip-title">{{ stats.groupName }}</div>
              <div class="head-actions">
                <el-button link type="info" @click="handleCopy">复制</el-button>
                <el-button link type="primary" @click="$emit('close')">关闭</el-button>
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
import { formatCurrency, formatPrivacy } from '@/utils/format'
import { useSettingStore } from '@/stores'
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

const settingStore = useSettingStore()

function safeNum(v: unknown): number {
  const n = Number(v)
  return isFinite(n) ? n : 0
}

function fmtMoney(v: unknown) {
  return formatPrivacy(formatCurrency(safeNum(v)), settingStore.privacyMode)
}

function fmtPct(v: unknown) {
  const n = safeNum(v)
  const s = `${n > 0 ? '+' : ''}${n.toFixed(2)}%`
  return formatPrivacy(s, settingStore.privacyMode)
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
  // 复制始终使用真实数据，不受隐私模式影响
  const SEP = '━━━━━━━━━━━━━━━━'
  const rawMoney = (v: unknown) => formatCurrency(safeNum(v))
  const rawPct = (v: unknown) => { const n = safeNum(v); return `${n > 0 ? '+' : ''}${n.toFixed(2)}%` }

  const lines = [
    `分组名称：${s.groupName}`,
    `基金数量：${s.fundCount} 只`,
    SEP,
    `估算收益 (${s.estimatedDate})：${rawMoney(s.estimatedGain)}`,
    `估算涨幅 (${s.estimatedDate})：${rawPct(s.estimatedChangePercent)}`,
    `估算上涨/下跌 (${s.estimatedDate})：${s.estimatedUpCount} / ${s.estimatedDownCount}`,
    SEP,
    `当日收益 (${s.dailyDate})：${rawMoney(s.dailyGain)}`,
    `当日涨幅 (${s.dailyDate})：${rawPct(s.dailyChangePercent)}`,
    `当日上涨/下跌 (${s.dailyDate})：${s.dailyUpCount} / ${s.dailyDownCount}`,
    SEP,
    `持有收益 (${s.holdingDate})：${rawMoney(s.holdingGain)}`,
    `持有收益率 (${s.holdingDate})：${rawPct(s.holdingGainRate)}`,
    `持有盈利/亏损 (${s.holdingDate})：${s.holdingProfitCount} / ${s.holdingLossCount}`,
    SEP,
    `总资产：${rawMoney(s.totalAsset)}`,
    `总成本：${rawMoney(s.totalCost)}`
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
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  backdrop-filter: blur(4px);
}

.group-tooltip-panel {
  width: 100%;
  max-width: 400px;
  max-height: 85vh;
  overflow: auto;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.group-tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.head-actions .el-button {
  margin: 0;
}

.group-tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-group {
  padding: 8px 0;
  border-top: 1px solid var(--el-border-color-lighter);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
}

.info-label {
  color: var(--el-text-color-secondary);
  font-size: 12px;
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
