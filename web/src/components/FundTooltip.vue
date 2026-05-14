<template>
  <Teleport to="body">
    <div v-if="visible" class="fund-tooltip-overlay" @click.self="$emit('close')">
      <div class="fund-tooltip-panel">
        <header class="fund-tooltip-head">
          <div>
            <div class="fund-tooltip-title">{{ row?.name }}</div>
            <div class="fund-tooltip-code">{{ row?.code }}</div>
          </div>
          <div class="head-actions">
            <el-button text size="small" @click="handleCopy">复制</el-button>
            <el-button text type="primary" @click="$emit('close')">关闭</el-button>
          </div>
        </header>

        <section class="fund-tooltip-body" v-if="row">
          <!-- 估算数据 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">估算涨幅 ({{ row.estimatedDateLabel }})</span>
              <span :class="estClass(row.gszzl)">{{ fmtPct(row.gszzl, row.shouldShowEstimated) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">估算收益 ({{ row.estimatedDateLabel }})</span>
              <span :class="estClass(row.estimatedGain)">{{ fmtEst(row.estimatedGain, row.shouldShowEstimated) }}</span>
            </div>
          </div>

          <!-- 当日数据 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">当日涨幅 ({{ row.navDateLabel }})</span>
              <span :class="pctClass(row.navChgRt)">{{ fmtPct(row.navChgRt, true) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">当日收益 ({{ row.navDateLabel }})</span>
              <span :class="moneyClass(row.dailyGain)">{{ fmtMoney(row.dailyGain) }}</span>
            </div>
          </div>

          <!-- 持有收益 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">持有收益</span>
              <span :class="moneyClass(row.holdingGain)">{{ fmtMoney(row.holdingGain) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">总收益率</span>
              <span :class="pctClass(row.holdingGainRate)">{{ fmtPct(row.holdingGainRate, true) }}</span>
            </div>
          </div>

          <!-- 持仓信息 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">持有金额</span>
              <span>{{ fmtMoney(row.holdingAmount) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">持有份额</span>
              <span>{{ fmtShares(row.fund.num) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">成本价</span>
              <span>{{ fmt4(row.fund.cost) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">估算净值</span>
              <span>{{ fmt4(row.displayGsz) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">单位净值</span>
              <span>{{ fmt4(row.dwjz) }}</span>
            </div>
          </div>

          <!-- 其他信息 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">关联板块</span>
              <span>{{ row.relateTheme || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">更新时间</span>
              <span>{{ row.fullUpdateTime || row.updateTime || '—' }}</span>
            </div>
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
import { ElMessage } from 'element-plus'

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

function fmtEst(v: number, show: boolean) {
  if (!show) return '—'
  return fmtMoney(v)
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

function estClass(v: number) {
  if (!props.row?.shouldShowEstimated) return 'flat'
  return pctClass(v)
}

function handleCopy() {
  const r = props.row
  if (!r) return
  const lines = [
    `${r.name} (${r.code})`,
    `估算涨幅: ${fmtPct(r.gszzl, r.shouldShowEstimated)}`,
    `估算收益: ${fmtEst(r.estimatedGain, r.shouldShowEstimated)}`,
    `当日涨幅: ${fmtPct(r.navChgRt, true)}`,
    `当日收益: ${fmtMoney(r.dailyGain)}`,
    `持有收益: ${fmtMoney(r.holdingGain)}`,
    `总收益率: ${fmtPct(r.holdingGainRate, true)}`,
    `持有金额: ${fmtMoney(r.holdingAmount)}`,
    `持有份额: ${fmtShares(r.fund.num)}`,
    `成本价: ${fmt4(r.fund.cost)}`,
    `单位净值: ${fmt4(r.dwjz)}`,
    `更新时间: ${r.fullUpdateTime || r.updateTime || '—'}`
  ]
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    ElMessage.success('已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}
</script>

<style scoped>
.fund-tooltip-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
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

.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
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

.fund-tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.info-group {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.info-group:last-child {
  border-bottom: none;
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

.fund-tooltip-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
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

  .fund-tooltip-panel {
    border-radius: 8px;
  }
}
</style>
