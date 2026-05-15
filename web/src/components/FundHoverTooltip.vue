<template>
  <Teleport to="body">
    <Transition name="hover-tooltip-fade">
      <div
        v-if="visible && row"
        ref="tooltipRef"
        class="fund-hover-tooltip"
        :style="positionStyle"
        @mouseenter="$emit('mouseenter')"
        @mouseleave="$emit('mouseleave')"
      >
        <header class="tooltip-head">
          <div>
            <div class="tooltip-title">{{ row.name }}</div>
            <div class="tooltip-code">{{ row.code }}</div>
          </div>
          <div class="head-actions">
            <button class="action-btn" @click="handleCopy" title="复制">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path
                  d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                />
              </svg>
            </button>
            <button class="action-btn" @click="$emit('close')" title="关闭">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </header>

        <section class="tooltip-body">
          <!-- 估算数据 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label"
                >估算涨幅 ({{ row.estimatedDateLabel }})</span
              >
              <span :class="estClass(row.gszzl)">{{
                fmtPct(row.gszzl, row.shouldShowEstimated)
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label"
                >估算收益 ({{ row.estimatedDateLabel }})</span
              >
              <span :class="estClass(row.estimatedGain)">{{
                fmtEst(row.estimatedGain, row.shouldShowEstimated)
              }}</span>
            </div>
          </div>

          <!-- 当日数据 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">当日涨幅 ({{ row.navDateLabel }})</span>
              <span :class="pctClass(row.navChgRt)">{{
                fmtPct(row.navChgRt, true)
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">当日收益 ({{ row.navDateLabel }})</span>
              <span :class="moneyClass(row.dailyGain)">{{
                fmtMoney(row.dailyGain)
              }}</span>
            </div>
          </div>

          <!-- 持有收益 -->
          <div class="info-group">
            <div class="info-row">
              <span class="info-label">持有收益</span>
              <span :class="moneyClass(row.holdingGain)">{{
                fmtMoney(row.holdingGain)
              }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">总收益率</span>
              <span :class="pctClass(row.holdingGainRate)">{{
                fmtPct(row.holdingGainRate, true)
              }}</span>
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
          <div class="info-group info-group-last">
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

        <!-- 操作栏 -->
        <footer class="tooltip-footer">
          <el-button
            plain
            size="small"
            type="primary"
            class="action-btn-sm"
            @click="$emit('detail')"
            title="查看详情"
            >详情</el-button
          >
          <el-button
            plain
            size="small"
            class="action-btn-sm"
            @click="$emit('addShares')"
            title="加仓"
            >加仓</el-button
          >
          <el-button
            plain
            size="small"
            class="action-btn-sm"
            @click="$emit('reduceShares')"
            title="减仓"
            >减仓</el-button
          >
          <el-button
            plain
            size="small"
            class="action-btn-sm"
            @click="$emit('edit')"
            title="编辑持仓"
            >编辑</el-button
          >
          <el-button
            plain
            size="small"
            class="action-btn-sm"
            @click="$emit('setGroup')"
            title="设置分组"
            >分组</el-button
          >
          <el-button
            plain
            size="small"
            type="danger"
            class="action-btn-sm"
            @click="$emit('delete')"
            title="删除"
            >删除</el-button
          >
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { FundRowDisplay } from "@/utils/fundDisplay";
import { formatCurrency, formatNumber } from "@/utils/format";
import { ElMessage } from "element-plus";

const props = defineProps<{
  visible: boolean;
  row: FundRowDisplay | null;
  privacyMode: boolean;
  x: number;
  y: number;
}>();

defineEmits<{
  mouseenter: [];
  mouseleave: [];
  close: [];
  detail: [];
  addShares: [];
  reduceShares: [];
  edit: [];
  setGroup: [];
  delete: [];
}>();

const tooltipRef = ref<HTMLElement | null>(null);
const adjustedPos = ref({ left: 0, top: 0 });

// 在 tooltip 显示后测量实际高度，重新计算位置
watch(
  () => props.visible,
  async (val) => {
    if (val) {
      // 先用初始位置渲染
      adjustedPos.value = { left: props.x, top: props.y };
      await nextTick();
      await nextTick(); // 双 nextTick 确保 DOM 渲染完成
      recalcPosition();
    }
  },
);

watch(
  () => [props.x, props.y],
  () => {
    if (props.visible) {
      adjustedPos.value = { left: props.x, top: props.y };
      nextTick(() => recalcPosition());
    }
  },
);

function recalcPosition() {
  const el = tooltipRef.value;
  if (!el) return;

  const rect = el.getBoundingClientRect();
  const margin = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // 默认显示在基金名称右上角
  let left = props.x + margin;
  let top = props.y; // 对齐名称顶部

  // 水平优先级：右 → 左 → 居中
  if (left + rect.width > vw - margin) {
    // 右侧不够，尝试放左侧
    left = props.x - rect.width - margin;

    if (left < margin) {
      // 左侧也不够，进行特殊处理
      // 计算水平居中位置
      left = Math.max(margin, (vw - rect.width) / 2);

      // 如果 tooltip 太宽，限制最大宽度
      if (rect.width > vw - margin * 2) {
        el.style.maxWidth = vw - margin * 2 + "px";
        el.style.width = vw - margin * 2 + "px";
        left = margin;

        // 重新获取调整后的高度
        const newRect = el.getBoundingClientRect();

        // 调整垂直位置，显示在鼠标下方
        top = props.y + margin;

        // 如果下方空间不够，显示在上方
        if (top + newRect.height > vh - margin) {
          top = props.y - newRect.height - margin;

          // 如果上方也不够，则从顶部开始显示
          if (top < margin) {
            top = margin;
          }
        }
      }
    }
  }

  // 垂直边界保险约束
  if (top < margin) {
    top = margin;
  } else if (top + rect.height > vh - margin) {
    top = Math.max(margin, vh - rect.height - margin);
  }

  adjustedPos.value = { left, top };
}

const positionStyle = computed(() => ({
  left: `${adjustedPos.value.left}px`,
  top: `${adjustedPos.value.top}px`,
}));

// 不受隐私模式影响，始终显示真实数据
function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

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
.fund-hover-tooltip {
  position: fixed;
  z-index: 9999;
  width: 200px;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow:
    0 6px 24px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  user-select: text;
}

.tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 5px;
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

.tooltip-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
}

.tooltip-code {
  font-size: 11px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
}

.tooltip-body {
  display: flex;
  flex-direction: column;
}

.info-group {
  padding: 7px 0;
  border-bottom: 1px solid var(--el-border-color-light);
}

.info-group-last,
.info-group:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  font-size: 12px;
  line-height: 1.4;
}

.info-label {
  color: var(--el-text-color-secondary);
  font-size: 11px;
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
.flat {
  color: var(--color-flat);
}

.tooltip-footer {
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr 1fr 1fr;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-btn-sm {
  margin: 0;
}

/* 淡入淡出动画 */
.hover-tooltip-fade-enter-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.hover-tooltip-fade-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}
.hover-tooltip-fade-enter-from {
  opacity: 0;
  transform: scale(0.96) translateY(4px);
}
.hover-tooltip-fade-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(2px);
}
</style>
