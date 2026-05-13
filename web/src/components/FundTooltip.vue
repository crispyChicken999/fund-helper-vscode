<template>
  <Teleport to="body">
    <div v-if="visible" class="fund-tooltip-overlay" @click.self="$emit('close')">
      <div class="fund-tooltip-panel">
        <header class="fund-tooltip-head">
          <div>
            <div class="fund-tooltip-title">{{ row?.name }}</div>
            <div class="fund-tooltip-code">{{ row?.code }}</div>
          </div>
          <el-button text type="primary" @click="$emit('close')">关闭</el-button>
        </header>

        <section class="fund-tooltip-grid" v-if="row">
          <div class="grid-row">
            <span>估算净值</span><span>{{ fmt4(row.displayGsz) }}</span>
            <span>估算涨幅</span><span :class="pctClass(row.gszzl)">{{ fmtPct(row.gszzl, row.shouldShowEstimated) }}</span>
            <span>更新时间</span><span>{{ row.updateTime || '—' }}</span>
          </div>
          <div class="grid-row">
            <span>当日涨幅</span><span :class="pctClass(row.navChgRt)">{{ fmtPct(row.navChgRt, true) }}</span>
            <span>当日收益</span><span :class="moneyClass(row.dailyGain)">{{ fmtMoney(row.dailyGain) }}</span>
            <span>净值日期</span><span>{{ row.navDateLabel }}</span>
          </div>
          <div class="grid-row">
            <span>持有收益</span><span :class="moneyClass(row.holdingGain)">{{ fmtMoney(row.holdingGain) }}</span>
            <span>总收益率</span><span :class="pctClass(row.holdingGainRate)">{{ fmtPct(row.holdingGainRate, true) }}</span>
          </div>
          <div class="grid-row">
            <span>金额</span><span>{{ fmtMoney(row.holdingAmount) }}</span>
            <span>份额</span><span>{{ fmtShares(row.fund.num) }}</span>
          </div>
          <div class="grid-row">
            <span>成本/最新</span><span>{{ fmt4(row.fund.cost) }} / {{ fmt4(row.dwjz) }}</span>
          </div>
          <div class="theme-row">
            <span>关联板块</span><span>{{ row.relateTheme }}</span>
          </div>
        </section>

        <footer class="fund-tooltip-actions">
          <el-button type="primary" size="small" @click="$emit('detail')">查看详情</el-button>
          <el-button size="small" @click="$emit('addShares')">加仓</el-button>
          <el-button size="small" @click="$emit('reduceShares')">减仓</el-button>
          <el-button size="small" @click="$emit('edit')">编辑持仓</el-button>
          <el-button size="small" @click="$emit('setGroup')">设置分组</el-button>
          <el-button type="danger" size="small" plain @click="$emit('delete')">删除</el-button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { FundRowDisplay } from '@/utils/fundDisplay'
import { formatCurrency, formatNumber, formatPrivacy } from '@/utils/format'

const props = defineProps<{
  visible: boolean
  row: FundRowDisplay | null
  privacyMode: boolean
}>()

defineEmits<{
  close: []
  detail: []
  addShares: []
  reduceShares: []
  edit: []
  setGroup: []
  delete: []
}>()

function fmtMoney(v: number) {
  return formatPrivacy(formatCurrency(v), props.privacyMode)
}

function fmt4(v: number) {
  return formatPrivacy(v.toFixed(4), props.privacyMode)
}

function fmtShares(v: number) {
  return formatPrivacy(formatNumber(v, 2), props.privacyMode)
}

function fmtPct(v: number, show: boolean) {
  if (!show) return '—'
  const s = `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
  return formatPrivacy(s, props.privacyMode)
}

function pctClass(v: number) {
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return 'flat'
}

function moneyClass(v: number) {
  if (v > 0) return 'positive'
  if (v < 0) return 'negative'
  return 'flat'
}
</script>

<style scoped>
.fund-tooltip-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
}

.fund-tooltip-panel {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  overflow: auto;
  background: var(--el-bg-color);
  border-radius: 12px 12px 0 0;
  padding: 16px;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
}

.fund-tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.fund-tooltip-title {
  font-size: 16px;
  font-weight: 600;
}

.fund-tooltip-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.fund-tooltip-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
}

.grid-row {
  display: grid;
  grid-template-columns: 72px 1fr 72px 1fr 72px 1fr;
  gap: 6px 8px;
  align-items: center;
}

.grid-row span:nth-child(odd) {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.theme-row {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.theme-row span:first-child {
  color: var(--el-text-color-secondary);
  font-size: 12px;
  flex-shrink: 0;
}

.fund-tooltip-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}

.positive {
  color: var(--color-up);
}
.negative {
  color: var(--color-down);
}
.flat {
  color: var(--color-flat);
}

@media (min-width: 520px) {
  .fund-tooltip-overlay {
    align-items: center;
  }
  .fund-tooltip-panel {
    border-radius: 12px;
  }
}
</style>
