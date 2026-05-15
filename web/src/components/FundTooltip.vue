<template>
  <Teleport to="body">
    <Transition name="tooltip-slide">
      <div
        v-if="visible"
        class="fund-tooltip-overlay"
        @click.self="$emit('close')"
      >
        <Transition name="tooltip-slide">
          <div v-if="visible" class="fund-tooltip-panel">
            <header class="fund-tooltip-head">
              <div>
                <div class="fund-tooltip-title">{{ row?.name }}</div>
                <div class="fund-tooltip-code">{{ row?.code }}</div>
              </div>
              <div class="head-actions">
                <button class="action-btn" @click="handleCopy" title="复制">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button class="action-btn" @click="$emit('close')" title="关闭">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
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
                  <span>{{ row.relateTheme || "—" }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">更新时间</span>
                  <span>{{ row.fullUpdateTime || row.updateTime || "—" }}</span>
                </div>
              </div>
            </section>

            <footer class="fund-tooltip-actions">
              <el-button type="primary" plain size="small" @click="$emit('detail')">查看详情</el-button>
              <el-button size="small" @click="$emit('addShares')">加仓</el-button>
              <el-button size="small" @click="$emit('reduceShares')">减仓</el-button>
              <el-button size="small" @click="$emit('edit')">编辑持仓</el-button>
              <el-button size="small" @click="$emit('setGroup')">设置分组</el-button>
              <el-button type="danger" size="small" plain @click="$emit('delete')">删除</el-button>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { FundRowDisplay } from "@/utils/fundDisplay";
import { formatCurrency, formatNumber } from "@/utils/format";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  row: FundRowDisplay | null;
  privacyMode: boolean;
}>();

defineEmits<{
  close: [];
  detail: [];
  addShares: [];
  reduceShares: [];
  edit: [];
  setGroup: [];
  delete: [];
}>();

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

// 不受隐私模式影响，始终显示真实数据
function fmtMoney(v: unknown) {
  return formatCurrency(safeNum(v));
}

function fmtEst(v: unknown, show: boolean) {
  if (!show) return "—";
  return fmtMoney(v);
}

function fmt4(v: unknown) {
  return safeNum(v).toFixed(4);
}

function fmtShares(v: unknown) {
  return formatNumber(safeNum(v), 2);
}

function fmtPct(v: unknown, show: boolean) {
  if (!show) return "—";
  const n = safeNum(v);
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function pctClass(v: unknown) {
  const n = safeNum(v);
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "flat";
}

function moneyClass(v: unknown) {
  return pctClass(v);
}

function estClass(v: unknown) {
  if (!props.row?.shouldShowEstimated) return "flat";
  return pctClass(v);
}

function handleCopy() {
  const r = props.row;
  if (!r) return;

  const SEP = "━━━━━━━━━━━━━━━━";
  const rawPct = (v: unknown, show: boolean) => {
    if (!show) return "—";
    const n = safeNum(v);
    return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
  };

  const lines = [
    `${r.name}`,
    `基金代码：${r.code}`,
    SEP,
    `估算涨幅 (${r.estimatedDateLabel})：${rawPct(r.gszzl, r.shouldShowEstimated)}`,
    `估算收益 (${r.estimatedDateLabel})：${r.shouldShowEstimated ? fmtMoney(r.estimatedGain) : "—"}`,
    SEP,
    `当日涨幅 (${r.navDateLabel})：${rawPct(r.navChgRt, true)}`,
    `当日收益 (${r.navDateLabel})：${fmtMoney(r.dailyGain)}`,
    SEP,
    `持有收益：${fmtMoney(r.holdingGain)}`,
    `总收益率：${rawPct(r.holdingGainRate, true)}`,
    SEP,
    `持有金额：${fmtMoney(r.holdingAmount)}`,
    `持有份额：${fmtShares(r.fund.num)}`,
    `成本价：${fmt4(r.fund.cost)}`,
    `估算净值：${fmt4(r.displayGsz)}`,
    `单位净值：${fmt4(r.dwjz)}`,
    SEP,
    `关联板块：${r.relateTheme || "—"}`,
    `更新时间：${r.fullUpdateTime || r.updateTime || "—"}`,
  ];
  navigator.clipboard
    .writeText(lines.join("\n"))
    .then(() => {
      ElMessage.success("已复制");
    })
    .catch(() => {
      ElMessage.error("复制失败");
    });
}
</script>

<style scoped>
.fund-tooltip-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  align-items: center;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  backdrop-filter: blur(6px);
}

.fund-tooltip-panel {
  width: 100%;
  max-width: 420px;
  max-height: 85vh;
  overflow: auto;
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid var(--el-border-color-light);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.fund-tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-light);
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

.fund-tooltip-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.fund-tooltip-code {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.fund-tooltip-body {
  display: flex;
  flex-direction: column;
}

.info-group {
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-light);
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

.fund-tooltip-actions {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  padding-top: 14px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.fund-tooltip-actions .el-button {
  margin: 0;
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

/* 面板从下滑入 */
.tooltip-slide-enter-active {
  transition:
    transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1),
    opacity 0.22s ease;
}
.tooltip-slide-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.18s ease;
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
