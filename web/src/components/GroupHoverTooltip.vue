<template>
  <Teleport to="body">
    <Transition name="hover-tooltip-fade">
      <div
        v-if="visible"
        ref="tooltipRef"
        class="group-hover-tooltip"
        :style="positionStyle"
        @mouseenter="$emit('mouseenter')"
        @mouseleave="$emit('mouseleave')"
      >
        <header class="tooltip-head">
          <div class="tooltip-title">{{ stats.groupName }}</div>
          <div class="head-actions">
            <button class="action-btn" @click="handleCopy" title="复制">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button class="action-btn" @click="$emit('close')" title="关闭">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </header>

        <section class="tooltip-body">
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
          <div class="info-group info-group-last">
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
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { GroupStats } from '@/components/GroupTooltip.vue'
import { formatCurrency } from '@/utils/format'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  visible: boolean
  stats: GroupStats
  x: number
  y: number
}>()

defineEmits<{
  mouseenter: []
  mouseleave: []
  close: []
}>()

const tooltipRef = ref<HTMLElement | null>(null)
const adjustedPos = ref({ left: 0, top: 0 })

watch(() => props.visible, async (val) => {
  if (val) {
    adjustedPos.value = { left: props.x, top: props.y }
    await nextTick()
    await nextTick()
    recalcPosition()
  }
})

watch(() => [props.x, props.y], () => {
  if (props.visible) {
    adjustedPos.value = { left: props.x, top: props.y }
    nextTick(() => recalcPosition())
  }
})

function recalcPosition() {
  const el = tooltipRef.value
  if (!el) return

  const rect = el.getBoundingClientRect()
  const margin = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  // GroupHoverTooltip：显示在分组下方，根据分组位置智能选择左下或右下
  // props.x = groupTagRect.left（左侧item）或 groupTagRect.right（右侧item）
  // props.y = groupTagRect.bottom + 8
  
  // 判断分组是否在视口右侧
  const isRightSide = props.x > vw / 2
  let left: number
  let top = props.y // 显示在分组下方

  if (isRightSide) {
    // 右侧item：优先级 右 → 左 → 居中
    left = props.x - rect.width - margin // 优先显示在左侧（相对于item右边）
    
    if (left < margin) {
      // 左侧空间不够，显示在右侧（相对于item右边）
      left = props.x + margin
      
      if (left + rect.width > vw - margin) {
        // 右侧也不够，进行特殊处理
        left = Math.max(margin, (vw - rect.width) / 2)
        
        if (rect.width > vw - margin * 2) {
          el.style.maxWidth = (vw - margin * 2) + 'px'
          el.style.width = (vw - margin * 2) + 'px'
          left = margin
          
          const newRect = el.getBoundingClientRect()
          
          if (top + newRect.height > vh - margin) {
            top = props.y - newRect.height - margin
            if (top < margin) {
              top = margin
            }
          }
        }
      }
    }
  } else {
    // 左侧item：优先级 左 → 右 → 居中
    left = props.x - rect.width - margin // 优先显示在左侧（相对于item左边）
    
    if (left < margin) {
      // 左侧空间不够，尝试显示在右侧
      left = props.x + margin
      
      if (left + rect.width > vw - margin) {
        // 右侧也不够，进行特殊处理
        left = Math.max(margin, (vw - rect.width) / 2)
        
        if (rect.width > vw - margin * 2) {
          el.style.maxWidth = (vw - margin * 2) + 'px'
          el.style.width = (vw - margin * 2) + 'px'
          left = margin
          
          const newRect = el.getBoundingClientRect()
          
          if (top + newRect.height > vh - margin) {
            top = props.y - newRect.height - margin
            if (top < margin) {
              top = margin
            }
          }
        }
      }
    }
  }
  
  // 垂直边界保险约束
  if (top < margin) {
    top = margin
  } else if (top + rect.height > vh - margin) {
    top = Math.max(margin, vh - rect.height - margin)
  }

  adjustedPos.value = { left, top }
}

const positionStyle = computed(() => ({
  left: `${adjustedPos.value.left}px`,
  top: `${adjustedPos.value.top}px`,
}))

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
.group-hover-tooltip {
  position: fixed;
  z-index: 9999;
  width: 200px;
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1);
  pointer-events: auto;
  user-select: text;
}

.tooltip-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
}

.tooltip-body {
  display: flex;
  flex-direction: column;
}

.info-group {
  padding: 7px 0;
  border-bottom: 1px solid var(--el-border-color-extra-light);
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

/* 淡入淡出动画 */
.hover-tooltip-fade-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.hover-tooltip-fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
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
