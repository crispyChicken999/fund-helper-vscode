<template>
  <Teleport to="body">
    <div v-if="visible" class="group-tooltip-overlay" @click.self="$emit('close')">
      <div class="group-tooltip-panel">
        <header class="group-tooltip-head">
          <div class="group-tooltip-title">{{ stats.groupName }}</div>
          <div class="head-actions">
            <el-button text size="small" @click="handleCopy">复制</el-button>
            <el-button text type="primary" size="small" @click="$emit('close')">关闭</el-button>
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
    </div>
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

function fmtMoney(v: number) {
  return formatPrivacy(formatCurrency(v), settingStore.privacyMode)
}

function fmtPct(v: number) {
  const s = `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
  return formatPrivacy(s, settingStore.privacyMode)
}

function pctClass(v: number) {
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return ''
}

function moneyClass(v: number) {
  return pctClass(v)
}

function handleCopy() {
  const s = props.stats
  const lines = [
    `【${s.groupName}】`,
    `基金数量: ${s.fundCount} 只`,
    `估算收益: ${fmtMoney(s.estimatedGain)} (${fmtPct(s.estimatedChangePercent)})`,
    `估算上涨/下跌: ${s.estimatedUpCount} / ${s.estimatedDownCount}`,
    `当日收益: ${fmtMoney(s.dailyGain)} (${fmtPct(s.dailyChangePercent)})`,
    `当日上涨/下跌: ${s.dailyUpCount} / ${s.dailyDownCount}`,
    `持有收益: ${fmtMoney(s.holdingGain)} (${fmtPct(s.holdingGainRate)})`,
    `持有盈利/亏损: ${s.holdingProfitCount} / ${s.holdingLossCount}`,
    `总资产: ${fmtMoney(s.totalAsset)}`,
    `总成本: ${fmtMoney(s.totalCost)}`
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
}

.group-tooltip-panel {
  width: 100%;
  max-width: 400px;
  max-height: 85vh;
  overflow: auto;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
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

.group-tooltip-title {
  font-size: 16px;
  font-weight: 600;
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
</style>
